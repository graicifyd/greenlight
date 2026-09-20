import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.GREENLIGHT_DATA_DIR ?? join(ROOT, 'data')
const PORT = Number(process.env.PORT ?? 3001)
mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(join(DATA_DIR, 'greenlight.sqlite'))
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS couples (
    id TEXT PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    settings TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    couple_id TEXT NOT NULL REFERENCES couples(id),
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS logs (
    couple_id TEXT NOT NULL REFERENCES couples(id),
    date TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (couple_id, date)
  );
`)

interface CoupleRow {
  id: string
  invite_code: string
  settings: string
  version: number
}
interface MemberRow {
  id: string
  couple_id: string
  role: string
  name: string
}
interface LogRow {
  data: string
}

const DEFAULT_SETTINGS = { tempUnit: 'c', caution: 'standard', trackMucus: true, typicalCycleLength: 28 }
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function inviteCode(): string {
  for (;;) {
    const bytes = randomBytes(6)
    const code = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
    const taken = db.prepare('SELECT 1 FROM couples WHERE invite_code = ?').get(code)
    if (!taken) return code
  }
}

function bump(coupleId: string) {
  db.prepare('UPDATE couples SET version = version + 1 WHERE id = ?').run(coupleId)
}

function stateFor(coupleId: string, memberId: string) {
  const couple = db.prepare('SELECT * FROM couples WHERE id = ?').get(coupleId) as CoupleRow | undefined
  if (!couple) return null
  const members = db.prepare('SELECT id, role, name FROM members WHERE couple_id = ? ORDER BY created_at').all(coupleId) as MemberRow[]
  const logs = (db.prepare('SELECT data FROM logs WHERE couple_id = ? ORDER BY date').all(coupleId) as LogRow[]).map((r) => JSON.parse(r.data))
  return {
    coupleId: couple.id,
    inviteCode: couple.invite_code,
    version: couple.version,
    settings: JSON.parse(couple.settings),
    members,
    meId: memberId,
    logs,
  }
}

interface Auth {
  memberId: string
  coupleId: string
}

function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '')
  const row = token ? (db.prepare('SELECT id, couple_id FROM members WHERE token = ?').get(token) as { id: string; couple_id: string } | undefined) : undefined
  if (!row) {
    res.status(401).json({ error: 'Not signed in' })
    return
  }
  ;(req as Request & { auth: Auth }).auth = { memberId: row.id, coupleId: row.couple_id }
  next()
}
const getAuth = (req: Request): Auth => (req as Request & { auth: Auth }).auth

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const api = express.Router()

api.post('/couples', (req, res) => {
  const { name, role, settings } = req.body ?? {}
  const coupleId = randomUUID()
  const memberId = randomUUID()
  const token = randomBytes(24).toString('base64url')
  const now = Date.now()
  db.prepare('INSERT INTO couples (id, invite_code, settings, version, created_at) VALUES (?, ?, ?, 1, ?)').run(
    coupleId,
    inviteCode(),
    JSON.stringify({ ...DEFAULT_SETTINGS, ...(settings ?? {}) }),
    now,
  )
  db.prepare('INSERT INTO members (id, couple_id, role, name, token, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    memberId,
    coupleId,
    role === 'partner' ? 'partner' : 'cycling',
    String(name ?? '').slice(0, 40) || 'Me',
    token,
    now,
  )
  res.json({ token, state: stateFor(coupleId, memberId) })
})

api.post('/couples/join', (req, res) => {
  const code = String(req.body?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const couple = db.prepare('SELECT * FROM couples WHERE invite_code = ?').get(code) as CoupleRow | undefined
  if (!couple) {
    res.status(404).json({ error: 'That invite code was not found' })
    return
  }
  const members = db.prepare('SELECT role FROM members WHERE couple_id = ?').all(couple.id) as { role: string }[]
  if (members.length >= 2) {
    res.status(409).json({ error: 'This couple already has two members' })
    return
  }
  const role = members.some((m) => m.role === 'cycling') ? 'partner' : 'cycling'
  const memberId = randomUUID()
  const token = randomBytes(24).toString('base64url')
  db.prepare('INSERT INTO members (id, couple_id, role, name, token, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    memberId,
    couple.id,
    role,
    String(req.body?.name ?? '').slice(0, 40) || 'Partner',
    token,
    Date.now(),
  )
  bump(couple.id)
  res.json({ token, state: stateFor(couple.id, memberId) })
})

api.use(auth)

api.get('/state', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  const since = Number(req.query.v ?? 0)
  const row = db.prepare('SELECT version FROM couples WHERE id = ?').get(coupleId) as { version: number } | undefined
  if (row && since && row.version === since) {
    res.status(304).end()
    return
  }
  res.json(stateFor(coupleId, memberId))
})

api.put('/logs', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  const log = req.body
  if (!log || !/^\d{4}-\d{2}-\d{2}$/.test(String(log.date))) {
    res.status(400).json({ error: 'A log needs a YYYY-MM-DD date' })
    return
  }
  const updatedAt = Number(log.updatedAt) || Date.now()
  const existing = db.prepare('SELECT updated_at FROM logs WHERE couple_id = ? AND date = ?').get(coupleId, log.date) as { updated_at: number } | undefined
  if (!existing || existing.updated_at <= updatedAt) {
    db.prepare('INSERT OR REPLACE INTO logs (couple_id, date, data, updated_at) VALUES (?, ?, ?, ?)').run(
      coupleId,
      log.date,
      JSON.stringify({ ...log, updatedAt }),
      updatedAt,
    )
    bump(coupleId)
  }
  res.json(stateFor(coupleId, memberId))
})

api.post('/logs/bulk', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  const logs: unknown[] = Array.isArray(req.body?.logs) ? req.body.logs : []
  const replace = !!req.body?.replace
  const insert = db.prepare('INSERT OR REPLACE INTO logs (couple_id, date, data, updated_at) VALUES (?, ?, ?, ?)')
  db.exec('BEGIN')
  try {
    if (replace) db.prepare('DELETE FROM logs WHERE couple_id = ?').run(coupleId)
    for (const l of logs as { date: string; updatedAt?: number }[]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.date))) continue
      const updatedAt = Number(l.updatedAt) || Date.now()
      insert.run(coupleId, l.date, JSON.stringify({ ...l, updatedAt }), updatedAt)
    }
    bump(coupleId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  res.json(stateFor(coupleId, memberId))
})

api.delete('/logs/:date', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  db.prepare('DELETE FROM logs WHERE couple_id = ? AND date = ?').run(coupleId, String(req.params.date))
  bump(coupleId)
  res.json(stateFor(coupleId, memberId))
})

api.put('/settings', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  const current = JSON.parse((db.prepare('SELECT settings FROM couples WHERE id = ?').get(coupleId) as { settings: string }).settings)
  db.prepare('UPDATE couples SET settings = ? WHERE id = ?').run(JSON.stringify({ ...current, ...(req.body ?? {}) }), coupleId)
  bump(coupleId)
  res.json(stateFor(coupleId, memberId))
})

api.patch('/me', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  const name = String(req.body?.name ?? '').slice(0, 40)
  if (name) db.prepare('UPDATE members SET name = ? WHERE id = ?').run(name, memberId)
  bump(coupleId)
  res.json(stateFor(coupleId, memberId))
})

api.post('/leave', (req, res) => {
  const { coupleId, memberId } = getAuth(req)
  db.prepare('DELETE FROM members WHERE id = ?').run(memberId)
  const remaining = db.prepare('SELECT COUNT(*) AS n FROM members WHERE couple_id = ?').get(coupleId) as { n: number }
  if (remaining.n === 0) {
    db.prepare('DELETE FROM logs WHERE couple_id = ?').run(coupleId)
    db.prepare('DELETE FROM couples WHERE id = ?').run(coupleId)
  } else {
    bump(coupleId)
  }
  res.json({ ok: true })
})

app.use('/api', api)

const dist = join(ROOT, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('/{*path}', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

app.listen(PORT, () => console.log(`Greenlight API listening on http://localhost:${PORT}`))

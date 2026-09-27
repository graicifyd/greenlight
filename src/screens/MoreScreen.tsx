import { Check, ChevronDown, Copy, Download, LogOut, Share2, Trash2, Wand2, WifiOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button, Card, Field, SectionTitle, Segmented, cx, inputClass } from '../components/ui'
import type { CautionLevel } from '../engine/types'
import { useStore } from '../lib/store'

export function MoreScreen() {
  const { state, me, partner, analysis, offline, updateSettings, rename, loadDemo, clearLogs, leave } = useStore()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'clear' | 'leave' | null>(null)
  if (!state || !me) return null
  const s = state.settings
  const stats = analysis?.stats

  const inviteUrl = `${location.origin}/?join=${state.inviteCode}`
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  const share = async () => {
    const data = { title: 'Join me on Greenlight', text: `Use code ${state.inviteCode} to see our yes days together.`, url: inviteUrl }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        /* cancelled */
      }
    } else await copyCode()
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ settings: s, logs: state.logs }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `greenlight-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="rise flex flex-col gap-6">
      <header className="pt-1">
        <h1 className="display text-[28px] font-semibold leading-tight">More</h1>
        {offline && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-[#9a4a2e]">
            <WifiOff size={14} /> Offline — showing your last synced data
          </p>
        )}
      </header>

      <section>
        <SectionTitle>Partner</SectionTitle>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <MemberRow name={me.name} role={me.role} you />
            {partner ? (
              <MemberRow name={partner.name} role={partner.role} />
            ) : (
              <p className="text-[14px] leading-snug text-muted">No partner yet. Share this code — they tap “I’m the partner” and see your yes days and careful days too.</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-go-tint px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Invite code</div>
              <div className="display text-[26px] font-semibold tracking-[0.2em]">{state.inviteCode}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => void copyCode()} className="rounded-xl p-2.5 hover:bg-go-tint" aria-label="Copy code">
                {copied ? <Check size={18} className="text-go" /> : <Copy size={18} />}
              </button>
              <button onClick={() => void share()} className="rounded-xl p-2.5 hover:bg-go-tint" aria-label="Share invite">
                <Share2 size={18} />
              </button>
            </div>
          </div>
          <Field label="Your name">
            <input className={inputClass} defaultValue={me.name} key={me.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== me.name && void rename(e.target.value.trim())} />
          </Field>
        </Card>
      </section>

      <section>
        <SectionTitle>How Greenlight decides</SectionTitle>
        <Card className="divide-y divide-line/70 p-0">
          <Accordion title="Yes days and careful days" defaultOpen>
            Yes days are when pregnancy is least likely, so you can relax and enjoy without a condom. Careful days are your fertile window — use a condom or
            save it for later. When Greenlight isn’t sure, it picks careful: a condom is a small price for peace of mind.
          </Accordion>
          <Accordion title="Your fertile window">
            Greenlight learns from your period dates. Your window runs from (shortest cycle − 20) to (longest cycle − 9). For a steady 28-day cycle that’s about
            days 8–19. The more your cycle length varies, the wider the window — which keeps you safe.
          </Accordion>
          <Accordion title="Early yes days">
            Once one full cycle is logged, the very first days of a new cycle (never past day 5) can be yes days. Your first cycle has none. Pick
            <strong> Extra safe</strong> to skip early yes days entirely.
          </Accordion>
          <Accordion title="Ovulation tests (optional)">
            A positive LH test means ovulation is close. It keeps that day and the next three careful, even if the calendar says otherwise.
          </Accordion>
          <Accordion title="Predicted days">
            Striped days are predictions for planning. They firm up as each day arrives and you log your period.
          </Accordion>
          <Accordion title="Good to know">
            Greenlight uses the calendar method — gentle and simple, but less reliable than hormonal or barrier contraception, especially with irregular cycles,
            after stopping the pill, or while breastfeeding. If avoiding pregnancy really matters, pair yes days with condoms or talk to a clinician about what fits you.
          </Accordion>
        </Card>
      </section>

      <section>
        <SectionTitle>Settings</SectionTitle>
        <Card className="flex flex-col gap-5">
          <Field label="Caution level">
            <Segmented<CautionLevel>
              value={s.caution}
              onChange={(v) => v && void updateSettings({ caution: v })}
              options={[
                { value: 'standard', label: 'Relaxed', hint: 'Early yes days when your history allows' },
                { value: 'strict', label: 'Extra safe', hint: 'No early yes days at all' },
              ]}
            />
          </Field>
          <Field label="Typical cycle length" hint="Used until you’ve logged a full cycle.">
            <input
              type="number"
              min={21}
              max={45}
              className={inputClass}
              defaultValue={s.typicalCycleLength}
              key={s.typicalCycleLength}
              onBlur={(e) => {
                const n = Number(e.target.value)
                if (n >= 21 && n <= 45 && n !== s.typicalCycleLength) void updateSettings({ typicalCycleLength: n })
              }}
            />
          </Field>
        </Card>
      </section>

      {stats && (
        <section>
          <SectionTitle>Your history</SectionTitle>
          <Card className="grid grid-cols-2 gap-3">
            <Stat label="Completed cycles" value={String(stats.completedCycles)} />
            <Stat label="Cycle length" value={stats.medianCycleLength ? `${stats.medianCycleLength} d` : '—'} sub={stats.shortestCycle ? `${stats.shortestCycle}–${stats.longestCycle}` : undefined} />
            <Stat label="Fertile window" value={analysis?.fertileWindow ? `days ${analysis.fertileWindow.start}–${analysis.fertileWindow.end}` : '—'} />
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>Data</SectionTitle>
        <Card className="flex flex-col gap-2 p-2">
          <Action icon={<Download size={18} />} label="Export as JSON" onClick={exportJson} />
          <Action icon={<Wand2 size={18} />} label="Replace with demo data" hint="Four realistic past cycles" busy={busy === 'demo'} onClick={() => void run('demo', loadDemo)} />
          {confirm === 'clear' ? (
            <ConfirmRow text="Delete every log for this couple?" busy={busy === 'clear'} onYes={() => void run('clear', clearLogs)} onNo={() => setConfirm(null)} />
          ) : (
            <Action icon={<Trash2 size={18} />} label="Clear all logs" danger onClick={() => setConfirm('clear')} />
          )}
          {confirm === 'leave' ? (
            <ConfirmRow
              text={partner ? 'Leave this couple? Your partner keeps the data.' : 'Leave and permanently delete all data?'}
              busy={busy === 'leave'}
              onYes={() => void run('leave', leave)}
              onNo={() => setConfirm(null)}
            />
          ) : (
            <Action icon={<LogOut size={18} />} label="Leave couple" danger onClick={() => setConfirm('leave')} />
          )}
        </Card>
      </section>

      <p className="px-2 pb-2 text-center text-[12px] leading-relaxed text-muted">
        Greenlight · for enjoying intimacy without the pregnancy worry. Not a medical device. If you had sex without protection on a careful day, the morning-after pill works best within 72 hours.
      </p>
    </div>
  )
}

function MemberRow({ name, role, you }: { name: string; role: string; you?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cx('grid h-9 w-9 place-items-center rounded-full text-[14px] font-bold', role === 'cycling' ? 'bg-go-soft text-go-deep' : 'bg-stop-soft text-stop-deep')}>
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <div className="text-[15px] font-semibold">
          {name}
          {you && <span className="ml-1.5 text-[12px] font-medium text-muted">(you)</span>}
        </div>
        <div className="text-[12px] text-muted">{role === 'cycling' ? 'Her cycle' : 'Partner'}</div>
      </div>
    </div>
  )
}

function Accordion({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left" aria-expanded={open}>
        <span className="text-[15px] font-semibold">{title}</span>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && <p className="px-4 pb-4 -mt-1 text-[14px] leading-relaxed text-ink-2">{children}</p>}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-go-tint px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="display text-[20px] font-semibold leading-tight">
        {value}
        {sub && <span className="ml-1.5 text-[12px] font-medium text-muted">{sub}</span>}
      </div>
    </div>
  )
}

function Action({ icon, label, hint, onClick, danger, busy }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-go-tint disabled:opacity-50', danger ? 'text-stop-deep' : 'text-ink')}>
      <span className={cx(danger ? 'text-stop' : 'text-muted')}>{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium">{busy ? 'Working…' : label}</span>
        {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
      </span>
    </button>
  )
}

function ConfirmRow({ text, onYes, onNo, busy }: { text: string; onYes: () => void; onNo: () => void; busy: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-stop-tint p-3">
      <p className="text-[14px] font-medium text-stop-deep">{text}</p>
      <div className="flex gap-2">
        <Button variant="danger" className="h-10 flex-1" disabled={busy} onClick={onYes}>
          {busy ? 'Working…' : 'Yes, do it'}
        </Button>
        <Button variant="secondary" className="h-10 flex-1" onClick={onNo}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

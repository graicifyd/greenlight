import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { todayISO } from '../engine/dates'
import { buildDemoLogs } from '../engine/demo'
import { analyse, type Analysis } from '../engine/engine'
import type { DayLog, Member, Role, Settings } from '../engine/types'
import { api, ApiError, getToken, setToken, type RemoteState } from './api'

const CACHE_KEY = 'greenlight.state'
const POLL_MS = 8000

interface Store {
  state: RemoteState | null
  me: Member | null
  partner: Member | null
  analysis: Analysis | null
  today: string
  loading: boolean
  offline: boolean
  error: string | null
  createCouple: (name: string, role: Role, settings: Partial<Settings>) => Promise<void>
  join: (code: string, name: string) => Promise<void>
  saveLog: (log: Omit<DayLog, 'updatedAt'>) => Promise<void>
  deleteLog: (date: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  rename: (name: string) => Promise<void>
  loadDemo: () => Promise<void>
  clearLogs: () => Promise<void>
  leave: () => Promise<void>
  refresh: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

const readCache = (): RemoteState | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as RemoteState) : null
  } catch {
    return null
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RemoteState | null>(() => (getToken() ? readCache() : null))
  const [loading, setLoading] = useState(!!getToken())
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState(todayISO())
  const stateRef = useRef(state)

  const commit = useCallback((next: RemoteState | null) => {
    stateRef.current = next
    setState(next)
    if (next) localStorage.setItem(CACHE_KEY, JSON.stringify(next))
    else localStorage.removeItem(CACHE_KEY)
  }, [])

  const run = useCallback(
    async (fn: () => Promise<RemoteState | undefined>) => {
      try {
        const next = await fn()
        if (next) commit(next)
        setOffline(false)
        setError(null)
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 401) {
            setToken(null)
            commit(null)
          }
          setError(e.message)
          throw e
        }
        setOffline(true)
        throw e
      }
    },
    [commit],
  )

  const refresh = useCallback(async () => {
    if (!getToken()) return
    await run(() => api.state(stateRef.current?.version)).catch(() => undefined)
  }, [run])

  useEffect(() => {
    if (!getToken()) return
    refresh().finally(() => setLoading(false))
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
      setToday(todayISO())
    }
    const id = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh, state?.coupleId])

  const signIn = useCallback(
    async (p: Promise<{ token: string; state: RemoteState }>) => {
      const { token, state: next } = await p
      setToken(token)
      commit(next)
      setError(null)
    },
    [commit],
  )

  const optimistic = useCallback(
    (log: DayLog) => {
      const cur = stateRef.current
      if (!cur) return
      const logs = cur.logs.filter((l) => l.date !== log.date)
      commit({ ...cur, logs: [...logs, log].sort((a, b) => (a.date < b.date ? -1 : 1)) })
    },
    [commit],
  )

  const store: Store = useMemo(() => {
    const me = state?.members.find((m) => m.id === state.meId) ?? null
    const partner = state?.members.find((m) => m.id !== state.meId) ?? null
    const analysis = state ? analyse(state.logs, state.settings, today) : null
    return {
      state,
      me,
      partner,
      analysis,
      today,
      loading,
      offline,
      error,
      refresh,
      createCouple: (name, role, settings) => signIn(api.createCouple(name, role, settings)),
      join: (code, name) => signIn(api.join(code, name)),
      saveLog: async (partial) => {
        const log: DayLog = { ...partial, updatedAt: Date.now() }
        const isEmpty = !log.flow && log.temp == null && !log.mucus && !log.lh && !log.sex && !log.note?.trim()
        if (isEmpty) {
          const cur = stateRef.current
          if (cur) commit({ ...cur, logs: cur.logs.filter((l) => l.date !== log.date) })
          await run(() => api.deleteLog(log.date))
          return
        }
        optimistic(log)
        await run(() => api.upsertLog(log))
      },
      deleteLog: async (date) => {
        const cur = stateRef.current
        if (cur) commit({ ...cur, logs: cur.logs.filter((l) => l.date !== date) })
        await run(() => api.deleteLog(date))
      },
      updateSettings: async (patch) => {
        const cur = stateRef.current
        if (cur) commit({ ...cur, settings: { ...cur.settings, ...patch } })
        await run(() => api.updateSettings(patch))
      },
      rename: (name) => run(() => api.rename(name)),
      loadDemo: () => run(() => api.bulkLogs(buildDemoLogs(today, 11), true)),
      clearLogs: () => run(() => api.bulkLogs([], true)),
      leave: async () => {
        await api.leave().catch(() => undefined)
        setToken(null)
        commit(null)
      },
    }
  }, [state, today, loading, offline, error, refresh, signIn, run, optimistic, commit])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

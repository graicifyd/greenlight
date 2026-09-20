import type { DayLog, Member, Role, Settings } from '../engine/types'

export interface RemoteState {
  coupleId: string
  inviteCode: string
  version: number
  settings: Settings
  members: Member[]
  meId: string
  logs: DayLog[]
}

const TOKEN_KEY = 'greenlight.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const token = getToken()
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (res.status === 304) return undefined as T
  if (!res.ok) {
    let message = res.statusText
    try {
      message = ((await res.json()) as { error?: string }).error ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export const api = {
  createCouple: (name: string, role: Role, settings: Partial<Settings>) =>
    request<{ token: string; state: RemoteState }>('POST', '/couples', { name, role, settings }),
  join: (code: string, name: string) => request<{ token: string; state: RemoteState }>('POST', '/couples/join', { code, name }),
  state: (version?: number) => request<RemoteState | undefined>('GET', `/state${version ? `?v=${version}` : ''}`),
  upsertLog: (log: DayLog) => request<RemoteState>('PUT', '/logs', log),
  bulkLogs: (logs: DayLog[], replace: boolean) => request<RemoteState>('POST', '/logs/bulk', { logs, replace }),
  deleteLog: (date: string) => request<RemoteState>('DELETE', `/logs/${date}`),
  updateSettings: (patch: Partial<Settings>) => request<RemoteState>('PUT', '/settings', patch),
  rename: (name: string) => request<RemoteState>('PATCH', '/me', { name }),
  leave: () => request<{ ok: true }>('POST', '/leave'),
}

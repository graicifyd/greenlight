export const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const
export type Flow = (typeof FLOWS)[number]

export type LhResult = 'negative' | 'positive'
export type SexEntry = 'protected' | 'unprotected'

export interface DayLog {
  date: string
  flow?: Flow
  lh?: LhResult
  sex?: SexEntry
  note?: string
  updatedAt: number
}

export type CautionLevel = 'standard' | 'strict'

export interface Settings {
  caution: CautionLevel
  typicalCycleLength: number
}

export const DEFAULT_SETTINGS: Settings = {
  caution: 'standard',
  typicalCycleLength: 28,
}

export type Role = 'cycling' | 'partner'

export interface Member {
  id: string
  role: Role
  name: string
}

export interface CoupleState {
  coupleId: string
  inviteCode: string
  members: Member[]
  settings: Settings
  logs: DayLog[]
}

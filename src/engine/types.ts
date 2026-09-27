export const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const
export type Flow = (typeof FLOWS)[number]

export const MUCUS_TYPES = ['dry', 'sticky', 'creamy', 'watery', 'eggwhite'] as const
export type Mucus = (typeof MUCUS_TYPES)[number]

export type LhResult = 'negative' | 'positive'
export type SexEntry = 'protected' | 'unprotected'

export interface DayLog {
  date: string
  flow?: Flow
  /** Basal body temperature, always stored in °C */
  temp?: number
  /** Reading was disturbed (illness, alcohol, poor sleep, late wake) and must be ignored by the algorithm */
  tempDisturbed?: boolean
  mucus?: Mucus
  lh?: LhResult
  sex?: SexEntry
  note?: string
  updatedAt: number
}

export type TempUnit = 'c' | 'f'
export type CautionLevel = 'standard' | 'strict'

export interface Settings {
  tempUnit: TempUnit
  caution: CautionLevel
  /** When true the symptothermal double-check (temperature + mucus) is required to open the luteal green phase */
  trackMucus: boolean
  typicalCycleLength: number
}

export const DEFAULT_SETTINGS: Settings = {
  tempUnit: 'c',
  caution: 'standard',
  trackMucus: true,
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

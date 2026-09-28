import { format } from 'date-fns'
import { fromISO } from '../engine/dates'
import type { Flow } from '../engine/types'

export const fmtDay = (iso: string) => format(fromISO(iso), 'EEE d MMM')
export const fmtLong = (iso: string) => format(fromISO(iso), 'EEEE d MMMM')
export const fmtShort = (iso: string) => format(fromISO(iso), 'd MMM')
export const fmtMonth = (iso: string) => format(fromISO(iso), 'MMMM yyyy')

export const FLOW_LABEL: Record<Flow, string> = { spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy' }
export const LIGHT_LABEL = { green: 'Yes day', red: 'Careful day' } as const
export const relativeDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

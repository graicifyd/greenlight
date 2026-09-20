import { format } from 'date-fns'
import { fromISO } from '../engine/dates'
import { cToF } from '../engine/engine'
import type { Flow, Mucus, TempUnit } from '../engine/types'

export const fmtDay = (iso: string) => format(fromISO(iso), 'EEE d MMM')
export const fmtLong = (iso: string) => format(fromISO(iso), 'EEEE d MMMM')
export const fmtShort = (iso: string) => format(fromISO(iso), 'd MMM')
export const fmtMonth = (iso: string) => format(fromISO(iso), 'MMMM yyyy')

export const fmtTemp = (c: number, unit: TempUnit) => (unit === 'f' ? `${cToF(c).toFixed(1)}°F` : `${c.toFixed(2).replace(/0$/, '')}°C`)

export const FLOW_LABEL: Record<Flow, string> = { spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy' }
export const MUCUS_LABEL: Record<Mucus, string> = { dry: 'Dry', sticky: 'Sticky', creamy: 'Creamy', watery: 'Watery', eggwhite: 'Egg white' }
export const MUCUS_HINT: Record<Mucus, string> = {
  dry: 'Nothing seen or felt',
  sticky: 'Pasty, crumbly, tacky',
  creamy: 'Lotion-like, white',
  watery: 'Wet, slippery, clear',
  eggwhite: 'Stretchy, clear, most fertile',
}
export const relativeDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

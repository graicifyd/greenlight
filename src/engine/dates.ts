import { addDays as dfAddDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export const toISO = (d: Date): string => format(d, 'yyyy-MM-dd')
export const fromISO = (s: string): Date => parseISO(s)
export const addDays = (iso: string, n: number): string => toISO(dfAddDays(fromISO(iso), n))
export const daysBetween = (a: string, b: string): number => differenceInCalendarDays(fromISO(b), fromISO(a))
export const todayISO = (): string => toISO(new Date())
export const compareISO = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

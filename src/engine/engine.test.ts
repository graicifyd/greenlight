import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { buildDemoLogs } from './demo'
import { analyse, fertileWindow, splitCycles } from './engine'
import { DEFAULT_SETTINGS, type DayLog, type Settings } from './types'

const T0 = '2026-01-01'
const period = (start: string, days = 4): DayLog[] =>
  Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), flow: 'medium' as const, updatedAt: 0 }))

/** Cycles of the given lengths starting at T0, plus the current cycle's first period day. */
function history(lengths: number[]): { logs: DayLog[]; currentStart: string } {
  const logs: DayLog[] = []
  let start = T0
  for (const len of lengths) {
    logs.push(...period(start))
    start = addDays(start, len)
  }
  logs.push(...period(start))
  return { logs, currentStart: start }
}

const lightOn = (logs: DayLog[], start: string, cycleDay: number, today: string, settings: Settings = DEFAULT_SETTINGS) =>
  analyse(logs, settings, today).days.get(addDays(start, cycleDay - 1))?.light

describe('fertileWindow', () => {
  it('uses shortest − 20 through longest − 9', () => {
    expect(fertileWindow([27, 30, 28], 28)).toEqual({ start: 7, end: 21 })
  })
  it('falls back to the typical length without history', () => {
    expect(fertileWindow([], 28)).toEqual({ start: 8, end: 19 })
  })
  it('never starts before day 1', () => {
    expect(fertileWindow([20], 28).start).toBe(1)
  })
})

describe('splitCycles', () => {
  it('starts a new cycle only after a 15-day gap and ignores spotting', () => {
    const logs: DayLog[] = [...period(T0), { date: addDays(T0, 10), flow: 'light', updatedAt: 0 }, { date: addDays(T0, 20), flow: 'spotting', updatedAt: 0 }, ...period(addDays(T0, 28))]
    const cycles = splitCycles(logs, addDays(T0, 30))
    expect(cycles.map((c) => c.length)).toEqual([28, null])
  })
})

describe('analyse', () => {
  it('has no early yes days in the first tracked cycle', () => {
    const logs = period(T0)
    expect(lightOn(logs, T0, 1, addDays(T0, 3))).toBe('red')
  })

  it('allows early yes days (≤ day 5) once one cycle is complete', () => {
    const { logs, currentStart } = history([28])
    const today = addDays(currentStart, 4)
    expect(lightOn(logs, currentStart, 5, today)).toBe('green')
    expect(lightOn(logs, currentStart, 6, addDays(currentStart, 5))).toBe('red')
  })

  it('limits early yes days by the shortest cycle', () => {
    const { logs, currentStart } = history([23, 28])
    // shortest 23 → window opens day 3, so only days 1–2 are yes
    expect(lightOn(logs, currentStart, 2, addDays(currentStart, 1))).toBe('green')
    expect(lightOn(logs, currentStart, 3, addDays(currentStart, 2))).toBe('red')
  })

  it('strict mode removes early yes days', () => {
    const { logs, currentStart } = history([28, 28])
    expect(lightOn(logs, currentStart, 2, addDays(currentStart, 1), { ...DEFAULT_SETTINGS, caution: 'strict' })).toBe('red')
  })

  it('keeps the fertile window careful and opens yes days after it', () => {
    const { logs, currentStart } = history([27, 30])
    // window days 7–21
    expect(lightOn(logs, currentStart, 21, addDays(currentStart, 20))).toBe('red')
    expect(lightOn(logs, currentStart, 22, addDays(currentStart, 21))).toBe('green')
  })

  it('a positive LH test keeps its day and the next three careful', () => {
    const { logs, currentStart } = history([27, 30])
    logs.push({ date: addDays(currentStart, 21), lh: 'positive', updatedAt: 0 })
    const today = addDays(currentStart, 26)
    expect(lightOn(logs, currentStart, 22, today)).toBe('red')
    expect(lightOn(logs, currentStart, 25, today)).toBe('red')
    expect(lightOn(logs, currentStart, 26, today)).toBe('green')
  })

  it('a positive LH test overrides early yes days', () => {
    const { logs, currentStart } = history([28])
    logs.push({ date: addDays(currentStart, 2), lh: 'positive', updatedAt: 0 })
    expect(lightOn(logs, currentStart, 3, addDays(currentStart, 4))).toBe('red')
  })

  it('predicts future days, striped, and flags an expected period', () => {
    const { logs, currentStart } = history([28, 28])
    const a = analyse(logs, DEFAULT_SETTINGS, addDays(currentStart, 9))
    const future = a.days.get(addDays(currentStart, 25))
    expect(future).toMatchObject({ kind: 'predicted', light: 'green' })
    expect(a.predictedPeriodStart).toBe(addDays(currentStart, 28))
  })

  it('treats everything as careful before any period is logged', () => {
    const a = analyse([], DEFAULT_SETTINGS, T0)
    expect(a.today).toMatchObject({ light: 'red', phase: 'unknown' })
  })

  it('demo data yields a careful day on cycle day 11 and four completed cycles', () => {
    const today = '2026-06-15'
    const a = analyse(buildDemoLogs(today), { ...DEFAULT_SETTINGS, typicalCycleLength: 29 }, today)
    expect(a.stats.completedCycles).toBe(4)
    expect(a.today).toMatchObject({ cycleDay: 11, light: 'red' })
    expect(a.today.nextChange?.light).toBe('green')
  })
})

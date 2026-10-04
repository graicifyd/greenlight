import { addDays } from './dates'
import type { DayLog, Flow } from './types'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

interface CycleSpec {
  length: number
  ovulation: number
  periodDays: number
}

/**
 * Deterministic demo history: four completed cycles plus the current one,
 * with periods, LH tests and a sprinkling of intimate moments.
 * `currentDay` is which cycle day "today" falls on.
 */
export function buildDemoLogs(today: string, currentDay = 11): DayLog[] {
  const rand = rng(42)
  const specs: CycleSpec[] = [
    { length: 28, ovulation: 14, periodDays: 5 },
    { length: 30, ovulation: 16, periodDays: 5 },
    { length: 27, ovulation: 13, periodDays: 4 },
    { length: 29, ovulation: 15, periodDays: 5 },
  ]
  const logs: DayLog[] = []
  const totalPast = specs.reduce((a, s) => a + s.length, 0)
  let start = addDays(today, -(totalPast + currentDay - 1))
  const now = Date.now()

  const emit = (spec: CycleSpec, startDate: string, upTo: number) => {
    for (let d = 1; d <= Math.min(spec.length, upTo); d++) {
      const date = addDays(startDate, d - 1)
      const log: DayLog = { date, updatedAt: now }
      if (d <= spec.periodDays) {
        const flows: Flow[] = ['medium', 'heavy', 'medium', 'light', 'spotting']
        log.flow = flows[Math.min(d - 1, flows.length - 1)]
      }
      if (d === spec.ovulation - 1) log.lh = 'positive'
      if (d === spec.ovulation - 4) log.lh = 'negative'
      if (rand() < 0.18) log.sex = d <= 5 || d > spec.ovulation + 7 ? 'unprotected' : 'protected'
      if (log.flow || log.lh || log.sex) logs.push(log)
    }
  }

  for (const spec of specs) {
    emit(spec, start, spec.length)
    start = addDays(start, spec.length)
  }
  emit({ length: 29, ovulation: 15, periodDays: 5 }, start, currentDay)
  return logs
}

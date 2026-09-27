import { addDays } from './dates'
import type { DayLog, Flow, Mucus } from './types'

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
 * with realistic biphasic temperatures and a mucus build-up around ovulation.
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
      const baseline = 36.35 + (rand() - 0.5) * 0.12
      const high = d > spec.ovulation
      let temp = high ? baseline + 0.38 + (d - spec.ovulation) * 0.01 : baseline
      if (high && d === spec.ovulation + 1) temp = baseline + 0.24
      if (d === spec.length && d > spec.ovulation + 10) temp -= 0.2
      if (rand() < 0.08) {
        log.tempDisturbed = true
        temp += 0.25
      }
      if (rand() > 0.06) log.temp = Math.round(temp * 20) / 20
      if (d > spec.periodDays) {
        const rel = d - spec.ovulation
        let mucus: Mucus = 'dry'
        if (rel >= -6 && rel <= -4) mucus = 'sticky'
        else if (rel === -3) mucus = 'creamy'
        else if (rel >= -2 && rel <= -1) mucus = 'watery'
        else if (rel === 0) mucus = 'eggwhite'
        else if (rel === 1) mucus = 'creamy'
        else if (rel === 2) mucus = 'sticky'
        log.mucus = mucus
      }
      if (d === spec.ovulation - 1) log.lh = 'positive'
      if (d === spec.ovulation - 4) log.lh = 'negative'
      if (rand() < 0.18) log.sex = d <= 5 || d > spec.ovulation + 4 ? 'unprotected' : 'protected'
      logs.push(log)
    }
  }

  for (const spec of specs) {
    emit(spec, start, spec.length)
    start = addDays(start, spec.length)
  }
  emit({ length: 29, ovulation: 15, periodDays: 5 }, start, currentDay)
  return logs
}

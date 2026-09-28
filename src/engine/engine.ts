/**
 * Greenlight fertility engine — calendar method edition.
 *
 * Each day is either a YES day or a CAREFUL day, decided by cycle history:
 *
 *  - Fertile window = from (shortest seen cycle − 20) through
 *    (longest seen cycle − 9). Without history the typical cycle length
 *    stands in for both, which for a regular 28-day cycle gives days 8–19.
 *  - Early YES days: at most days 1–5, and only once at least one full
 *    cycle has been observed. Strict mode removes them entirely.
 *  - A positive LH test keeps its day and the following three days CAREFUL.
 *  - Anything ambiguous stays CAREFUL; predictions are striped and never
 *    to be relied on.
 */
import { addDays, daysBetween } from './dates'
import type { DayLog, Settings } from './types'

export const NEW_CYCLE_MIN_GAP = 15
export const PREDICTION_HORIZON_DAYS = 60
const DEFAULT_LUTEAL = 13
/** Fertile window opens this many days before the shortest cycle's end. */
const FERTILE_START_OFFSET = 20
/** Fertile window closes this many days before the longest cycle's end. */
const FERTILE_END_OFFSET = 9
const MAX_EARLY_GREEN = 5

export type Light = 'green' | 'red'
export type Phase = 'menstrual' | 'follicular' | 'fertile' | 'luteal' | 'unknown'
export type Kind = 'confirmed' | 'predicted'

export interface Cycle {
  index: number
  start: string
  /** Inclusive last day. Null for the current cycle. */
  end: string | null
  length: number | null
  complete: boolean
  logs: Map<number, DayLog>
  periodDays: number[]
  lhPositiveDays: number[]
  /** Last early YES cycle day (0 = none). */
  preOvGreenUntil: number
  preOvRule: string
  /** Estimated ovulation cycle day (length − 13); for display only. */
  ovulationDay: number | null
}

export interface DayAssessment {
  date: string
  cycleDay: number | null
  cycleIndex: number | null
  light: Light
  kind: Kind
  phase: Phase
  isPeriod: boolean
  reason: string
  log?: DayLog
}

export interface Stats {
  completedCycles: number
  medianCycleLength: number | null
  shortestCycle: number | null
  longestCycle: number | null
}

export interface Prompt {
  id: 'period' | 'first-cycle' | 'lh'
  text: string
}

export interface TodayStatus {
  date: string
  light: Light
  kind: Kind
  phase: Phase
  cycleDay: number | null
  headline: string
  detail: string
  action: string
  confidence: 'medium' | 'low'
  nextChange: { date: string; light: Light; daysAway: number; kind: Kind } | null
  prompts: Prompt[]
}

export interface Analysis {
  cycles: Cycle[]
  current: Cycle | null
  stats: Stats
  days: Map<string, DayAssessment>
  today: TodayStatus
  predictedPeriodStart: string | null
  predictedOvulation: string | null
  /** First and last CAREFUL cycle days in the current cycle's window. */
  fertileWindow: { start: number; end: number } | null
}

const isPeriodFlow = (log?: DayLog) => !!log?.flow && log.flow !== 'spotting'

export const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/* ---------------------------------------------------------------- cycles */

export function splitCycles(logs: DayLog[], today: string): Cycle[] {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))
  const starts: string[] = []
  for (const l of sorted) {
    if (!isPeriodFlow(l)) continue
    const last = starts[starts.length - 1]
    if (!last || daysBetween(last, l.date) >= NEW_CYCLE_MIN_GAP) starts.push(l.date)
  }
  return starts.map((start, i) => {
    const next = starts[i + 1]
    const end = next ? addDays(next, -1) : null
    const lastDay = end ?? (today > start ? today : start)
    const byDay = new Map<number, DayLog>()
    for (const l of sorted) {
      if (l.date < start || l.date > lastDay) continue
      byDay.set(daysBetween(start, l.date) + 1, l)
    }
    const length = end ? daysBetween(start, end) + 1 : null
    return {
      index: i,
      start,
      end,
      length,
      complete: !!end,
      logs: byDay,
      periodDays: [...byDay.entries()].filter(([, l]) => isPeriodFlow(l)).map(([d]) => d),
      lhPositiveDays: [...byDay.entries()].filter(([, l]) => l.lh === 'positive').map(([d]) => d),
      preOvGreenUntil: 0,
      preOvRule: '',
      ovulationDay: length ? length - DEFAULT_LUTEAL : null,
    }
  })
}

/* --------------------------------------------------------- fertile window */

export interface FertileWindow {
  /** First CAREFUL cycle day of the window. */
  start: number
  /** Last CAREFUL cycle day of the window. */
  end: number
}

/** Ogino-style window: shortest − 20 through longest − 9, built from completed cycles or the typical length. */
export function fertileWindow(cycleLengths: number[], typicalCycleLength: number): FertileWindow {
  const shortest = cycleLengths.length ? Math.min(...cycleLengths) : typicalCycleLength
  const longest = cycleLengths.length ? Math.max(...cycleLengths) : typicalCycleLength
  return { start: Math.max(1, shortest - FERTILE_START_OFFSET), end: Math.max(1, longest - FERTILE_END_OFFSET) }
}

function analyseCycle(cycle: Cycle, previous: Cycle[], settings: Settings): void {
  const completed = previous.filter((c) => c.complete).map((c) => c.length as number)
  const win = fertileWindow(completed, settings.typicalCycleLength)

  if (settings.caution === 'strict') {
    cycle.preOvGreenUntil = 0
    cycle.preOvRule = 'Strict mode: every day before the end of the fertile window is careful.'
  } else if (!completed.length) {
    cycle.preOvGreenUntil = 0
    cycle.preOvRule = 'First tracked cycle: early days stay careful until one full cycle is on record.'
  } else {
    const limit = Math.min(MAX_EARLY_GREEN, win.start - 1)
    cycle.preOvGreenUntil = Math.max(0, limit)
    cycle.preOvRule =
      limit > 0
        ? `Days 1–${limit} are YES days based on your cycle history.`
        : 'No early YES days — your shortest cycle leaves no safe early window.'
  }
}

export function computeStats(cycles: Cycle[]): Stats {
  const lengths = cycles.filter((c) => c.complete).map((c) => c.length as number)
  return {
    completedCycles: lengths.length,
    medianCycleLength: median(lengths.slice(-6)),
    shortestCycle: lengths.length ? Math.min(...lengths) : null,
    longestCycle: lengths.length ? Math.max(...lengths) : null,
  }
}

/* ------------------------------------------------------------ assessment */

function assessKnownDay(cycle: Cycle, cycleDay: number, date: string, win: FertileWindow): DayAssessment {
  const log = cycle.logs.get(cycleDay)
  const isPeriod = isPeriodFlow(log)
  const base = { date, cycleDay, cycleIndex: cycle.index, kind: 'confirmed' as Kind, isPeriod, log }
  const lhDay = Math.max(-1, ...cycle.lhPositiveDays.filter((d) => cycleDay >= d && cycleDay <= d + 3))
  if (lhDay >= 0) {
    return { ...base, light: 'red', phase: isPeriod ? 'menstrual' : 'fertile', reason: `Positive LH test on day ${lhDay} — careful that day and the next three.` }
  }
  if (cycleDay <= cycle.preOvGreenUntil) {
    return { ...base, light: 'green', phase: isPeriod ? 'menstrual' : 'follicular', reason: cycle.preOvRule }
  }
  if (cycleDay > win.end) {
    return {
      ...base,
      light: 'green',
      phase: 'luteal',
      reason: `Your fertile window is estimated to have ended on day ${win.end} — ovulation has most likely passed.`,
    }
  }
  return {
    ...base,
    light: 'red',
    phase: isPeriod ? 'menstrual' : 'fertile',
    reason: `Inside your fertile window (days ${win.start}–${win.end} for your cycles). Best to wait or use a condom.`,
  }
}

interface Projection {
  length: number
  win: FertileWindow
  preOvUntil: number
  lhPositiveDays: number[]
}

function projectCycle(cycle: Cycle | null, stats: Stats, settings: Settings, completedLengths: number[], todayCycleDay: number | null): Projection {
  const typicalLength = stats.medianCycleLength ?? settings.typicalCycleLength
  const win = fertileWindow(completedLengths, settings.typicalCycleLength)
  let length = Math.max(typicalLength, win.end + 2)
  if (todayCycleDay != null && todayCycleDay >= length) length = todayCycleDay + 1
  return { length, win, preOvUntil: cycle?.preOvGreenUntil ?? 0, lhPositiveDays: cycle?.lhPositiveDays ?? [] }
}

function assessPredictedDay(date: string, cycleDay: number, cycleIndex: number | null, proj: Projection): DayAssessment {
  const isNextCycle = cycleIndex == null
  const base = { date, cycleDay, cycleIndex, kind: 'predicted' as Kind, isPeriod: isNextCycle && cycleDay <= 5 }
  const lhRed = proj.lhPositiveDays.some((d) => cycleDay >= d && cycleDay <= d + 3)
  if (lhRed) {
    return { ...base, light: 'red', phase: base.isPeriod ? 'menstrual' : 'fertile', reason: 'Positive LH test — careful that day and the next three.' }
  }
  if (cycleDay <= proj.preOvUntil) {
    return {
      ...base,
      light: 'green',
      phase: base.isPeriod ? 'menstrual' : 'follicular',
      reason: 'Predicted YES day from your cycle history — treat it as careful if this cycle runs short.',
    }
  }
  if (cycleDay > proj.win.end) {
    return { ...base, light: 'green', phase: 'luteal', reason: `Predicted YES day: the fertile window should close around day ${proj.win.end}.` }
  }
  return {
    ...base,
    light: 'red',
    phase: base.isPeriod ? 'menstrual' : 'fertile',
    reason: base.isPeriod
      ? 'Predicted period. Careful until this cycle proves to be on schedule.'
      : `Predicted fertile window (days ${proj.win.start}–${proj.win.end}).`,
  }
}

/* ---------------------------------------------------------------- today */

function buildToday(
  date: string,
  days: Map<string, DayAssessment>,
  current: Cycle | null,
  stats: Stats,
  predictedPeriodStart: string | null,
  predictedOvulation: string | null,
): TodayStatus {
  const a = days.get(date)
  const prompts: Prompt[] = []
  const log = current?.logs.get(a?.cycleDay ?? -1)
  if (current) {
    if (predictedPeriodStart && Math.abs(daysBetween(date, predictedPeriodStart)) <= 2 && !log?.flow) {
      prompts.push({ id: 'period', text: 'Period expected — log bleeding when it starts' })
    }
    if (predictedOvulation && Math.abs(daysBetween(date, predictedOvulation)) <= 4 && !log?.lh) {
      prompts.push({ id: 'lh', text: 'Around ovulation — an LH test can confirm the window' })
    }
    if (stats.completedCycles === 0) {
      prompts.push({ id: 'first-cycle', text: 'First cycle: more careful days while Greenlight learns your pattern' })
    }
  }

  if (!a || !current) {
    return {
      date,
      light: 'red',
      kind: 'confirmed',
      phase: 'unknown',
      cycleDay: null,
      headline: 'No cycle yet',
      detail: 'Log the first day of the last period to start tracking.',
      action: 'Treat every day as careful until then.',
      confidence: 'low',
      nextChange: null,
      prompts,
    }
  }

  let nextChange: TodayStatus['nextChange'] = null
  for (let i = 1; i <= PREDICTION_HORIZON_DAYS; i++) {
    const d = addDays(date, i)
    const n = days.get(d)
    if (!n) break
    if (n.light !== a.light) {
      nextChange = { date: d, light: n.light, daysAway: i, kind: n.kind }
      break
    }
  }

  const green = a.light === 'green'
  return {
    date,
    light: a.light,
    kind: a.kind,
    phase: a.phase,
    cycleDay: a.cycleDay,
    headline: green ? 'Yes day' : 'Careful day',
    detail: a.reason,
    action: green ? 'All clear — enjoy today.' : 'Best to wait, or use a condom.',
    confidence: a.kind === 'predicted' ? 'low' : 'medium',
    nextChange,
    prompts,
  }
}

/* ----------------------------------------------------------------- main */

export function analyse(logs: DayLog[], settings: Settings, today: string): Analysis {
  const cycles = splitCycles(logs, today)
  cycles.forEach((c, i) => analyseCycle(c, cycles.slice(0, i), settings))
  const stats = computeStats(cycles)
  const days = new Map<string, DayAssessment>()
  const current = cycles.length ? cycles[cycles.length - 1] : null
  const completedLengths = cycles.filter((c) => c.complete).map((c) => c.length as number)
  const win = fertileWindow(completedLengths, settings.typicalCycleLength)

  for (const c of cycles) {
    const last = c.end ?? today
    for (let d = c.start; d <= last; d = addDays(d, 1)) {
      days.set(d, assessKnownDay(c, daysBetween(c.start, d) + 1, d, win))
    }
  }

  let predictedPeriodStart: string | null = null
  let predictedOvulation: string | null = null
  if (current) {
    const todayCycleDay = daysBetween(current.start, today) + 1
    const proj = projectCycle(current, stats, settings, completedLengths, todayCycleDay)
    predictedPeriodStart = addDays(current.start, proj.length)
    predictedOvulation = addDays(current.start, proj.length - DEFAULT_LUTEAL - 1)
    current.ovulationDay = proj.length - DEFAULT_LUTEAL

    const nextProj = projectCycle(null, stats, settings, completedLengths, null)
    nextProj.preOvUntil =
      settings.caution !== 'strict' && completedLengths.length > 0
        ? Math.max(0, Math.min(MAX_EARLY_GREEN, win.start - 1))
        : 0

    const horizon = addDays(today, PREDICTION_HORIZON_DAYS)
    for (let d = addDays(today, 1); d <= horizon; d = addDays(d, 1)) {
      const cd = daysBetween(current.start, d) + 1
      if (cd <= proj.length) {
        days.set(d, assessPredictedDay(d, cd, current.index, proj))
      } else {
        const ncd = daysBetween(predictedPeriodStart, d) + 1
        if (ncd > nextProj.length) break
        days.set(d, assessPredictedDay(d, ncd, null, nextProj))
      }
    }
  }

  const todayStatus = buildToday(today, days, current, stats, predictedPeriodStart, predictedOvulation)
  return { cycles, current, stats, days, today: todayStatus, predictedPeriodStart, predictedOvulation, fertileWindow: current ? win : null }
}

/**
 * Greenlight fertility engine.
 *
 * Implements the symptothermal method (Sensiplan rules) with a bias towards
 * avoiding pregnancy: whenever the data is missing or ambiguous a day is red.
 *
 *  - Temperature: coverline = highest of the 6 preceding valid readings.
 *    Ovulation is confirmed by 3 consecutive higher readings, the 3rd at least
 *    0.2 °C above the coverline (with the two Sensiplan exception rules).
 *  - Cervical mucus: peak day = last day of most-fertile mucus; confirmed on
 *    the 3rd day after the peak with lower-quality observations.
 *  - The luteal green phase opens the day after BOTH signs are confirmed
 *    (temperature-only users get one extra buffer day).
 *  - Pre-ovulatory green days follow the 5-day rule, the Minus-8 rule and the
 *    Minus-20 rule, only when the previous cycle had a confirmed shift, and are
 *    cut short by any mucus observation.
 */
import { addDays, daysBetween } from './dates'
import type { DayLog, Mucus, Settings } from './types'

export const TEMP_SHIFT_DELTA = 0.2
export const NEW_CYCLE_MIN_GAP = 15
export const PREDICTION_HORIZON_DAYS = 60
const DEFAULT_LUTEAL = 13

export type Light = 'green' | 'red'
export type Phase = 'menstrual' | 'follicular' | 'fertile' | 'luteal' | 'unknown'
export type Kind = 'confirmed' | 'predicted'

export interface TempShift {
  coverline: number
  firstHighDay: number
  /** Cycle day on which the rise was confirmed. Null while still in progress. */
  confirmedDay: number | null
  highsSoFar: number
}

export interface MucusPeak {
  peakDay: number
  confirmedDay: number | null
  daysAfterPeak: number
}

export interface Cycle {
  index: number
  start: string
  /** Inclusive last day. Null for the current cycle. */
  end: string | null
  length: number | null
  complete: boolean
  logs: Map<number, DayLog>
  periodDays: number[]
  tempShift: TempShift | null
  mucusPeak: MucusPeak | null
  lhPositiveDays: number[]
  firstMucusDay: number | null
  /** Last pre-ovulatory green cycle day (0 = none). */
  preOvGreenUntil: number
  preOvRule: string
  /** First fully green luteal cycle day, null while unconfirmed. */
  postOvGreenFrom: number | null
  postOvRule: string
  ovulationDay: number | null
  lutealLength: number | null
}

export interface DayAssessment {
  date: string
  cycleDay: number | null
  cycleIndex: number | null
  light: Light
  kind: Kind
  phase: Phase
  isPeriod: boolean
  /** Confirmation day: red during the day, green from the evening. */
  greenFromEvening: boolean
  reason: string
  log?: DayLog
}

export interface Stats {
  completedCycles: number
  confirmedCycles: number
  medianCycleLength: number | null
  shortestCycle: number | null
  longestCycle: number | null
  medianLutealLength: number | null
  earliestFirstHighDay: number | null
  medianFirstHighDay: number | null
}

export interface Prompt {
  id: 'temp' | 'mucus' | 'period' | 'first-cycle'
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
  confidence: 'high' | 'medium' | 'low'
  greenFromEvening: boolean
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
}

const PEAK_MUCUS: ReadonlySet<Mucus> = new Set<Mucus>(['watery', 'eggwhite'])
const isPeriodFlow = (log?: DayLog) => !!log?.flow && log.flow !== 'spotting'
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

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
    return {
      index: i,
      start,
      end,
      length: end ? daysBetween(start, end) + 1 : null,
      complete: !!end,
      logs: byDay,
      periodDays: [...byDay.entries()].filter(([, l]) => isPeriodFlow(l)).map(([d]) => d),
      tempShift: null,
      mucusPeak: null,
      lhPositiveDays: [...byDay.entries()].filter(([, l]) => l.lh === 'positive').map(([d]) => d),
      firstMucusDay: null,
      preOvGreenUntil: 0,
      preOvRule: '',
      postOvGreenFrom: null,
      postOvRule: '',
      ovulationDay: null,
      lutealLength: null,
    }
  })
}

/* ----------------------------------------------------------- temperature */

/** temps[i] is the valid reading for cycle day i+1, or null when missing/disturbed. */
export function detectTempShift(temps: (number | null)[]): TempShift | null {
  const valid: number[] = []
  temps.forEach((t, i) => {
    if (t != null) valid.push(i)
  })
  const EPS = 1e-6
  for (let k = 6; k < valid.length; k++) {
    const i = valid[k]
    const coverline = Math.max(...valid.slice(k - 6, k).map((j) => temps[j] as number))
    if ((temps[i] as number) <= coverline + EPS) continue

    let highs = 1
    let dropUsed = false
    let confirmed: number | null = null
    let failed = false
    for (let m = k + 1; m < valid.length; m++) {
      const t = temps[valid[m]] as number
      if (t > coverline + EPS) {
        highs++
        if (highs === 3) {
          if (t >= coverline + TEMP_SHIFT_DELTA - EPS) {
            confirmed = valid[m]
            break
          }
          if (dropUsed) {
            failed = true
            break
          }
        } else if (highs === 4) {
          confirmed = valid[m]
          break
        }
      } else if (!dropUsed && highs < 3) {
        dropUsed = true
      } else {
        failed = true
        break
      }
    }
    if (failed) continue
    return {
      coverline: Math.round(coverline * 100) / 100,
      firstHighDay: i + 1,
      confirmedDay: confirmed == null ? null : confirmed + 1,
      highsSoFar: highs,
    }
  }
  return null
}

/* ----------------------------------------------------------------- mucus */

export function detectMucusPeak(mucus: (Mucus | null)[], tempConfirmedDay: number | null): MucusPeak | null {
  let peak = -1
  mucus.forEach((m, i) => {
    if (m && PEAK_MUCUS.has(m) && (tempConfirmedDay == null || i + 1 <= tempConfirmedDay)) peak = i
  })
  if (peak < 0) return null
  let daysAfter = 0
  for (let j = peak + 1; j <= peak + 3; j++) {
    const m = mucus[j]
    if (!m || PEAK_MUCUS.has(m)) break
    daysAfter++
  }
  return { peakDay: peak + 1, confirmedDay: daysAfter === 3 ? peak + 4 : null, daysAfterPeak: daysAfter }
}

/* ------------------------------------------------------ pre-ovulatory rule */

interface PreOvLimit {
  limit: number
  rule: string
}

/** Sensiplan 5-day / Minus-8 / Minus-20 rules, given confirmed first-high days and completed cycle lengths. */
export function preOvLimit(firstHighDays: number[], cycleLengths: number[]): PreOvLimit {
  let limit = 5
  let rule = '5-day rule'
  const recent = firstHighDays.slice(-12)
  if (recent.length) {
    const earliest = Math.min(...recent)
    if (recent.length >= 12) {
      limit = earliest - 8
      rule = `Minus-8 rule: earliest rise on day ${earliest} across 12 cycles`
    } else if (earliest - 8 < limit) {
      limit = earliest - 8
      rule = `Minus-8 rule: an early rise on day ${earliest} was seen`
    }
  }
  if (cycleLengths.length) {
    const shortest = Math.min(...cycleLengths)
    if (shortest - 20 < limit) {
      limit = shortest - 20
      rule = `Minus-20 rule: shortest cycle was ${shortest} days`
    }
  }
  return { limit: Math.max(0, limit), rule }
}

/* -------------------------------------------------------------- analysis */

function analyseCycle(cycle: Cycle, previous: Cycle[], settings: Settings, today: string): void {
  const lastDay = cycle.end ?? (today > cycle.start ? today : cycle.start)
  const n = daysBetween(cycle.start, lastDay) + 1
  const temps: (number | null)[] = []
  const mucus: (Mucus | null)[] = []
  for (let d = 1; d <= n; d++) {
    const l = cycle.logs.get(d)
    temps.push(l?.temp != null && !l.tempDisturbed ? l.temp : null)
    mucus.push(l?.mucus ?? null)
    if (cycle.firstMucusDay == null && l?.mucus && l.mucus !== 'dry') cycle.firstMucusDay = d
  }

  cycle.tempShift = detectTempShift(temps)
  cycle.mucusPeak = detectMucusPeak(mucus, cycle.tempShift?.confirmedDay ?? null)

  // ---- pre-ovulatory phase
  const prev = previous[previous.length - 1]
  const completed = previous.filter((c) => c.complete)
  if (settings.caution === 'strict') {
    cycle.preOvGreenUntil = 0
    cycle.preOvRule = 'Strict mode: no green days before ovulation is confirmed.'
  } else if (!prev) {
    cycle.preOvGreenUntil = 0
    cycle.preOvRule = 'First tracked cycle: no ovulation has been confirmed yet, so the early cycle stays red.'
  } else if (prev.tempShift?.confirmedDay == null) {
    cycle.preOvGreenUntil = 0
    cycle.preOvRule = 'The previous cycle had no confirmed temperature shift, so the early cycle stays red.'
  } else {
    let { limit, rule } = preOvLimit(
      completed.filter((c) => c.tempShift?.confirmedDay != null).map((c) => c.tempShift!.firstHighDay),
      completed.map((c) => c.length as number),
    )
    if (cycle.firstMucusDay != null && cycle.firstMucusDay - 1 < limit) {
      limit = cycle.firstMucusDay - 1
      rule = `mucus was observed on day ${cycle.firstMucusDay}`
    }
    cycle.preOvGreenUntil = limit
    cycle.preOvRule = limit > 0 ? `Days 1–${limit} are green (${rule}).` : `No early green days (${rule}).`
  }

  // ---- post-ovulatory phase
  const t = cycle.tempShift?.confirmedDay ?? null
  const m = cycle.mucusPeak?.confirmedDay ?? null
  let from: number | null = null
  let rule: string
  if (t == null) {
    rule = cycle.tempShift
      ? `Temperature rise started on day ${cycle.tempShift.firstHighDay}; ${plural(3 - cycle.tempShift.highsSoFar, 'more high reading')} needed.`
      : 'No temperature shift confirmed yet.'
  } else if (settings.trackMucus) {
    if (m == null) {
      rule = cycle.mucusPeak
        ? `Temperature confirmed on day ${t}; waiting for ${plural(3 - cycle.mucusPeak.daysAfterPeak, 'more drier day')} after the mucus peak (day ${cycle.mucusPeak.peakDay}).`
        : `Temperature confirmed on day ${t}, but no mucus peak has been logged to double-check it.`
    } else {
      from = Math.max(t, m) + 1
      rule = `Temperature shift confirmed on day ${t}, mucus peak +3 on day ${m}.`
    }
  } else {
    from = t + 2
    rule = `Temperature shift confirmed on day ${t}, plus one buffer day (temperature-only).`
  }
  if (from != null && cycle.lhPositiveDays.length) {
    const lhFrom = Math.max(...cycle.lhPositiveDays) + 4
    if (lhFrom > from) {
      from = lhFrom
      rule += ` Extended for the positive LH test on day ${lhFrom - 4}.`
    }
  }
  if (from != null && settings.trackMucus && cycle.mucusPeak) {
    let lastFertileMucus = -1
    mucus.forEach((muc, i) => {
      if (muc && PEAK_MUCUS.has(muc)) lastFertileMucus = i + 1
    })
    if (lastFertileMucus > cycle.mucusPeak.peakDay) {
      const mucusFrom = lastFertileMucus + 4
      if (mucusFrom > from) {
        from = mucusFrom
        rule += ` New fertile mucus on day ${lastFertileMucus} needs three more drier days.`
      }
    }
  }
  cycle.postOvGreenFrom = from
  cycle.postOvRule = rule
  cycle.ovulationDay = cycle.tempShift ? cycle.tempShift.firstHighDay - 1 : null
  cycle.lutealLength = cycle.complete && cycle.ovulationDay ? (cycle.length as number) - cycle.ovulationDay : null
}

export function computeStats(cycles: Cycle[]): Stats {
  const completed = cycles.filter((c) => c.complete)
  const confirmed = cycles.filter((c) => c.tempShift?.confirmedDay != null)
  const recentConfirmed = confirmed.slice(-12)
  const lengths = completed.map((c) => c.length as number)
  return {
    completedCycles: completed.length,
    confirmedCycles: confirmed.length,
    medianCycleLength: median(lengths.slice(-6)),
    shortestCycle: lengths.length ? Math.min(...lengths) : null,
    longestCycle: lengths.length ? Math.max(...lengths) : null,
    medianLutealLength: median(completed.map((c) => c.lutealLength).filter((x): x is number => x != null).slice(-6)),
    earliestFirstHighDay: recentConfirmed.length ? Math.min(...recentConfirmed.map((c) => c.tempShift!.firstHighDay)) : null,
    medianFirstHighDay: median(recentConfirmed.slice(-6).map((c) => c.tempShift!.firstHighDay)),
  }
}

/* ------------------------------------------------------------ assessment */

function assessKnownDay(cycle: Cycle, cycleDay: number, date: string): DayAssessment {
  const log = cycle.logs.get(cycleDay)
  const isPeriod = isPeriodFlow(log)
  const base = { date, cycleDay, cycleIndex: cycle.index, kind: 'confirmed' as Kind, isPeriod, log, greenFromEvening: false }
  const lhRed = cycle.lhPositiveDays.some((d) => cycleDay >= d && cycleDay <= d + 3)
  if (lhRed) {
    const lhDay = Math.max(...cycle.lhPositiveDays.filter((d) => cycleDay >= d && cycleDay <= d + 3))
    return { ...base, light: 'red', phase: isPeriod ? 'menstrual' : 'fertile', reason: `Positive LH test on day ${lhDay} — red for three days.` }
  }
  if (cycleDay <= cycle.preOvGreenUntil) {
    return { ...base, light: 'green', phase: isPeriod ? 'menstrual' : 'follicular', reason: cycle.preOvRule }
  }
  if (cycle.postOvGreenFrom != null && cycleDay >= cycle.postOvGreenFrom) {
    return { ...base, light: 'green', phase: 'luteal', reason: cycle.postOvRule }
  }
  const greenFromEvening = cycle.postOvGreenFrom != null && cycleDay === cycle.postOvGreenFrom - 1
  let reason: string
  if (greenFromEvening) reason = `Confirmation day — green from this evening. ${cycle.postOvRule}`
  else if (cycle.postOvGreenFrom != null) reason = `Fertile window. ${cycle.postOvRule}`
  else if (cycle.preOvGreenUntil === 0 && cycle.tempShift == null) reason = `${cycle.preOvRule} ${cycle.postOvRule}`
  else reason = `Fertile window. ${cycle.postOvRule}`
  return { ...base, light: 'red', phase: isPeriod ? 'menstrual' : 'fertile', greenFromEvening, reason }
}

interface Projection {
  length: number
  firstHighDay: number
  greenFrom: number
  preOvUntil: number
  lhPositiveDays: number[]
}

function projectCycle(cycle: Cycle | null, stats: Stats, settings: Settings, todayCycleDay: number | null): Projection {
  const typicalLength = stats.medianCycleLength ?? settings.typicalCycleLength
  const luteal = stats.medianLutealLength ?? DEFAULT_LUTEAL
  let firstHighDay = stats.medianFirstHighDay ?? Math.max(8, typicalLength - luteal + 1)
  if (cycle?.tempShift) firstHighDay = cycle.tempShift.firstHighDay
  else if (todayCycleDay != null && todayCycleDay >= firstHighDay) firstHighDay = todayCycleDay + 1

  let greenFrom = firstHighDay + 2 + (settings.trackMucus ? 1 : 2)
  if (cycle?.postOvGreenFrom != null) greenFrom = cycle.postOvGreenFrom
  else if (todayCycleDay != null) greenFrom = Math.max(greenFrom, todayCycleDay + 2)

  let length = Math.max(typicalLength, firstHighDay - 1 + luteal, greenFrom + 2)
  if (todayCycleDay != null && todayCycleDay >= length) length = todayCycleDay + 1
  return { length, firstHighDay, greenFrom, preOvUntil: cycle?.preOvGreenUntil ?? 0, lhPositiveDays: cycle?.lhPositiveDays ?? [] }
}

function assessPredictedDay(date: string, cycleDay: number, cycleIndex: number | null, proj: Projection, settings: Settings): DayAssessment {
  const isNextCycle = cycleIndex == null
  const base = { date, cycleDay, cycleIndex, kind: 'predicted' as Kind, isPeriod: isNextCycle && cycleDay <= 5, greenFromEvening: false }
  const lhRed = proj.lhPositiveDays.some((d) => cycleDay >= d && cycleDay <= d + 3)
  if (lhRed) {
    return { ...base, light: 'red', phase: base.isPeriod ? 'menstrual' : 'fertile', reason: 'Positive LH test — red for three days.' }
  }
  if (cycleDay <= proj.preOvUntil) {
    return {
      ...base,
      light: 'green',
      phase: base.isPeriod ? 'menstrual' : 'follicular',
      reason: 'Predicted early-cycle green day. Any mucus observation will turn it red.',
    }
  }
  if (cycleDay >= proj.greenFrom) {
    return { ...base, light: 'green', phase: 'luteal', reason: `Predicted green: ovulation should be confirmed by day ${proj.greenFrom - 1}.` }
  }
  return {
    ...base,
    light: 'red',
    phase: base.isPeriod ? 'menstrual' : 'fertile',
    reason: base.isPeriod
      ? 'Predicted period. Red until ovulation has been confirmed in the cycle before.'
      : `Predicted fertile window: temperature rise expected around day ${proj.firstHighDay}${settings.trackMucus ? ' with the mucus peak to be confirmed' : ''}.`,
  }
}

/* ---------------------------------------------------------------- today */

function buildToday(
  date: string,
  days: Map<string, DayAssessment>,
  current: Cycle | null,
  settings: Settings,
  stats: Stats,
  predictedPeriodStart: string | null,
): TodayStatus {
  const a = days.get(date)
  const prompts: Prompt[] = []
  const log = current?.logs.get(a?.cycleDay ?? -1)
  if (current) {
    if (log?.temp == null) prompts.push({ id: 'temp', text: 'Log this morning’s temperature' })
    if (settings.trackMucus && !log?.mucus) prompts.push({ id: 'mucus', text: 'Log cervical mucus this evening' })
    if (predictedPeriodStart && Math.abs(daysBetween(date, predictedPeriodStart)) <= 2 && !log?.flow) {
      prompts.push({ id: 'period', text: 'Period expected — log bleeding when it starts' })
    }
    if (stats.confirmedCycles === 0) prompts.push({ id: 'first-cycle', text: 'First cycle: expect more red days while Greenlight learns the pattern' })
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
      action: 'Treat every day as fertile until then.',
      confidence: 'low',
      greenFromEvening: false,
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
  let confidence: TodayStatus['confidence'] = 'high'
  if (green && a.phase !== 'luteal') confidence = 'medium'
  if (a.kind === 'predicted') confidence = 'low'

  return {
    date,
    light: a.light,
    kind: a.kind,
    phase: a.phase,
    cycleDay: a.cycleDay,
    headline: green ? 'Green day' : a.greenFromEvening ? 'Red day — green tonight' : 'Red day',
    detail: a.reason,
    action: green ? 'Unprotected sex is low-risk today.' : a.greenFromEvening ? 'Use protection until this evening.' : 'Use a condom or skip sex today.',
    confidence,
    greenFromEvening: a.greenFromEvening,
    nextChange,
    prompts,
  }
}

/* ----------------------------------------------------------------- main */

export function analyse(logs: DayLog[], settings: Settings, today: string): Analysis {
  const cycles = splitCycles(logs, today)
  cycles.forEach((c, i) => analyseCycle(c, cycles.slice(0, i), settings, today))
  const stats = computeStats(cycles)
  const days = new Map<string, DayAssessment>()
  const current = cycles.length ? cycles[cycles.length - 1] : null

  for (const c of cycles) {
    const last = c.end ?? today
    for (let d = c.start; d <= last; d = addDays(d, 1)) {
      days.set(d, assessKnownDay(c, daysBetween(c.start, d) + 1, d))
    }
  }

  let predictedPeriodStart: string | null = null
  let predictedOvulation: string | null = null
  if (current) {
    const todayCycleDay = daysBetween(current.start, today) + 1
    const proj = projectCycle(current, stats, settings, todayCycleDay)
    predictedPeriodStart = addDays(current.start, proj.length)
    predictedOvulation = addDays(current.start, proj.firstHighDay - 2)

    const nextProj = projectCycle(null, stats, settings, null)
    const nextConfirmed = current.tempShift?.confirmedDay != null
    nextProj.preOvUntil =
      nextConfirmed && settings.caution !== 'strict'
        ? preOvLimit(
            cycles.filter((c) => c.tempShift?.confirmedDay != null).map((c) => c.tempShift!.firstHighDay),
            cycles.filter((c) => c.complete).map((c) => c.length as number),
          ).limit
        : 0

    const horizon = addDays(today, PREDICTION_HORIZON_DAYS)
    for (let d = addDays(today, 1); d <= horizon; d = addDays(d, 1)) {
      const cd = daysBetween(current.start, d) + 1
      if (cd <= proj.length) {
        days.set(d, assessPredictedDay(d, cd, current.index, proj, settings))
      } else {
        const ncd = daysBetween(predictedPeriodStart, d) + 1
        if (ncd > nextProj.length) break
        days.set(d, assessPredictedDay(d, ncd, null, nextProj, settings))
      }
    }
  }

  const todayStatus = buildToday(today, days, current, settings, stats, predictedPeriodStart)
  return { cycles, current, stats, days, today: todayStatus, predictedPeriodStart, predictedOvulation }
}

export const cToF = (c: number) => Math.round((c * 1.8 + 32) * 100) / 100
export const fToC = (f: number) => Math.round(((f - 32) / 1.8) * 100) / 100

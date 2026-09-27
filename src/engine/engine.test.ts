import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { buildDemoLogs } from './demo'
import { analyse, detectMucusPeak, detectTempShift, preOvLimit, splitCycles } from './engine'
import { DEFAULT_SETTINGS, type DayLog, type Mucus, type Settings } from './types'

const low = [36.3, 36.35, 36.4, 36.3, 36.25, 36.35] // coverline 36.4

describe('detectTempShift', () => {
  it('confirms a standard 3-over-6 rise with the third reading ≥ 0.2 above', () => {
    const r = detectTempShift([...low, 36.55, 36.6, 36.65])
    expect(r).toMatchObject({ coverline: 36.4, firstHighDay: 7, confirmedDay: 9 })
  })

  it('needs a 4th higher reading when the third is < 0.2 above (exception 1)', () => {
    const notYet = detectTempShift([...low, 36.5, 36.55, 36.55])
    expect(notYet).toMatchObject({ firstHighDay: 7, confirmedDay: null })
    const done = detectTempShift([...low, 36.5, 36.55, 36.55, 36.45])
    expect(done).toMatchObject({ firstHighDay: 7, confirmedDay: 10 })
  })

  it('tolerates one dip to the coverline among the first three (exception 2)', () => {
    const r = detectTempShift([...low, 36.55, 36.4, 36.6, 36.65])
    expect(r).toMatchObject({ firstHighDay: 7, confirmedDay: 10 })
  })

  it('does not combine both exceptions', () => {
    // dip used, third high only just above → this candidate fails; no later candidate confirms
    const r = detectTempShift([...low, 36.55, 36.4, 36.5, 36.5])
    expect(r?.confirmedDay ?? null).toBeNull()
  })

  it('skips disturbed/missing readings and rejects false starts', () => {
    const r = detectTempShift([...low, 36.5, 36.3, 36.3, 36.35, null, 36.6, 36.65, 36.7])
    expect(r).toMatchObject({ coverline: 36.5, firstHighDay: 12, confirmedDay: 14 })
  })

  it('returns null with fewer than 6 preceding readings', () => {
    expect(detectTempShift([36.3, 36.3, 36.3, 36.6, 36.7, 36.8])).toBeNull()
  })
})

describe('detectMucusPeak', () => {
  const m = (...xs: (Mucus | null)[]) => xs
  it('confirms peak +3 with drier days', () => {
    expect(detectMucusPeak(m('dry', 'sticky', 'creamy', 'eggwhite', 'creamy', 'sticky', 'dry'), null)).toMatchObject({ peakDay: 4, confirmedDay: 7 })
  })
  it('does not confirm when a follow-up day is missing or fertile again', () => {
    expect(detectMucusPeak(m('dry', 'eggwhite', 'creamy', null, 'dry'), null)?.confirmedDay).toBeNull()
    expect(detectMucusPeak(m('dry', 'eggwhite', 'creamy', 'watery', 'dry'), null)).toMatchObject({ peakDay: 4, confirmedDay: null })
  })
  it('ignores fertile-looking mucus after the temperature confirmation', () => {
    expect(detectMucusPeak(m('eggwhite', 'sticky', 'dry', 'dry', 'dry', 'watery'), 4)).toMatchObject({ peakDay: 1, confirmedDay: 4 })
  })
})

describe('preOvLimit', () => {
  it('uses the 5-day rule by default', () => {
    expect(preOvLimit([15, 16], [28, 29]).limit).toBe(5)
  })
  it('applies Minus-8 immediately when an early rise was seen', () => {
    expect(preOvLimit([12, 16], [28, 29])).toMatchObject({ limit: 4 })
  })
  it('applies Minus-20 for short cycles', () => {
    expect(preOvLimit([15], [24, 28])).toMatchObject({ limit: 4 })
  })
  it('extends beyond day 5 only with 12 confirmed cycles', () => {
    expect(preOvLimit(Array(12).fill(16), Array(12).fill(29)).limit).toBe(8)
    expect(preOvLimit(Array(11).fill(16), Array(11).fill(29)).limit).toBe(5)
  })
})

const START = '2026-06-01'
const mk = (dayOffset: number, patch: Partial<DayLog>): DayLog => ({ date: addDays(START, dayOffset), updatedAt: 0, ...patch })

describe('splitCycles', () => {
  it('starts a new cycle only after a 15-day gap and ignores spotting', () => {
    const logs = [mk(0, { flow: 'medium' }), mk(1, { flow: 'light' }), mk(6, { flow: 'light' }), mk(14, { flow: 'spotting' }), mk(28, { flow: 'heavy' })]
    const cycles = splitCycles(logs, addDays(START, 30))
    expect(cycles.map((c) => c.start)).toEqual([START, addDays(START, 28)])
    expect(cycles[0].length).toBe(28)
    expect(cycles[1].complete).toBe(false)
  })
})

describe('analyse — conservative behaviour', () => {
  it('first cycle: red until the double-check, green afterwards', () => {
    const logs: DayLog[] = [mk(0, { flow: 'medium' })]
    for (let d = 1; d <= 20; d++) {
      const temp = d <= 14 ? 36.3 + (d % 3) * 0.05 : 36.65
      const mucus: Mucus = d >= 11 && d <= 13 ? 'eggwhite' : d >= 14 && d <= 16 ? 'sticky' : 'dry'
      logs.push(mk(d - 1, { temp, mucus }))
    }
    const a = analyse(logs, DEFAULT_SETTINGS, addDays(START, 19))
    const c = a.current!
    expect(c.preOvGreenUntil).toBe(0)
    expect(c.tempShift).toMatchObject({ firstHighDay: 15, confirmedDay: 17 })
    expect(c.mucusPeak).toMatchObject({ peakDay: 13, confirmedDay: 16 })
    expect(c.postOvGreenFrom).toBe(18)
    expect(a.days.get(addDays(START, 16))!.light).toBe('red') // day 17: confirmation day
    expect(a.days.get(addDays(START, 16))!.greenFromEvening).toBe(true)
    expect(a.days.get(addDays(START, 17))!.light).toBe('green')
    expect(a.today.light).toBe('green')
    expect(a.today.confidence).toBe('high')
  })

  it('temperature-only mode waits an extra buffer day', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, trackMucus: false }
    const logs: DayLog[] = [mk(0, { flow: 'medium' })]
    for (let d = 1; d <= 20; d++) logs.push(mk(d - 1, { temp: d <= 14 ? 36.3 : 36.65 }))
    const a = analyse(logs, settings, addDays(START, 19))
    expect(a.current!.postOvGreenFrom).toBe(19)
  })

  it('a positive LH test keeps days red for three days after', () => {
    const logs: DayLog[] = [mk(0, { flow: 'medium' })]
    for (let d = 1; d <= 20; d++) logs.push(mk(d - 1, { temp: d <= 14 ? 36.3 : 36.65, lh: d === 17 ? 'positive' : undefined }))
    const a = analyse(logs, { ...DEFAULT_SETTINGS, trackMucus: false }, addDays(START, 19))
    expect(a.current!.postOvGreenFrom).toBe(21)
  })

  it('a positive LH test during early green days turns those days red', () => {
    const today = '2026-09-20'
    const logs = buildDemoLogs(today, 11)
    const c = analyse(logs, DEFAULT_SETTINGS, today).current!
    expect(c.preOvGreenUntil).toBe(5)
    const lhDay = 1
    logs.push({ date: addDays(c.start, lhDay - 1), updatedAt: 0, lh: 'positive' })
    const a = analyse(logs, DEFAULT_SETTINGS, today)
    for (let d = lhDay; d <= lhDay + 3; d++) {
      expect(a.days.get(addDays(c.start, d - 1))!.light, `day ${d}`).toBe('red')
    }
    expect(a.days.get(addDays(c.start, lhDay + 3))!.light).toBe('green') // day 5: back inside the early window
  })

  it('fertile mucus after temp confirmation delays luteal green by three drier days', () => {
    const logs: DayLog[] = [mk(0, { flow: 'medium' })]
    for (let d = 1; d <= 25; d++) {
      const temp = d <= 14 ? 36.3 + (d % 3) * 0.05 : 36.65
      const mucus: Mucus = d >= 11 && d <= 13 ? 'eggwhite' : d === 20 ? 'watery' : 'dry'
      logs.push(mk(d - 1, { temp, mucus }))
    }
    const a = analyse(logs, DEFAULT_SETTINGS, addDays(START, 24))
    const c = a.current!
    expect(c.tempShift).toMatchObject({ confirmedDay: 17 })
    expect(c.postOvGreenFrom).toBe(24) // watery day 20 + 3 drier days + evening rule
    expect(a.days.get(addDays(START, 18))!.light).toBe('red')
    expect(a.days.get(addDays(START, 23))!.light).toBe('green')
  })

  it('demo history: early-cycle green days appear once the previous cycle confirmed ovulation, and stop at the first mucus', () => {
    const today = '2026-09-20'
    const a = analyse(buildDemoLogs(today, 11), DEFAULT_SETTINGS, today)
    expect(a.stats.completedCycles).toBe(4)
    expect(a.stats.confirmedCycles).toBeGreaterThanOrEqual(4)
    const c = a.current!
    expect(c.preOvGreenUntil).toBeGreaterThan(0)
    expect(c.preOvGreenUntil).toBeLessThanOrEqual(5)
    expect(a.days.get(c.start)!.light).toBe('green')
    expect(a.today.light).toBe('red')
    expect(a.today.nextChange?.light).toBe('green')
    expect(a.predictedPeriodStart).toBeTruthy()
  })

  it('strict caution removes all pre-ovulatory green days', () => {
    const today = '2026-09-20'
    const a = analyse(buildDemoLogs(today, 3), { ...DEFAULT_SETTINGS, caution: 'strict' }, today)
    expect(a.current!.preOvGreenUntil).toBe(0)
    expect(a.today.light).toBe('red')
  })

  it('an unconfirmed previous cycle disables early green days in the next one', () => {
    const logs: DayLog[] = [mk(0, { flow: 'medium' }), mk(28, { flow: 'medium' })]
    for (let d = 1; d <= 28; d++) logs.push(mk(d - 1, { temp: 36.3 }))
    const a = analyse(logs, DEFAULT_SETTINGS, addDays(START, 30))
    expect(a.current!.preOvGreenUntil).toBe(0)
    expect(a.today.light).toBe('red')
  })

  it('predicts the next period and a red fertile window ahead', () => {
    const today = '2026-09-20'
    const a = analyse(buildDemoLogs(today, 7), DEFAULT_SETTINGS, today)
    const future = [...a.days.values()].filter((d) => d.date > today)
    expect(future.length).toBeGreaterThan(30)
    expect(future.some((d) => d.light === 'red' && d.kind === 'predicted')).toBe(true)
    expect(future.some((d) => d.light === 'green' && d.phase === 'luteal')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { buildDemoLogs } from './demo'
import { analyse } from './engine'
import { computeWins } from './streaks'
import { DEFAULT_SETTINGS, type DayLog } from './types'

const T0 = '2026-01-01'
const period = (start: string): DayLog[] => Array.from({ length: 4 }, (_, i) => ({ date: addDays(start, i), flow: 'medium' as const, updatedAt: 0 }))

describe('computeWins', () => {
  it('counts days since tracking began as the streak', () => {
    const logs = period(T0)
    const wins = computeWins(analyse(logs, DEFAULT_SETTINGS, addDays(T0, 9)), addDays(T0, 9))
    expect(wins.streak).toBe(10)
    expect(wins.victories).toBe(0)
  })

  it('resets the streak after unprotected sex on a careful day but keeps the best', () => {
    const logs = [...period(T0), { date: addDays(T0, 11), sex: 'unprotected' as const, updatedAt: 0 }]
    const today = addDays(T0, 14)
    const wins = computeWins(analyse(logs, DEFAULT_SETTINGS, today), today)
    expect(wins.streak).toBe(3)
    expect(wins.bestStreak).toBe(11)
  })

  it('does not break the streak for protected sex, and counts it', () => {
    const logs = [...period(T0), { date: addDays(T0, 11), sex: 'protected' as const, updatedAt: 0 }]
    const today = addDays(T0, 14)
    const wins = computeWins(analyse(logs, DEFAULT_SETTINGS, today), today)
    expect(wins.streak).toBe(15)
    expect(wins.protectedCareful).toBe(1)
  })

  it('celebrates a fresh victory at the start of a new cycle', () => {
    const logs = [...period(T0), ...period(addDays(T0, 28))]
    const today = addDays(T0, 29)
    const wins = computeWins(analyse(logs, DEFAULT_SETTINGS, today), today)
    expect(wins).toMatchObject({ victories: 1, freshVictory: true })
    expect(wins.badges.find((b) => b.id === 'first-win')?.earned).toBe(true)
  })

  it('demo data has four victories', () => {
    const today = '2026-06-15'
    const wins = computeWins(analyse(buildDemoLogs(today), DEFAULT_SETTINGS, today), today)
    expect(wins.victories).toBe(4)
    expect(wins.badges.find((b) => b.id === 'triple')?.earned).toBe(true)
  })
})

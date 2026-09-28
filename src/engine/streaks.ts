import { addDays, daysBetween } from './dates'
import type { Analysis } from './engine'

export interface Badge {
  id: string
  title: string
  detail: string
  earned: boolean
}

export interface Wins {
  /** Consecutive tracked days, ending today, without unprotected sex on a careful day. */
  streak: number
  bestStreak: number
  /** Completed cycles — each one ended with a period, i.e. no pregnancy. */
  victories: number
  /** Careful days where she chose protection. */
  protectedCareful: number
  /** True in the first days of a new cycle that followed a completed one. */
  freshVictory: boolean
  badges: Badge[]
}

const isRisky = (a: Analysis, date: string) => {
  const d = a.days.get(date)
  return d?.kind === 'confirmed' && d.light === 'red' && d.log?.sex === 'unprotected'
}

export function computeWins(a: Analysis, today: string): Wins {
  const first = a.cycles[0]?.start
  let streak = 0
  let bestStreak = 0
  let protectedCareful = 0
  if (first && first <= today) {
    let run = 0
    for (let d = first; d <= today; d = addDays(d, 1)) {
      const day = a.days.get(d)
      if (day?.light === 'red' && day.log?.sex === 'protected') protectedCareful++
      run = isRisky(a, d) ? 0 : run + 1
      bestStreak = Math.max(bestStreak, run)
    }
    streak = run
  }
  const victories = a.stats.completedCycles
  const freshVictory = victories > 0 && !!a.current && daysBetween(a.current.start, today) < 5

  const badges: Badge[] = [
    { id: 'first-week', title: 'Glow week', detail: '7 carefree days in a row', earned: bestStreak >= 7 },
    { id: 'first-win', title: 'First victory', detail: 'A whole cycle on your terms', earned: victories >= 1 },
    { id: 'prepared', title: 'Always ready', detail: 'Chose protection on 3 careful days', earned: protectedCareful >= 3 },
    { id: 'month', title: 'Queen of the month', detail: '30-day streak', earned: bestStreak >= 30 },
    { id: 'triple', title: 'Triple crown', detail: '3 victories', earned: victories >= 3 },
    { id: 'season', title: 'Unstoppable', detail: '90-day streak', earned: bestStreak >= 90 },
  ]
  return { streak, bestStreak, victories, protectedCareful, freshVictory, badges }
}

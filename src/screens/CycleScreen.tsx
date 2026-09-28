import type { ReactNode } from 'react'
import { Award, Flame, Lock, Trophy } from 'lucide-react'
import { Illustration } from '../components/Illustrations'
import { Card, SectionTitle, cx } from '../components/ui'
import { computeWins } from '../engine/streaks'
import { addDays, daysBetween } from '../engine/dates'
import type { Analysis, Cycle } from '../engine/engine'
import { fertileWindow } from '../engine/engine'
import type { DayLog } from '../engine/types'
import { useStore } from '../lib/store'
import { fmtDay, fmtShort } from '../lib/format'

export function CycleScreen() {
  const { analysis, today, state } = useStore()
  if (!analysis || !state) return null
  const current = analysis.current
  const past = analysis.cycles.filter((c) => c.complete).reverse()
  const wins = computeWins(analysis, today)

  return (
    <div className="rise flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="display text-[28px] font-semibold leading-tight">Your wins</h1>
        <p className="mt-1 text-[14px] text-ink-2">Every cycle you live on your own terms is a victory. Look at you go.</p>
      </header>

      <section className="card overflow-hidden p-0">
        <Illustration scene="victory" className="block h-auto w-full" />
        <div className="grid grid-cols-3 divide-x divide-line p-4 text-center">
          <Stat icon={<Flame size={16} />} value={wins.streak} label="Day streak" />
          <Stat icon={<Trophy size={16} />} value={wins.victories} label="Victories" />
          <Stat icon={<Award size={16} />} value={wins.bestStreak} label="Best streak" />
        </div>
      </section>

      <section>
        <SectionTitle>Badges</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {wins.badges.map((b) => (
            <Card key={b.id} className={cx('flex items-start gap-3 p-3.5', !b.earned && 'opacity-55')}>
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', b.earned ? 'bg-go text-white' : 'bg-line text-muted')}>
                {b.earned ? <Award size={17} /> : <Lock size={15} />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold leading-tight">{b.title}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted">{b.detail}</span>
              </span>
            </Card>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12px] leading-snug text-muted">
          Your streak counts every day without unprotected sex on a careful day. If it ever resets, be gentle with yourself — just start again.
        </p>
      </section>

      <h2 className="display -mb-2 text-[20px] font-semibold">Your rhythm</h2>

      {current ? (
        <CurrentCycle analysis={analysis} cycle={current} today={today} />
      ) : (
        <Card className="text-[14px] text-muted">Log the first day of your period to see your rhythm.</Card>
      )}

      {past.length > 0 && (
        <section>
          <SectionTitle>Past cycles</SectionTitle>
          <Card className="flex flex-col gap-4">
            {past.map((c) => {
              const earlier = analysis.cycles.filter((x) => x.complete && x.index < c.index).map((x) => x.length as number)
              const win = fertileWindow(earlier, state.settings.typicalCycleLength)
              return (
                <div key={c.start}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="font-semibold">{fmtShort(c.start)}</span>
                    <span className="text-muted">{c.length} days</span>
                  </div>
                  <Bars length={c.length as number} cycle={c} win={win} earlyUntil={c.preOvGreenUntil} />
                </div>
              )
            })}
          </Card>
        </section>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-[12px] text-muted">
        <Legend swatch="bg-go" label="Yes day" />
        <Legend swatch="bg-stop" label="Careful day" />
        <Legend swatch="bg-period" small label="Period" />
        <Legend swatch="bg-amber" small label="Positive LH" />
        <Legend swatch="bg-go-deep" small label="Intimacy" />
      </div>
    </div>
  )
}

function CurrentCycle({ analysis, cycle, today }: { analysis: Analysis; cycle: Cycle; today: string }) {
  const length = analysis.predictedPeriodStart ? daysBetween(cycle.start, analysis.predictedPeriodStart) : 28
  const todayDay = daysBetween(cycle.start, today) + 1
  const win = analysis.fertileWindow
  return (
    <section>
      <SectionTitle>This cycle</SectionTitle>
      <Card className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Started {fmtDay(cycle.start)}</div>
            <div className="display text-[30px] font-semibold leading-none">Day {todayDay}</div>
          </div>
          <div className="text-right text-[13px] text-ink-2">
            {win && (
              <div>
                Careful: <span className="font-semibold">days {win.start}–{win.end}</span>
              </div>
            )}
            {analysis.predictedPeriodStart && <div className="text-muted">Next period ~{fmtShort(analysis.predictedPeriodStart)}</div>}
          </div>
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length }, (_, i) => {
            const date = addDays(cycle.start, i)
            const a = analysis.days.get(date)
            const log = cycle.logs.get(i + 1)
            return (
              <div key={date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cx(
                    'h-14 w-full rounded-full',
                    a?.light === 'green' ? 'bg-go' : 'bg-stop',
                    a?.kind === 'predicted' && 'predicted-stripes opacity-60',
                    i + 1 === todayDay && 'ring-2 ring-go-deep ring-offset-2 ring-offset-paper',
                  )}
                  title={`Day ${i + 1}`}
                />
                <Marks log={log} isPeriod={!!a?.isPeriod} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-muted">
          <span>Day 1</span>
          <span>Day {length}</span>
        </div>
      </Card>
    </section>
  )
}

function Bars({ length, cycle, win, earlyUntil }: { length: number; cycle: Cycle; win: { start: number; end: number }; earlyUntil: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length }, (_, i) => {
        const d = i + 1
        const lh = cycle.lhPositiveDays.some((p) => d >= p && d <= p + 3)
        const yes = !lh && (d <= earlyUntil || d > win.end)
        const log = cycle.logs.get(d)
        return (
          <div key={d} className="flex flex-1 flex-col items-center gap-1">
            <div className={cx('h-6 w-full rounded-full', yes ? 'bg-go' : 'bg-stop')} />
            <Marks log={log} isPeriod={cycle.periodDays.includes(d)} />
          </div>
        )
      })}
    </div>
  )
}

function Marks({ log, isPeriod }: { log: DayLog | undefined; isPeriod: boolean }) {
  const dot = isPeriod ? 'bg-period' : log?.lh === 'positive' ? 'bg-amber' : log?.sex ? 'bg-go-deep' : 'bg-transparent'
  return <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
}

function Legend({ swatch, label, small }: { swatch: string; label: string; small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx('rounded-full', swatch, small ? 'h-1.5 w-1.5' : 'h-3 w-3')} />
      {label}
    </span>
  )
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-go">{icon}</span>
      <span className="display text-[24px] font-semibold leading-none">{value}</span>
      <span className="text-[11.5px] font-medium text-muted">{label}</span>
    </div>
  )
}

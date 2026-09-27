import { addMonths, endOfMonth, getDay, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, LightDot, Pill, Sheet, cx } from '../components/ui'
import { addDays, fromISO, toISO } from '../engine/dates'
import type { DayAssessment } from '../engine/engine'
import { useStore } from '../lib/store'
import { FLOW_LABEL, MUCUS_LABEL, fmtLong, fmtMonth, fmtTemp } from '../lib/format'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarScreen({ onLog }: { onLog: (date: string) => void }) {
  const { analysis, today, state } = useStore()
  const [month, setMonth] = useState(() => toISO(startOfMonth(fromISO(today))))
  const [selected, setSelected] = useState<string | null>(null)
  if (!analysis || !state) return null

  const first = fromISO(month)
  const last = endOfMonth(first)
  const leading = (getDay(first) + 6) % 7
  const cells: (string | null)[] = [...Array<null>(leading).fill(null)]
  for (let d = first; d <= last; d = fromISO(addDays(toISO(d), 1))) cells.push(toISO(d))
  while (cells.length % 7) cells.push(null)

  const sel = selected ? analysis.days.get(selected) : undefined
  const ovulationDates = new Set(analysis.cycles.filter((c) => c.ovulationDay).map((c) => addDays(c.start, (c.ovulationDay as number) - 1)))

  return (
    <div className="rise flex flex-col gap-4">
      <header className="flex items-center justify-between pt-1">
        <button onClick={() => setMonth(toISO(addMonths(first, -1)))} className="rounded-full p-2 hover:bg-ink/5" aria-label="Previous month">
          <ChevronLeft size={22} />
        </button>
        <button onClick={() => setMonth(toISO(startOfMonth(fromISO(today))))} className="display text-[22px] font-semibold">
          {fmtMonth(month)}
        </button>
        <button onClick={() => setMonth(toISO(addMonths(first, 1)))} className="rounded-full p-2 hover:bg-ink/5" aria-label="Next month">
          <ChevronRight size={22} />
        </button>
      </header>

      <Card className="p-3">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />
            const a = analysis.days.get(d)
            const isToday = d === today
            const predicted = a?.kind === 'predicted'
            const green = a?.light === 'green'
            return (
              <button key={d} onClick={() => setSelected(d)} className="group relative flex flex-col items-center py-1" aria-label={fmtLong(d)}>
                <span
                  className={cx(
                    'grid h-10 w-10 place-items-center rounded-full text-[14px] font-semibold transition group-hover:scale-105',
                    !a && 'text-muted',
                    a && green && (predicted ? 'predicted-stripes bg-go-soft text-go-deep' : 'bg-go text-white'),
                    a && !green && (predicted ? 'predicted-stripes bg-stop-soft text-stop-deep' : 'bg-stop text-white'),
                    isToday && 'ring-2 ring-ink ring-offset-2 ring-offset-paper',
                    a?.greenFromEvening && 'bg-gradient-to-br from-stop from-50% to-go to-50%',
                  )}
                >
                  {Number(d.slice(-2))}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {a?.isPeriod && <span className="h-1.5 w-1.5 rounded-full bg-period" />}
                  {ovulationDates.has(d) && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                  {a?.log?.sex && <span className={cx('h-1.5 w-1.5 rounded-full', a.log.sex === 'protected' ? 'bg-amber' : 'bg-ink/30')} />}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-[12px] text-muted">
        <Legend swatch="bg-go" label="Green" />
        <Legend swatch="bg-stop" label="Red" />
        <Legend swatch="predicted-stripes bg-go-soft border border-line" label="Predicted" />
        <Legend swatch="bg-period" small label="Period" />
        <Legend swatch="bg-ink" small label="Ovulation" />
        <Legend swatch="bg-amber" small label="Sex" />
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? fmtLong(selected) : ''}>
        {selected && <DayDetail date={selected} a={sel} unit={state.settings.tempUnit} onLog={(d) => onLog(d)} today={today} />}
      </Sheet>
    </div>
  )
}

function Legend({ swatch, label, small }: { swatch: string; label: string; small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx('rounded-full', swatch, small ? 'h-1.5 w-1.5' : 'h-3 w-3')} />
      {label}
    </span>
  )
}

function DayDetail({ date, a, unit, onLog, today }: { date: string; a: DayAssessment | undefined; unit: 'c' | 'f'; onLog: (d: string) => void; today: string }) {
  if (!a) {
    return (
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-[15px] text-ink-2">No cycle information for this day.</p>
        {date <= today && <Button onClick={() => onLog(date)}>Log this day</Button>}
      </div>
    )
  }
  const green = a.light === 'green'
  const log = a.log
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className={cx('flex items-center gap-3 rounded-2xl p-4', green ? 'bg-go-soft text-go-deep' : 'bg-stop-soft text-stop-deep')}>
        <LightDot light={a.light} size={14} predicted={a.kind === 'predicted'} />
        <div>
          <div className="display text-[22px] font-semibold leading-none">{green ? 'Green' : a.greenFromEvening ? 'Red, green tonight' : 'Red'}</div>
          <div className="mt-1 text-[13px] font-medium opacity-80">
            {a.kind === 'predicted' ? 'Predicted' : 'Confirmed'} · {a.cycleDay ? `cycle day ${a.cycleDay}` : ''}
          </div>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-2">{a.reason}</p>
      {log && (
        <div className="flex flex-wrap gap-1.5">
          {log.flow && <Pill tone="red">Flow · {FLOW_LABEL[log.flow]}</Pill>}
          {log.temp != null && (
            <Pill>
              {fmtTemp(log.temp, unit)}
              {log.tempDisturbed ? ' · disturbed' : ''}
            </Pill>
          )}
          {log.mucus && <Pill>Mucus · {MUCUS_LABEL[log.mucus]}</Pill>}
          {log.lh && <Pill>LH · {log.lh}</Pill>}
          {log.sex && <Pill tone="amber">Sex · {log.sex}</Pill>}
          {log.note && <Pill>“{log.note}”</Pill>}
        </div>
      )}
      {date <= today && (
        <Button variant="secondary" onClick={() => onLog(date)} className="inline-flex items-center justify-center gap-2">
          <PenLine size={16} /> {log ? 'Edit log' : 'Log this day'}
        </Button>
      )}
    </div>
  )
}

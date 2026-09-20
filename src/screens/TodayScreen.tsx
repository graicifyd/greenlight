import { ChevronRight, Droplets, Heart, Info, ShieldCheck, Thermometer, WifiOff } from 'lucide-react'
import { Card, LightDot, Pill, SectionTitle, cx } from '../components/ui'
import { addDays } from '../engine/dates'
import type { DayAssessment, Phase } from '../engine/engine'
import { useStore } from '../lib/store'
import { FLOW_LABEL, MUCUS_LABEL, fmtDay, fmtLong, fmtTemp, relativeDays } from '../lib/format'

const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Period',
  follicular: 'Pre-ovulation',
  fertile: 'Fertile window',
  luteal: 'After ovulation',
  unknown: 'Unknown',
}

export function TodayScreen({ onLog, onLearn, onCalendar }: { onLog: (date: string) => void; onLearn: () => void; onCalendar: () => void }) {
  const { analysis, me, partner, state, today, offline } = useStore()
  if (!analysis || !state) return null
  const t = analysis.today
  const green = t.light === 'green'
  const isPartner = me?.role === 'partner'
  const cyclingName = isPartner ? (partner?.name ?? 'your partner') : 'you'
  const current = analysis.current
  const todayLog = current?.logs.get(t.cycleDay ?? -1)

  return (
    <div className="rise flex flex-col gap-5">
      <header className="flex items-start justify-between pt-1">
        <div>
          <div className="text-[13px] font-medium text-muted">{fmtLong(today)}</div>
          <h1 className="display mt-0.5 text-[28px] font-semibold leading-tight">
            {t.cycleDay ? `Cycle day ${t.cycleDay}` : 'Welcome'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          {offline && (
            <span className="rounded-full bg-amber-soft p-1.5 text-[#8a5d0c]" title="Offline — showing cached data">
              <WifiOff size={14} />
            </span>
          )}
          <Avatars names={[me?.name ?? 'Me', partner?.name].filter((x): x is string => !!x)} />
        </div>
      </header>

      <section
        className={cx(
          'relative overflow-hidden rounded-[28px] p-6 text-white shadow-float',
          green ? 'bg-gradient-to-br from-go to-go-deep' : 'bg-gradient-to-br from-stop to-stop-deep',
        )}
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-2">
          <Pill tone="inverse">{t.kind === 'predicted' ? 'Predicted' : 'Confirmed by the rules'}</Pill>
          {t.phase !== 'unknown' && <Pill tone="inverse">{PHASE_LABEL[t.phase]}</Pill>}
        </div>
        <h2 className="display mt-5 text-[46px] font-semibold leading-[0.95]">{t.headline}</h2>
        <p className="mt-3 text-[17px] font-medium leading-snug text-white/95">{isPartner ? partnerAction(t.light, t.greenFromEvening) : t.action}</p>
        {t.nextChange && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[14px] backdrop-blur">
            <LightDot light={t.nextChange.light} size={9} />
            <span>
              {t.nextChange.light === 'green' ? 'Green' : 'Red'} {t.nextChange.kind === 'predicted' ? 'expected' : ''} {relativeDays(t.nextChange.daysAway)} ·{' '}
              {fmtDay(t.nextChange.date)}
            </span>
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <button onClick={onCalendar} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-2">
              Calendar <ChevronRight size={14} />
            </button>
          }
        >
          Next two weeks
        </SectionTitle>
        <Strip days={analysis.days} today={today} onPick={onLog} />
      </section>

      {!isPartner && t.prompts.length > 0 && (
        <section>
          <SectionTitle>Today’s checklist</SectionTitle>
          <Card className="divide-y divide-line/80 p-0">
            {t.prompts.map((p) => (
              <button key={p.id} onClick={() => onLog(today)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-cream/60">
                <span className={cx('grid h-9 w-9 place-items-center rounded-xl', p.id === 'first-cycle' ? 'bg-amber-soft text-[#8a5d0c]' : 'bg-cream text-ink-2')}>
                  {p.id === 'temp' ? <Thermometer size={18} /> : p.id === 'mucus' ? <Droplets size={18} /> : <Info size={18} />}
                </span>
                <span className="flex-1 text-[15px] leading-snug">{p.text}</span>
                {p.id !== 'first-cycle' && <ChevronRight size={16} className="text-muted" />}
              </button>
            ))}
          </Card>
        </section>
      )}

      {isPartner && (
        <section>
          <SectionTitle>How to help today</SectionTitle>
          <Card className="flex flex-col gap-3">
            {supportTips(t.light, t.nextChange, todayLog?.temp == null, partner?.name ?? 'your partner').map((tip) => (
              <div key={tip} className="flex items-start gap-3">
                <Heart size={16} className="mt-0.5 shrink-0 text-stop" />
                <span className="text-[15px] leading-snug">{tip}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>Why {green ? 'green' : 'red'} today</SectionTitle>
        <Card className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-ink-2">{t.detail}</p>
          {t.confidence === 'medium' && (
            <p className="rounded-xl bg-amber-soft px-3 py-2 text-[13px] leading-snug text-[#8a5d0c]">
              Early-cycle green days rely on past cycles, not on today’s signs. They are the least certain part of the method — sperm can survive up to 5 days.
            </p>
          )}
          {todayLog && (
            <div className="flex flex-wrap gap-1.5">
              {todayLog.temp != null && (
                <Pill>
                  <Thermometer size={12} /> {fmtTemp(todayLog.temp, state.settings.tempUnit)}
                  {todayLog.tempDisturbed && ' (disturbed)'}
                </Pill>
              )}
              {todayLog.mucus && <Pill>Mucus: {MUCUS_LABEL[todayLog.mucus]}</Pill>}
              {todayLog.flow && <Pill tone="red">Flow: {FLOW_LABEL[todayLog.flow]}</Pill>}
              {todayLog.lh && <Pill>LH {todayLog.lh}</Pill>}
            </div>
          )}
          <button onClick={onLearn} className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2">
            <ShieldCheck size={14} /> How Greenlight decides <ChevronRight size={14} />
          </button>
        </Card>
      </section>

      {current && (
        <section>
          <SectionTitle>This cycle</SectionTitle>
          <Card className="grid grid-cols-3 gap-3">
            <Metric label="Started" value={fmtDay(current.start)} />
            <Metric
              label={current.tempShift ? 'Ovulation' : 'Ovulation est.'}
              value={current.ovulationDay ? `Day ${current.ovulationDay}` : analysis.predictedOvulation ? fmtDay(analysis.predictedOvulation) : '—'}
            />
            <Metric label="Next period" value={analysis.predictedPeriodStart ? fmtDay(analysis.predictedPeriodStart) : '—'} />
          </Card>
          <p className="mt-2 px-1 text-[12px] leading-snug text-muted">
            {analysis.stats.confirmedCycles === 0
              ? `Greenlight has not confirmed an ovulation for ${cyclingName} yet. Predictions use the typical cycle length until it does.`
              : `Based on ${analysis.stats.confirmedCycles} confirmed cycle${analysis.stats.confirmedCycles === 1 ? '' : 's'} · median ${analysis.stats.medianCycleLength ?? '—'} days.`}
          </p>
        </section>
      )}
    </div>
  )
}

function partnerAction(light: 'green' | 'red', evening: boolean) {
  if (light === 'green') return 'Low-risk day for unprotected sex.'
  if (evening) return 'Fertile until this evening — use protection today.'
  return 'Fertile day — use a condom or wait.'
}

function supportTips(light: 'green' | 'red', next: { daysAway: number; light: 'green' | 'red' } | null, tempMissing: boolean, name: string) {
  const tips: string[] = []
  if (tempMissing) tips.push(`${name} hasn’t logged a temperature today — a gentle reminder helps the algorithm stay accurate.`)
  if (light === 'red') {
    tips.push('Make sure condoms are within reach; the red phase is not the time to improvise.')
    if (next?.light === 'green') tips.push(`Green ${next.daysAway === 1 ? 'is expected tomorrow' : `is expected in ${next.daysAway} days`} — as long as the readings keep confirming.`)
  } else {
    tips.push('Green means low risk, not zero. If either of you would rather be extra careful, that is always fine.')
    if (next?.light === 'red') tips.push(`Red starts ${next.daysAway === 1 ? 'tomorrow' : `in ${next.daysAway} days`}. Plan ahead.`)
  }
  return tips
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[15px] font-semibold">{value}</div>
    </div>
  )
}

function Avatars({ names }: { names: string[] }) {
  return (
    <div className="flex -space-x-2">
      {names.map((n, i) => (
        <span
          key={n + i}
          className={cx(
            'grid h-9 w-9 place-items-center rounded-full border-2 border-cream text-[13px] font-bold',
            i === 0 ? 'bg-ink text-cream' : 'bg-go-soft text-go-deep',
          )}
          title={n}
        >
          {n.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </div>
  )
}

function Strip({ days, today, onPick }: { days: Map<string, DayAssessment>; today: string; onPick: (d: string) => void }) {
  const items = Array.from({ length: 14 }, (_, i) => addDays(today, i - 1))
  return (
    <div className="card flex gap-1 overflow-x-auto no-scrollbar p-2">
      {items.map((d) => {
        const a = days.get(d)
        const isToday = d === today
        const green = a?.light === 'green'
        const predicted = a?.kind === 'predicted'
        return (
          <button
            key={d}
            onClick={() => onPick(d)}
            className={cx('flex min-w-[46px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition hover:bg-cream', isToday && 'bg-cream')}
          >
            <span className="text-[10.5px] font-semibold uppercase text-muted">{fmtDay(d).slice(0, 3)}</span>
            <span
              className={cx(
                'grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold',
                !a && 'bg-line text-muted',
                a && green && (predicted ? 'predicted-stripes bg-go-soft text-go-deep' : 'bg-go text-white'),
                a && !green && (predicted ? 'predicted-stripes bg-stop-soft text-stop-deep' : 'bg-stop text-white'),
                isToday && 'ring-2 ring-ink ring-offset-2 ring-offset-cream',
              )}
            >
              {Number(d.slice(-2))}
            </span>
            <span className={cx('h-1.5 w-1.5 rounded-full', a?.isPeriod ? 'bg-period' : 'bg-transparent')} />
          </button>
        )
      })}
    </div>
  )
}

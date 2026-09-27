import { CalendarHeart, ChevronRight, Heart, Info, Sparkles, WifiOff } from 'lucide-react'
import { Card, LightDot, Pill, SectionTitle, cx } from '../components/ui'
import { addDays } from '../engine/dates'
import type { DayAssessment, Light, Phase } from '../engine/engine'
import { useStore } from '../lib/store'
import { FLOW_LABEL, LIGHT_LABEL, fmtDay, fmtLong, relativeDays } from '../lib/format'

const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Period',
  follicular: 'Early cycle',
  fertile: 'Fertile window',
  luteal: 'After ovulation',
  unknown: 'Getting started',
}

export function TodayScreen({ onLog, onLearn, onCalendar }: { onLog: (date: string) => void; onLearn: () => void; onCalendar: () => void }) {
  const { analysis, me, partner, state, today, offline } = useStore()
  if (!analysis || !state) return null
  const t = analysis.today
  const green = t.light === 'green'
  const isPartner = me?.role === 'partner'
  const herName = isPartner ? (partner?.name ?? 'your partner') : 'you'
  const current = analysis.current
  const todayLog = current?.logs.get(t.cycleDay ?? -1)
  const earlyYes = green && (t.phase === 'menstrual' || t.phase === 'follicular')

  return (
    <div className="rise flex flex-col gap-5">
      <header className="flex items-start justify-between pt-1">
        <div>
          <div className="text-[13px] font-medium text-muted">{fmtLong(today)}</div>
          <h1 className="display mt-0.5 text-[28px] font-semibold leading-tight">
            {t.cycleDay ? `Cycle day ${t.cycleDay}` : `Hi ${me?.name ?? 'there'}`}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          {offline && (
            <span className="rounded-full bg-amber-soft p-1.5 text-[#9a4a2e]" title="Offline — showing cached data">
              <WifiOff size={14} />
            </span>
          )}
          <Avatars names={[me?.name ?? 'Me', partner?.name].filter((x): x is string => !!x)} />
        </div>
      </header>

      <section
        className={cx(
          'relative overflow-hidden rounded-[28px] p-6 text-white shadow-float',
          green ? 'bg-gradient-to-br from-[#f07aa9] via-go to-go-deep' : 'bg-gradient-to-br from-[#b064a6] via-stop to-stop-deep',
        )}
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <Heart className="absolute right-6 top-6 text-white/25" size={56} fill="currentColor" />
        <div className="flex items-center gap-2">
          <Pill tone="inverse">{t.kind === 'predicted' ? 'Predicted' : 'From your cycle'}</Pill>
          {t.phase !== 'unknown' && <Pill tone="inverse">{PHASE_LABEL[t.phase]}</Pill>}
        </div>
        <h2 className="display mt-5 text-[46px] font-semibold leading-[0.95]">{t.headline}</h2>
        <p className="mt-3 text-[17px] font-medium leading-snug text-white/95">{isPartner ? partnerAction(t.light, herName) : t.action}</p>
        {t.nextChange && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/20 px-3.5 py-2.5 text-[14px] backdrop-blur">
            <LightDot light={t.nextChange.light} size={9} />
            <span>
              {LIGHT_LABEL[t.nextChange.light]}s {t.nextChange.kind === 'predicted' ? 'expected' : ''} {relativeDays(t.nextChange.daysAway)} · {fmtDay(t.nextChange.date)}
            </span>
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <button onClick={onCalendar} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-go-deep">
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
          <SectionTitle>Little reminders</SectionTitle>
          <Card className="divide-y divide-line/80 p-0">
            {t.prompts.map((p) => (
              <button key={p.id} onClick={() => onLog(today)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-go-tint">
                <span className={cx('grid h-9 w-9 place-items-center rounded-xl', p.id === 'first-cycle' ? 'bg-amber-soft text-[#9a4a2e]' : 'bg-go-tint text-go-deep')}>
                  {p.id === 'period' ? <CalendarHeart size={18} /> : p.id === 'lh' ? <Sparkles size={18} /> : <Info size={18} />}
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
          <SectionTitle>Make it good for her</SectionTitle>
          <Card className="flex flex-col gap-3">
            {supportTips(t.light, t.nextChange, herName).map((tip) => (
              <div key={tip} className="flex items-start gap-3">
                <Heart size={16} className="mt-0.5 shrink-0 text-go" fill="currentColor" />
                <span className="text-[15px] leading-snug">{tip}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>Why today is a {green ? 'yes' : 'careful'} day</SectionTitle>
        <Card className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-ink-2">{t.detail}</p>
          {earlyYes && (
            <p className="rounded-xl bg-amber-soft px-3 py-2 text-[13px] leading-snug text-[#9a4a2e]">
              Early yes days come from past cycle lengths. Sperm can live up to 5 days, so if a cycle ever runs much shorter than usual, reach for a condom.
            </p>
          )}
          {todayLog && (todayLog.flow || todayLog.lh || todayLog.sex) && (
            <div className="flex flex-wrap gap-1.5">
              {todayLog.flow && <Pill tone="red">Period · {FLOW_LABEL[todayLog.flow]}</Pill>}
              {todayLog.lh && <Pill>LH {todayLog.lh}</Pill>}
              {todayLog.sex && <Pill tone="green">Intimacy · {todayLog.sex}</Pill>}
            </div>
          )}
          <button onClick={onLearn} className="inline-flex items-center gap-1 text-[13px] font-semibold text-go-deep">
            <Heart size={14} /> How Greenlight decides <ChevronRight size={14} />
          </button>
        </Card>
      </section>

      {current && (
        <section>
          <SectionTitle>This cycle</SectionTitle>
          <Card className="grid grid-cols-3 gap-3">
            <Metric label="Started" value={fmtDay(current.start)} />
            <Metric label="Ovulation est." value={analysis.predictedOvulation ? fmtDay(analysis.predictedOvulation) : '—'} />
            <Metric label="Next period" value={analysis.predictedPeriodStart ? fmtDay(analysis.predictedPeriodStart) : '—'} />
          </Card>
          <p className="mt-2 px-1 text-[12px] leading-snug text-muted">
            {analysis.stats.completedCycles === 0
              ? `Greenlight is still learning ${isPartner ? `${herName}’s` : 'your'} rhythm — more careful days until one full cycle is logged.`
              : `Based on ${analysis.stats.completedCycles} full cycle${analysis.stats.completedCycles === 1 ? '' : 's'} · ${analysis.stats.shortestCycle}–${analysis.stats.longestCycle} days long.`}
          </p>
        </section>
      )}
    </div>
  )
}

function partnerAction(light: Light, name: string) {
  if (light === 'green') return `A yes day for ${name} — enjoy each other.`
  return `${name} is in her careful days — bring a condom, or save it for a yes day.`
}

function supportTips(light: Light, next: { daysAway: number; light: Light } | null, name: string) {
  const tips: string[] = []
  if (light === 'red') {
    tips.push('Keep condoms close so she never has to worry — her peace of mind makes it better for you both.')
    tips.push('Careful days are a great time for everything that isn’t penetrative sex. Get creative.')
    if (next?.light === 'green') tips.push(`Yes days are expected ${next.daysAway === 1 ? 'tomorrow' : `in ${next.daysAway} days`}.`)
  } else {
    tips.push(`Let ${name} set the pace — a yes day is about her feeling relaxed and wanted.`)
    tips.push('Yes means lower risk, not zero. If either of you wants a condom anyway, that’s always fine.')
    if (next?.light === 'red') tips.push(`Careful days start ${next.daysAway === 1 ? 'tomorrow' : `in ${next.daysAway} days`} — plan something special before then.`)
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
            i === 0 ? 'bg-go text-white' : 'bg-stop-soft text-stop-deep',
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
            className={cx('flex min-w-[46px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition hover:bg-go-tint', isToday && 'bg-go-tint')}
          >
            <span className="text-[10.5px] font-semibold uppercase text-muted">{fmtDay(d).slice(0, 3)}</span>
            <span
              className={cx(
                'grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold',
                !a && 'bg-line text-muted',
                a && green && (predicted ? 'predicted-stripes bg-go-soft text-go-deep' : 'bg-go text-white'),
                a && !green && (predicted ? 'predicted-stripes bg-stop-soft text-stop-deep' : 'bg-stop text-white'),
                isToday && 'ring-2 ring-go-deep ring-offset-2 ring-offset-cream',
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

import { CalendarHeart, ChevronRight, Flame, Heart, Info, Shuffle, Sparkles, Trophy, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { Illustration } from '../components/Illustrations'
import { Card, LightDot, SectionTitle, cx } from '../components/ui'
import { addDays } from '../engine/dates'
import type { DayAssessment, Light } from '../engine/engine'
import { computeWins } from '../engine/streaks'
import { useStore } from '../lib/store'
import { LIGHT_LABEL, fmtDay, fmtLong, relativeDays } from '../lib/format'
import { CAREFUL_IDEAS, CAREFUL_MESSAGES, PARTNER_CAREFUL, PARTNER_YES, YES_IDEAS, YES_MESSAGES, pick, pickMany, sceneFor } from '../lib/joy'

export function TodayScreen({ onLog, onLearn, onCalendar, onWins }: { onLog: (date: string) => void; onLearn: () => void; onCalendar: () => void; onWins: () => void }) {
  const { analysis, me, partner, state, today, offline } = useStore()
  const [ideaPage, setIdeaPage] = useState(0)
  if (!analysis || !state) return null
  const t = analysis.today
  const green = t.light === 'green'
  const isPartner = me?.role === 'partner'
  const herName = isPartner ? (partner?.name ?? 'your partner') : 'you'
  const wins = computeWins(analysis, today)
  const scene = sceneFor(t.light, today)
  const message = isPartner
    ? pick(green ? PARTNER_YES(herName) : PARTNER_CAREFUL(herName), today)
    : pick(green ? YES_MESSAGES : CAREFUL_MESSAGES, today)
  const ideas = pickMany(green ? YES_IDEAS : CAREFUL_IDEAS, today, 3, ideaPage)
  const earlyYes = green && (t.phase === 'menstrual' || t.phase === 'follicular')

  return (
    <div className="rise flex flex-col gap-6">
      <header className="flex items-center justify-between pt-1">
        <div>
          <div className="text-[13px] font-medium text-muted">{fmtLong(today)}</div>
          <h1 className="display mt-0.5 text-[26px] font-semibold leading-tight">Hi {me?.name ?? 'lovely'}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {offline && (
            <span className="rounded-full bg-amber-soft p-1.5 text-[#9a4a2e]" title="Offline — showing cached data">
              <WifiOff size={14} />
            </span>
          )}
          <Avatars names={[me?.name ?? 'Me', partner?.name].filter((x): x is string => !!x)} />
        </div>
      </header>

      {wins.freshVictory && (
        <section className="card overflow-hidden p-0">
          <Illustration scene="victory" className="block h-auto w-full" />
          <div className="p-5">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-go-deep">Victory #{wins.victories}</div>
            <h2 className="display mt-1 text-[24px] font-semibold leading-tight">
              {isPartner ? `Another cycle won, together.` : 'You did it, queen.'}
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
              {isPartner
                ? `${herName}’s period arrived — a whole cycle on her terms. Tell her how proud you are.`
                : 'Your period arrived — another whole cycle lived fully, on your terms. That’s something to celebrate.'}
            </p>
          </div>
        </section>
      )}

      <section className="card overflow-hidden p-0">
        <div className="relative">
          <Illustration scene={scene} className="block h-auto w-full" />
          <span
            className={cx(
              'absolute left-4 top-4 rounded-full px-3 py-1 text-[12px] font-semibold text-white',
              green ? 'bg-go' : 'bg-stop',
            )}
          >
            {t.cycleDay ? `Day ${t.cycleDay}` : 'Getting started'}
            {t.kind === 'predicted' ? ' · predicted' : ''}
          </span>
        </div>
        <div className="p-5">
          <h2 className={cx('display text-[38px] font-semibold leading-none', green ? 'text-go-deep' : 'text-stop')}>{t.headline}</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{message}</p>
          {t.nextChange && (
            <p className="mt-4 flex items-center gap-2 text-[13.5px] text-muted">
              <LightDot light={t.nextChange.light} size={8} />
              {LIGHT_LABEL[t.nextChange.light]}s {t.nextChange.kind === 'predicted' ? 'expected' : ''} {relativeDays(t.nextChange.daysAway)} · {fmtDay(t.nextChange.date)}
            </p>
          )}
        </div>
      </section>

      <button onClick={onWins} className="card flex items-center gap-4 p-4 text-left">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-go-tint text-go-deep">
          <Flame size={22} />
        </span>
        <span className="flex-1">
          <span className="display block text-[20px] font-semibold leading-tight">
            {wins.streak} day{wins.streak === 1 ? '' : 's'} carefree
          </span>
          <span className="text-[13px] text-muted">
            {wins.victories} {wins.victories === 1 ? 'victory' : 'victories'} · {wins.badges.filter((b) => b.earned).length} badges
          </span>
        </span>
        <Trophy size={20} className="text-go" />
      </button>

      <section>
        <SectionTitle
          action={
            <button onClick={() => setIdeaPage((p) => p + 1)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-go-deep">
              <Shuffle size={13} /> More
            </button>
          }
        >
          {green ? 'Ideas for tonight' : 'Close without the risk'}
        </SectionTitle>
        <div className="flex flex-col gap-2.5">
          {ideas.map((idea) => (
            <Card key={idea.title} className="flex items-start gap-3 p-4">
              <Heart size={16} className="mt-1 shrink-0 text-go" fill="currentColor" />
              <div>
                <div className="text-[15px] font-semibold">{idea.title}</div>
                <div className="mt-0.5 text-[14px] leading-snug text-ink-2">{idea.body}</div>
              </div>
            </Card>
          ))}
        </div>
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

      <details className="card group p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
          Why today is a {green ? 'yes' : 'careful'} day
          <ChevronRight size={16} className="text-muted transition group-open:rotate-90" />
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-[14px] leading-relaxed text-ink-2">{t.detail}</p>
          {earlyYes && (
            <p className="rounded-xl bg-amber-soft px-3 py-2 text-[13px] leading-snug text-[#9a4a2e]">
              Early yes days come from past cycle lengths. Sperm can live up to 5 days, so if a cycle ever runs much shorter than usual, reach for a condom.
            </p>
          )}
          <p className="text-[12.5px] text-muted">
            {analysis.stats.completedCycles === 0
              ? `Still learning ${isPartner ? `${herName}’s` : 'your'} rhythm — more careful days until one full cycle is logged.`
              : `Based on ${analysis.stats.completedCycles} full cycle${analysis.stats.completedCycles === 1 ? '' : 's'} · ${analysis.stats.shortestCycle}–${analysis.stats.longestCycle} days long.`}
          </p>
          <button onClick={onLearn} className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-go-deep">
            How Greenlight decides <ChevronRight size={14} />
          </button>
        </div>
      </details>
    </div>
  )
}

function supportTips(light: Light, next: { daysAway: number; light: Light } | null, name: string) {
  const tips: string[] = []
  if (light === 'red') {
    tips.push('Keep condoms close so she never has to worry — her peace of mind is the sexiest thing.')
    tips.push('Tell her she’s beautiful. Careful days can still be the most intimate ones.')
    if (next?.light === 'green') tips.push(`Yes days are expected ${next.daysAway === 1 ? 'tomorrow' : `in ${next.daysAway} days`}.`)
  } else {
    tips.push(`Let ${name} set the pace — a yes day is about her feeling relaxed and wanted.`)
    tips.push('Yes means lower risk, not zero. If either of you wants a condom anyway, that’s always fine.')
    if (next?.light === 'red') tips.push(`Careful days start ${next.daysAway === 1 ? 'tomorrow' : `in ${next.daysAway} days`} — plan something special before then.`)
  }
  return tips
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

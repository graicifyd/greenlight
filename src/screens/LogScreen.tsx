import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Card, LightDot, SectionTitle, Segmented, cx, inputClass } from '../components/ui'
import { addDays } from '../engine/dates'
import type { DayLog, Flow, LhResult, SexEntry } from '../engine/types'
import { useStore } from '../lib/store'
import { FLOW_LABEL, LIGHT_LABEL, fmtLong } from '../lib/format'

export function LogScreen({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { state, analysis, saveLog, deleteLog, today, me } = useStore()
  const settings = state?.settings
  const existing = state?.logs.find((l) => l.date === date)
  const assessment = analysis?.days.get(date)

  if (!settings) return null

  const patch = (p: Partial<DayLog>) => {
    const next: Omit<DayLog, 'updatedAt'> = { ...(existing ?? { date }), ...p, date }
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined) delete next[k]
    void saveLog(next)
  }

  const isPartner = me?.role === 'partner'

  return (
    <div className="rise flex flex-col gap-5">
      <header className="flex items-center justify-between pt-1">
        <button onClick={() => setDate(addDays(date, -1))} className="rounded-full p-2 hover:bg-go-tint" aria-label="Previous day">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <div className="text-[13px] font-medium text-muted">
            {date === today ? 'Today' : date > today ? 'Future' : assessment?.cycleDay ? `Cycle day ${assessment.cycleDay}` : 'Past'}
          </div>
          <label className="relative block cursor-pointer">
            <span className="display text-[20px] font-semibold leading-tight">{fmtLong(date)}</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Pick a date"
            />
          </label>
        </div>
        <button onClick={() => setDate(addDays(date, 1))} disabled={date >= today} className="rounded-full p-2 hover:bg-go-tint disabled:opacity-30" aria-label="Next day">
          <ChevronRight size={22} />
        </button>
      </header>

      {assessment && (
        <div
          className={cx(
            'flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[14px] leading-snug',
            assessment.light === 'green' ? 'bg-go-soft text-go-deep' : 'bg-stop-soft text-stop-deep',
          )}
        >
          <LightDot light={assessment.light} predicted={assessment.kind === 'predicted'} />
          <span>
            <span className="font-semibold">{LIGHT_LABEL[assessment.light]}</span>
            <span className="opacity-80"> · {assessment.reason}</span>
          </span>
        </div>
      )}

      {date > today ? (
        <Card className="text-[14px] text-muted">Logging is only possible for today and past days.</Card>
      ) : (
        <>
          {isPartner && (
            <p className="px-1 text-[13px] leading-snug text-muted">You’re logging for her. Everything here is shared with her instantly.</p>
          )}

          <section>
            <SectionTitle>Period</SectionTitle>
            <Segmented<Flow>
              value={existing?.flow}
              onChange={(v) => patch({ flow: v })}
              options={(Object.keys(FLOW_LABEL) as Flow[]).map((f) => ({ value: f, label: FLOW_LABEL[f] }))}
            />
            <p className="mt-2 px-1 text-[12px] text-muted">Tap the first day of bleeding to start a new cycle. Spotting doesn’t count.</p>
          </section>

          <section>
            <SectionTitle>Ovulation test (optional)</SectionTitle>
            <Segmented<LhResult>
              value={existing?.lh}
              onChange={(v) => patch({ lh: v })}
              options={[
                { value: 'negative', label: 'Negative' },
                { value: 'positive', label: 'Positive', hint: 'Keeps the next 3 days careful' },
              ]}
            />
          </section>

          <section>
            <SectionTitle>Intimacy</SectionTitle>
            <Segmented<SexEntry>
              value={existing?.sex}
              onChange={(v) => patch({ sex: v })}
              options={[
                { value: 'protected', label: 'With condom', hint: 'Or other protection' },
                { value: 'unprotected', label: 'Without', hint: 'No protection' },
              ]}
            />
            {existing?.sex === 'unprotected' && assessment?.light === 'red' && (
              <p className="mt-2 rounded-xl bg-stop-tint px-3 py-2 text-[13px] leading-snug text-stop-deep">
                Breathe — you’re not alone. This was a careful day, so there’s a real chance of pregnancy. The morning-after pill works best within 72 hours. No judgement, only love — then we start fresh together.
              </p>
            )}
          </section>

          <section>
            <SectionTitle>Note</SectionTitle>
            <textarea
              className={cx(inputClass, 'h-24 resize-none py-3 leading-snug')}
              placeholder="How are you feeling? Mood, cramps, a great night…"
              defaultValue={existing?.note ?? ''}
              key={date + (existing?.note ?? '')}
              onBlur={(e) => e.target.value !== (existing?.note ?? '') && patch({ note: e.target.value.trim() || undefined })}
            />
          </section>

          {existing && (
            <button onClick={() => void deleteLog(date)} className="mx-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-stop-deep">
              <Trash2 size={14} /> Clear this day
            </button>
          )}
        </>
      )}
    </div>
  )
}

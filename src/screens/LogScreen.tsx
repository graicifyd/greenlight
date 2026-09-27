import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card, LightDot, SectionTitle, Segmented, Toggle, cx, inputClass } from '../components/ui'
import { addDays } from '../engine/dates'
import { cToF, fToC } from '../engine/engine'
import type { DayLog, Flow, LhResult, Mucus, SexEntry } from '../engine/types'
import { useStore } from '../lib/store'
import { FLOW_LABEL, MUCUS_HINT, MUCUS_LABEL, fmtLong } from '../lib/format'

export function LogScreen({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { state, analysis, saveLog, deleteLog, today, me } = useStore()
  const settings = state?.settings
  const existing = state?.logs.find((l) => l.date === date)
  const assessment = analysis?.days.get(date)
  const unit = settings?.tempUnit ?? 'c'

  if (!settings) return null

  const patch = (p: Partial<DayLog>) => {
    const next: Omit<DayLog, 'updatedAt'> = { ...(existing ?? { date }), ...p, date }
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined) delete next[k]
    void saveLog(next)
  }

  const commitTemp = (text: string) => {
    const v = parseFloat(text.replace(',', '.'))
    if (!text.trim() || Number.isNaN(v)) {
      if (existing?.temp != null) patch({ temp: undefined })
      return
    }
    const c = unit === 'f' ? fToC(v) : Math.round(v * 100) / 100
    if (c < 34 || c > 40 || c === existing?.temp) return
    patch({ temp: c })
  }

  const isPartner = me?.role === 'partner'

  return (
    <div className="rise flex flex-col gap-5">
      <header className="flex items-center justify-between pt-1">
        <button onClick={() => setDate(addDays(date, -1))} className="rounded-full p-2 hover:bg-ink/5" aria-label="Previous day">
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
        <button onClick={() => setDate(addDays(date, 1))} disabled={date >= today} className="rounded-full p-2 hover:bg-ink/5 disabled:opacity-30" aria-label="Next day">
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
            <span className="font-semibold">{assessment.light === 'green' ? 'Green' : 'Red'}</span>
            <span className="opacity-80"> · {assessment.reason}</span>
          </span>
        </div>
      )}

      {date > today ? (
        <Card className="text-[14px] text-muted">Logging is only possible for today and past days.</Card>
      ) : (
        <>
          {isPartner && (
            <p className="px-1 text-[13px] leading-snug text-muted">You’re logging on behalf of your partner. Everything here is shared instantly with them.</p>
          )}

          <section>
            <SectionTitle>Period</SectionTitle>
            <Segmented<Flow>
              value={existing?.flow}
              onChange={(v) => patch({ flow: v })}
              options={(Object.keys(FLOW_LABEL) as Flow[]).map((f) => ({ value: f, label: FLOW_LABEL[f] }))}
            />
            <p className="mt-2 px-1 text-[12px] text-muted">The first light-or-heavier day after a 15-day gap starts a new cycle. Spotting never does.</p>
          </section>

          <section>
            <SectionTitle>Basal temperature</SectionTitle>
            <Card className="flex flex-col gap-3">
              <TempInput key={`${date}:${existing?.temp ?? ''}:${unit}`} initial={existing?.temp} unit={unit} onCommit={commitTemp} />
              <Toggle
                checked={!!existing?.tempDisturbed}
                onChange={(v) => patch({ tempDisturbed: v || undefined })}
                label="Disturbed reading"
                hint="Illness, alcohol, less than 5 h sleep, measured much later than usual. Disturbed readings are shown on the chart but never used to confirm ovulation."
              />
            </Card>
          </section>

          <section>
            <SectionTitle>Cervical mucus</SectionTitle>
            <Segmented<Mucus>
              columns={2}
              value={existing?.mucus}
              onChange={(v) => patch({ mucus: v })}
              options={(Object.keys(MUCUS_LABEL) as Mucus[]).map((m) => ({ value: m, label: MUCUS_LABEL[m], hint: MUCUS_HINT[m] }))}
            />
            <p className="mt-2 px-1 text-[12px] text-muted">
              Log the most fertile quality seen during the day. Watery and egg-white count as peak-type; any mucus ends the early-cycle green days.
            </p>
          </section>

          <section>
            <SectionTitle>Ovulation (LH) test</SectionTitle>
            <Segmented<LhResult>
              value={existing?.lh}
              onChange={(v) => patch({ lh: v })}
              options={[
                { value: 'negative', label: 'Negative' },
                { value: 'positive', label: 'Positive', hint: 'Keeps the next 3 days red' },
              ]}
            />
          </section>

          <section>
            <SectionTitle>Sex</SectionTitle>
            <Segmented<SexEntry>
              value={existing?.sex}
              onChange={(v) => patch({ sex: v })}
              options={[
                { value: 'protected', label: 'Protected' },
                { value: 'unprotected', label: 'Unprotected' },
              ]}
            />
            {existing?.sex === 'unprotected' && assessment?.light === 'red' && (
              <p className="mt-2 rounded-xl bg-stop-tint px-3 py-2 text-[13px] leading-snug text-stop-deep">
                Unprotected sex on a red day carries a real pregnancy risk. Emergency contraception is most effective within 72 hours — consider it.
              </p>
            )}
          </section>

          <section>
            <SectionTitle>Note</SectionTitle>
            <textarea
              className={cx(inputClass, 'h-24 resize-none py-3 leading-snug')}
              placeholder="Anything worth remembering — travel, stress, cramps…"
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

function TempInput({ initial, unit, onCommit }: { initial: number | undefined; unit: 'c' | 'f'; onCommit: (text: string) => void }) {
  const fmt = (v: number) => (unit === 'f' ? v.toFixed(1) : v.toFixed(2).replace(/0$/, ''))
  const [text, setText] = useState(initial != null ? fmt(unit === 'f' ? cToF(initial) : initial) : '')

  const step = (dir: 1 | -1) => {
    const inc = unit === 'f' ? 0.1 : 0.05
    const base = parseFloat(text.replace(',', '.'))
    const start = Number.isNaN(base) ? (unit === 'f' ? 97.7 : 36.5) : base
    const next = fmt(Math.round((start + dir * inc) * 100) / 100)
    setText(next)
    onCommit(next)
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => step(-1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-paper hover:bg-cream" aria-label="Lower">
        <Minus size={18} />
      </button>
      <div className="relative flex-1">
        <input
          inputMode="decimal"
          className={cx(inputClass, 'display text-center text-[26px] font-semibold pr-12')}
          value={text}
          placeholder={unit === 'f' ? '97.7' : '36.50'}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted">°{unit.toUpperCase()}</span>
      </div>
      <button onClick={() => step(1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-paper hover:bg-cream" aria-label="Raise">
        <Plus size={18} />
      </button>
    </div>
  )
}

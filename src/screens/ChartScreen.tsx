import { useState } from 'react'
import { Card, SectionTitle, cx } from '../components/ui'
import { cToF, type Cycle } from '../engine/engine'
import type { Mucus, TempUnit } from '../engine/types'
import { useStore } from '../lib/store'
import { fmtShort, fmtTemp } from '../lib/format'

const MUCUS_COLOR: Record<Mucus, string> = {
  dry: '#e7e1d6',
  sticky: '#d9c9a8',
  creamy: '#e4b98a',
  watery: '#7fb6d9',
  eggwhite: '#3f86c4',
}

export function ChartScreen() {
  const { analysis, state } = useStore()
  const [idx, setIdx] = useState<number | null>(null)
  if (!analysis || !state) return null
  const cycles = analysis.cycles
  if (cycles.length === 0) {
    return <Card className="mt-2 text-[14px] text-muted">The chart appears once a period has been logged.</Card>
  }
  const cycle = cycles[idx ?? cycles.length - 1]
  const unit = state.settings.tempUnit

  return (
    <div className="rise flex flex-col gap-4">
      <header className="pt-1">
        <h1 className="display text-[28px] font-semibold leading-tight">Temperature chart</h1>
        <p className="mt-1 text-[13px] text-muted">
          Cycle from {fmtShort(cycle.start)}
          {cycle.end ? ` to ${fmtShort(cycle.end)} · ${cycle.length} days` : ' · in progress'}
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {[...cycles].reverse().map((c) => {
          const active = c.index === cycle.index
          return (
            <button
              key={c.index}
              onClick={() => setIdx(c.index)}
              className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold', active ? 'bg-ink text-cream border-ink' : 'bg-paper border-line text-ink-2')}
            >
              {c.complete ? fmtShort(c.start) : 'Current'}
            </button>
          )
        })}
      </div>

      <Card className="overflow-x-auto p-3">
        <BbtChart cycle={cycle} unit={unit} />
      </Card>
      <p className="-mt-2 px-1 text-[12px] text-muted">Shaded green = green days · dashed line = coverline · red dots = above coverline · hollow dots = disturbed (ignored). Swipe to scroll.</p>

      <section>
        <SectionTitle>What the chart says</SectionTitle>
        <Card className="flex flex-col gap-3 text-[14px] leading-relaxed text-ink-2">
          <Row label="Coverline" value={cycle.tempShift ? fmtTemp(cycle.tempShift.coverline, unit) : 'Not established yet'} />
          <Row
            label="Temperature rise"
            value={
              cycle.tempShift
                ? cycle.tempShift.confirmedDay
                  ? `Day ${cycle.tempShift.firstHighDay}, confirmed day ${cycle.tempShift.confirmedDay}`
                  : `Started day ${cycle.tempShift.firstHighDay}, not yet confirmed`
                : 'None detected'
            }
          />
          <Row
            label="Mucus peak"
            value={cycle.mucusPeak ? `Day ${cycle.mucusPeak.peakDay}${cycle.mucusPeak.confirmedDay ? `, +3 on day ${cycle.mucusPeak.confirmedDay}` : ' (waiting for drier days)'}` : 'None logged'}
          />
          <Row label="Early green days" value={cycle.preOvGreenUntil ? `Days 1–${cycle.preOvGreenUntil}` : 'None'} />
          <Row label="Luteal green" value={cycle.postOvGreenFrom ? `From day ${cycle.postOvGreenFrom}` : 'Not yet'} />
          {cycle.lutealLength && <Row label="Luteal length" value={`${cycle.lutealLength} days`} />}
        </Card>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
}

function BbtChart({ cycle, unit }: { cycle: Cycle; unit: TempUnit }) {
  const days = Math.max(cycle.length ?? 0, ...cycle.logs.keys(), 28)
  const padL = 56
  const padR = 16
  const padT = 14
  const chartH = 220
  const W = padL + padR + (days - 1) * 24
  const H = 340
  const rowsTop = padT + chartH + 14
  const conv = (c: number) => (unit === 'f' ? cToF(c) : c)

  const temps = [...cycle.logs.entries()].filter(([, l]) => l.temp != null).map(([d, l]) => ({ day: d, t: conv(l.temp as number), disturbed: !!l.tempDisturbed }))
  const values = temps.map((p) => p.t)
  const step = unit === 'f' ? 0.2 : 0.1
  const lo = values.length ? Math.floor((Math.min(...values) - step) / step) * step : unit === 'f' ? 97 : 36
  const hi = values.length ? Math.ceil((Math.max(...values) + step) / step) * step : unit === 'f' ? 99 : 37.2
  const x = (day: number) => padL + ((day - 1) / (days - 1)) * (W - padL - padR)
  const y = (t: number) => padT + (1 - (t - lo) / (hi - lo)) * chartH
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)

  const valid = temps.filter((p) => !p.disturbed)
  const path = valid.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.t).toFixed(1)}`).join(' ')
  const cl = cycle.tempShift ? conv(cycle.tempShift.coverline) : null
  const cellW = (W - padL - padR) / (days - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-none" role="img" aria-label="Basal body temperature chart">
      {cycle.preOvGreenUntil > 0 && <rect x={x(1) - cellW / 2} y={padT} width={cellW * cycle.preOvGreenUntil} height={chartH} fill="#dcefe2" opacity={0.7} />}
      {cycle.postOvGreenFrom != null && (
        <rect x={x(cycle.postOvGreenFrom) - cellW / 2} y={padT} width={Math.max(0, x(days) - x(cycle.postOvGreenFrom) + cellW)} height={chartH} fill="#dcefe2" opacity={0.7} />
      )}
      {(cycle.postOvGreenFrom != null || cycle.preOvGreenUntil >= 0) && (
        <rect
          x={x(cycle.preOvGreenUntil + 1) - cellW / 2}
          y={padT}
          width={Math.max(0, x(cycle.postOvGreenFrom ?? days + 1) - x(cycle.preOvGreenUntil + 1))}
          height={chartH}
          fill="#fadfdc"
          opacity={0.55}
        />
      )}

      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e7e1d6" strokeWidth={1} />
          <text x={padL - 8} y={y(v) + 4} fontSize={11} textAnchor="end" fill="#7a766f">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
        <text key={d} x={x(d)} y={padT + chartH + 12} fontSize={10} textAnchor="middle" fill={d % 5 === 0 || d === 1 ? '#4a4743' : '#b8b2a7'}>
          {d % 5 === 0 || d === 1 ? d : '·'}
        </text>
      ))}

      {cl != null && (
        <g>
          <line x1={padL} x2={W - padR} y1={y(cl)} y2={y(cl)} stroke="#1b1a18" strokeDasharray="5 5" strokeWidth={1.5} />
          <text x={W - padR} y={y(cl) - 5} fontSize={11} textAnchor="end" fill="#1b1a18" fontWeight={600}>
            coverline {cl.toFixed(unit === 'f' ? 1 : 2)}
          </text>
        </g>
      )}
      {cycle.tempShift && (
        <line x1={x(cycle.tempShift.firstHighDay) - cellW / 2} x2={x(cycle.tempShift.firstHighDay) - cellW / 2} y1={padT} y2={padT + chartH} stroke="#1b1a18" strokeWidth={1} opacity={0.35} />
      )}

      <path d={path} fill="none" stroke="#1b1a18" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {temps.map((p) => (
        <circle
          key={p.day}
          cx={x(p.day)}
          cy={y(p.t)}
          r={p.disturbed ? 4 : 4.5}
          fill={p.disturbed ? '#fffdf9' : cl != null && p.t > cl ? '#d64f45' : '#1b1a18'}
          stroke={p.disturbed ? '#7a766f' : 'none'}
          strokeWidth={1.5}
          strokeDasharray={p.disturbed ? '2 2' : undefined}
        />
      ))}

      {/* signal rows */}
      <text x={padL - 8} y={rowsTop + 10} fontSize={10} textAnchor="end" fill="#7a766f">
        mucus
      </text>
      <text x={padL - 8} y={rowsTop + 28} fontSize={10} textAnchor="end" fill="#7a766f">
        period
      </text>
      <text x={padL - 8} y={rowsTop + 46} fontSize={10} textAnchor="end" fill="#7a766f">
        LH · sex
      </text>
      {[...cycle.logs.entries()].map(([d, l]) => (
        <g key={d}>
          {l.mucus && <rect x={x(d) - cellW * 0.4} y={rowsTop} width={cellW * 0.8} height={12} rx={3} fill={MUCUS_COLOR[l.mucus]} />}
          {l.flow && (
            <rect
              x={x(d) - cellW * 0.4}
              y={rowsTop + 18}
              width={cellW * 0.8}
              height={12}
              rx={3}
              fill="#b8324f"
              opacity={l.flow === 'spotting' ? 0.3 : l.flow === 'light' ? 0.55 : l.flow === 'medium' ? 0.8 : 1}
            />
          )}
          {l.lh === 'positive' && (
            <text x={x(d)} y={rowsTop + 46} fontSize={12} textAnchor="middle" fill="#1b1a18" fontWeight={700}>
              +
            </text>
          )}
          {l.lh === 'negative' && (
            <text x={x(d)} y={rowsTop + 46} fontSize={12} textAnchor="middle" fill="#7a766f">
              –
            </text>
          )}
          {l.sex && <circle cx={x(d)} cy={rowsTop + 42} r={3} fill={l.sex === 'protected' ? '#d99a2b' : '#7a766f'} opacity={l.lh ? 0.5 : 1} />}
        </g>
      ))}
    </svg>
  )
}

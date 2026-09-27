import { Check, ChevronDown, Copy, Download, LogOut, Share2, Trash2, Wand2, WifiOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button, Card, Field, SectionTitle, Segmented, Toggle, cx, inputClass } from '../components/ui'
import type { CautionLevel, TempUnit } from '../engine/types'
import { useStore } from '../lib/store'

export function MoreScreen() {
  const { state, me, partner, analysis, offline, updateSettings, rename, loadDemo, clearLogs, leave } = useStore()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'clear' | 'leave' | null>(null)
  if (!state || !me) return null
  const s = state.settings
  const stats = analysis?.stats

  const inviteUrl = `${location.origin}/?join=${state.inviteCode}`
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  const share = async () => {
    const data = { title: 'Join me on Greenlight', text: `Use code ${state.inviteCode} to see our shared cycle.`, url: inviteUrl }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        /* cancelled */
      }
    } else await copyCode()
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ settings: s, logs: state.logs }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `greenlight-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="rise flex flex-col gap-6">
      <header className="pt-1">
        <h1 className="display text-[28px] font-semibold leading-tight">More</h1>
        {offline && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-amber">
            <WifiOff size={14} /> Offline — showing your last synced data
          </p>
        )}
      </header>

      <section>
        <SectionTitle>Partner</SectionTitle>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <MemberRow name={me.name} role={me.role} you />
            {partner ? (
              <MemberRow name={partner.name} role={partner.role} />
            ) : (
              <p className="text-[14px] leading-snug text-muted">No partner yet. Share this code — they enter it under “Join your partner” and see exactly what you see.</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Invite code</div>
              <div className="display text-[26px] font-semibold tracking-[0.2em]">{state.inviteCode}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => void copyCode()} className="rounded-xl p-2.5 hover:bg-ink/5" aria-label="Copy code">
                {copied ? <Check size={18} className="text-go" /> : <Copy size={18} />}
              </button>
              <button onClick={() => void share()} className="rounded-xl p-2.5 hover:bg-ink/5" aria-label="Share invite">
                <Share2 size={18} />
              </button>
            </div>
          </div>
          <Field label="Your name">
            <input className={inputClass} defaultValue={me.name} key={me.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== me.name && void rename(e.target.value.trim())} />
          </Field>
        </Card>
      </section>

      <section>
        <SectionTitle>How Greenlight decides</SectionTitle>
        <Card className="divide-y divide-line/70 p-0">
          <Accordion title="Red until proven green" defaultOpen>
            Every day starts red. A day only turns green when the rules below are satisfied by data you actually logged. Missing temperatures, ambiguous
            mucus or a first cycle without history all stay red. That’s deliberate: the cost of a wrong red is a condom; the cost of a wrong green is a pregnancy.
          </Accordion>
          <Accordion title="After ovulation: temperature shift">
            We draw a coverline just above the highest of the 6 normal temperatures before a rise. Three readings in a row above it — the third at
            least 0.2 °C higher — confirm ovulation. Disturbed readings (illness, alcohol, short sleep) are skipped. One dip is tolerated, but a failed rise is discarded.
          </Accordion>
          <Accordion title="After ovulation: mucus peak">
            The last watery or egg-white day is “peak”. Three drier days after it confirm the peak. With mucus tracking on, green begins the evening of the
            later of the two confirmations (temperature or mucus). Temperature-only mode waits one extra day.
          </Accordion>
          <Accordion title="Early cycle: the conservative rules">
            The first days of a cycle can be green only when history proves it safe: never past day 5, never past (earliest first temperature rise − 8),
            never past (shortest cycle − 20), and never once any mucus appears. A first cycle, or a cycle after one without a confirmed rise, has no early green days.
            Switch to <strong>Strict</strong> caution to remove early green days entirely.
          </Accordion>
          <Accordion title="Predictions vs confirmations">
            Striped days are predictions from your cycle history and are for planning only. Solid days are confirmed by logged data. Never rely on a striped green day.
          </Accordion>
          <Accordion title="What this app is not">
            Greenlight is a fertility-awareness aid, not a contraceptive device or medical advice. Perfect-use symptothermal methods are highly effective; typical
            use is less so. Irregular cycles, breastfeeding, coming off hormonal contraception and shift work all reduce reliability. Talk to a clinician about what fits you.
          </Accordion>
        </Card>
      </section>

      <section>
        <SectionTitle>Settings</SectionTitle>
        <Card className="flex flex-col gap-5">
          <Field label="Caution level">
            <Segmented<CautionLevel>
              value={s.caution}
              onChange={(v) => v && void updateSettings({ caution: v })}
              options={[
                { value: 'standard', label: 'Standard', hint: 'Early green days when history allows' },
                { value: 'strict', label: 'Strict', hint: 'Green only after confirmed ovulation' },
              ]}
            />
          </Field>
          <Toggle
            checked={s.trackMucus}
            onChange={(v) => void updateSettings({ trackMucus: v })}
            label="Track cervical mucus"
            hint="Recommended. Double-checking temperature against mucus gives earlier and safer green days. Off = temperature-only with an extra buffer day."
          />
          <Field label="Temperature unit">
            <Segmented<TempUnit>
              value={s.tempUnit}
              onChange={(v) => v && void updateSettings({ tempUnit: v })}
              options={[
                { value: 'c', label: 'Celsius' },
                { value: 'f', label: 'Fahrenheit' },
              ]}
            />
          </Field>
          <Field label="Typical cycle length" hint="Used only for predictions until enough cycles are logged.">
            <input
              type="number"
              min={21}
              max={45}
              className={inputClass}
              defaultValue={s.typicalCycleLength}
              key={s.typicalCycleLength}
              onBlur={(e) => {
                const n = Number(e.target.value)
                if (n >= 21 && n <= 45 && n !== s.typicalCycleLength) void updateSettings({ typicalCycleLength: n })
              }}
            />
          </Field>
        </Card>
      </section>

      {stats && (
        <section>
          <SectionTitle>Your history</SectionTitle>
          <Card className="grid grid-cols-2 gap-3">
            <Stat label="Completed cycles" value={String(stats.completedCycles)} />
            <Stat label="With confirmed ovulation" value={String(stats.confirmedCycles)} />
            <Stat label="Cycle length" value={stats.medianCycleLength ? `${stats.medianCycleLength} d` : '—'} sub={stats.shortestCycle ? `${stats.shortestCycle}–${stats.longestCycle}` : undefined} />
            <Stat label="Luteal phase" value={stats.medianLutealLength ? `${stats.medianLutealLength} d` : '—'} />
            <Stat label="Earliest temp rise" value={stats.earliestFirstHighDay ? `day ${stats.earliestFirstHighDay}` : '—'} />
            <Stat label="Median temp rise" value={stats.medianFirstHighDay ? `day ${stats.medianFirstHighDay}` : '—'} />
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>Data</SectionTitle>
        <Card className="flex flex-col gap-2 p-2">
          <Action icon={<Download size={18} />} label="Export as JSON" onClick={exportJson} />
          <Action icon={<Wand2 size={18} />} label="Replace with demo data" hint="Four realistic past cycles" busy={busy === 'demo'} onClick={() => void run('demo', loadDemo)} />
          {confirm === 'clear' ? (
            <ConfirmRow text="Delete every log for this couple?" busy={busy === 'clear'} onYes={() => void run('clear', clearLogs)} onNo={() => setConfirm(null)} />
          ) : (
            <Action icon={<Trash2 size={18} />} label="Clear all logs" danger onClick={() => setConfirm('clear')} />
          )}
          {confirm === 'leave' ? (
            <ConfirmRow
              text={partner ? 'Leave this couple? Your partner keeps the data.' : 'Leave and permanently delete all data?'}
              busy={busy === 'leave'}
              onYes={() => void run('leave', leave)}
              onNo={() => setConfirm(null)}
            />
          ) : (
            <Action icon={<LogOut size={18} />} label="Leave couple" danger onClick={() => setConfirm('leave')} />
          )}
        </Card>
      </section>

      <p className="px-2 pb-2 text-center text-[12px] leading-relaxed text-muted">
        Greenlight · fertility awareness for couples. Not a medical device. If you had unprotected sex on a red day, emergency contraception works best within 72 hours.
      </p>
    </div>
  )
}

function MemberRow({ name, role, you }: { name: string; role: string; you?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cx('grid h-9 w-9 place-items-center rounded-full text-[14px] font-bold', role === 'cycling' ? 'bg-period/15 text-period' : 'bg-ink/8 text-ink')}>
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <div className="text-[15px] font-semibold">
          {name}
          {you && <span className="ml-1.5 text-[12px] font-medium text-muted">(you)</span>}
        </div>
        <div className="text-[12px] text-muted">{role === 'cycling' ? 'Tracks the cycle' : 'Partner'}</div>
      </div>
    </div>
  )
}

function Accordion({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left" aria-expanded={open}>
        <span className="text-[15px] font-semibold">{title}</span>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && <p className="px-4 pb-4 -mt-1 text-[14px] leading-relaxed text-ink-2">{children}</p>}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-cream px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="display text-[20px] font-semibold leading-tight">
        {value}
        {sub && <span className="ml-1.5 text-[12px] font-medium text-muted">{sub}</span>}
      </div>
    </div>
  )
}

function Action({ icon, label, hint, onClick, danger, busy }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-cream disabled:opacity-50', danger ? 'text-stop-deep' : 'text-ink')}>
      <span className={cx(danger ? 'text-stop' : 'text-muted')}>{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium">{busy ? 'Working…' : label}</span>
        {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
      </span>
    </button>
  )
}

function ConfirmRow({ text, onYes, onNo, busy }: { text: string; onYes: () => void; onNo: () => void; busy: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-stop-tint p-3">
      <p className="text-[14px] font-medium text-stop-deep">{text}</p>
      <div className="flex gap-2">
        <Button variant="danger" className="h-10 flex-1" disabled={busy} onClick={onYes}>
          {busy ? 'Working…' : 'Yes, do it'}
        </Button>
        <Button variant="secondary" className="h-10 flex-1" onClick={onNo}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

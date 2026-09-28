import { ArrowLeft, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Illustration } from '../components/Illustrations'
import { Button, Field, cx, inputClass } from '../components/ui'
import { addDays } from '../engine/dates'
import { useStore } from '../lib/store'

type Step = 'welcome' | 'start' | 'join'

export function Onboarding() {
  const { createCouple, join, saveLog, loadDemo, today } = useStore()
  const joinParam = new URLSearchParams(location.search).get('join')?.toUpperCase() ?? ''
  const [step, setStep] = useState<Step>(joinParam ? 'join' : 'welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [lastPeriod, setLastPeriod] = useState(addDays(today, -7))
  const [cycleLength, setCycleLength] = useState(28)
  const [code, setCode] = useState(joinParam)

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    guard(async () => {
      await createCouple(name.trim() || 'Me', 'cycling', { typicalCycleLength: cycleLength })
      if (lastPeriod) await saveLog({ date: lastPeriod, flow: 'medium' })
    })

  const demo = () =>
    guard(async () => {
      await createCouple('Ada', 'cycling', { typicalCycleLength: 29 })
      await loadDemo()
    })

  const doJoin = () => guard(() => join(code, name.trim() || 'Partner'))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      {step === 'welcome' && (
        <div className="rise flex flex-1 flex-col">
          <div className="mt-10 flex items-center gap-3">
            <Logo />
            <span className="display text-[22px] font-semibold">Greenlight</span>
          </div>
          <Illustration scene="beach" className="mt-8 block h-auto w-full" />
          <h1 className="display mt-8 text-[38px] leading-[1.05] font-semibold">
            Live fully. <span className="text-go">Love freely.</span>
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
            Your body, your plans, your joy. Greenlight shows the days to <strong className="font-semibold text-ink">relax and enjoy</strong> and the days to
            get creative — so every cycle ends in a little victory. Your partner sees the same answer.
          </p>
          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Button onClick={() => setStep('start')}>I’m her — let’s start</Button>
            <Button variant="secondary" onClick={() => setStep('join')}>
              I’m the partner — I have a code
            </Button>
            <button onClick={demo} disabled={busy} className="mt-1 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-muted hover:text-ink">
              <Sparkles size={15} /> Explore with demo data
            </button>
            {error && <p className="text-center text-[13px] text-stop-deep">{error}</p>}
          </div>
        </div>
      )}

      {step === 'start' && (
        <form
          className="rise flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void start()
          }}
        >
          <Back onClick={() => setStep('welcome')} />
          <h1 className="display mt-6 text-[32px] font-semibold leading-tight">Set up your cycle</h1>
          <p className="mt-2 text-[15px] text-ink-2">You can change everything later. Your first cycle has more careful days while Greenlight learns your rhythm.</p>
          <div className="mt-6 flex flex-col gap-5">
            <Field label="Your name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ada" autoComplete="given-name" />
            </Field>
            <Field label="First day of your last period">
              <input type="date" className={inputClass} value={lastPeriod} max={today} onChange={(e) => setLastPeriod(e.target.value)} />
            </Field>
            <Field label={`Typical cycle length · ${cycleLength} days`} hint="A starting guess — your real cycles take over as you log them.">
              <input type="range" min={21} max={40} value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))} className="w-full accent-go" />
            </Field>
          </div>
          {error && <p className="mt-4 text-[13px] text-stop-deep">{error}</p>}
          <div className="mt-auto pt-8">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Creating…' : 'Start tracking'}
            </Button>
          </div>
        </form>
      )}

      {step === 'join' && (
        <form
          className="rise flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void doJoin()
          }}
        >
          <Back onClick={() => setStep('welcome')} />
          <h1 className="display mt-6 text-[32px] font-semibold leading-tight">Join your partner</h1>
          <p className="mt-2 text-[15px] text-ink-2">Ask your partner for the 6-character invite code in their Greenlight app (More → Partner).</p>
          <div className="mt-6 flex flex-col gap-5">
            <Field label="Invite code">
              <input
                className={cx(inputClass, 'font-mono text-[22px] tracking-[0.3em] uppercase text-center')}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </Field>
            <Field label="Your name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ben" autoComplete="given-name" />
            </Field>
          </div>
          {error && <p className="mt-4 text-[13px] text-stop-deep">{error}</p>}
          <div className="mt-auto pt-8">
            <Button type="submit" disabled={busy || code.length < 6} className="w-full">
              {busy ? 'Joining…' : 'Join'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-ml-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[14px] font-medium text-muted hover:text-ink">
      <ArrowLeft size={16} /> Back
    </button>
  )
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#fbe3ec" />
      <path d="M32 50s-16-9.6-16-21.2C16 22.3 20.6 18 26 18c2.8 0 4.9 1.3 6 3.2 1.1-1.9 3.2-3.2 6-3.2 5.4 0 10 4.3 10 10.8C48 40.4 32 50 32 50z" fill="#e14f8e" />
    </svg>
  )
}

import { ArrowLeft, Check, Copy, Share2, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Illustration, type Scene } from '../components/Illustrations'
import { Button, cx, inputClass } from '../components/ui'
import { addDays } from '../engine/dates'
import { useStore } from '../lib/store'

type Step = 'welcome' | 'name' | 'period' | 'length' | 'invite' | 'code' | 'partner-name'

const HER_STEPS: Step[] = ['name', 'period', 'length', 'invite']
const PARTNER_STEPS: Step[] = ['code', 'partner-name']

export function Onboarding({ onStart, onDone }: { onStart: () => void; onDone: () => void }) {
  const { createCouple, join, saveLog, loadDemo, today, state } = useStore()
  const joinParam = new URLSearchParams(location.search).get('join')?.toUpperCase() ?? ''
  const [step, setStep] = useState<Step>(joinParam ? 'code' : 'welcome')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [name, setName] = useState('')
  const [lastPeriod, setLastPeriod] = useState(addDays(today, -7))
  const [cycleLength, setCycleLength] = useState(28)
  const [code, setCode] = useState(joinParam)

  const go = (next: Step) => {
    setError(null)
    setStep(next)
  }

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

  const create = () =>
    guard(async () => {
      onStart()
      await createCouple(name.trim() || 'Me', 'cycling', { typicalCycleLength: cycleLength })
      if (lastPeriod) await saveLog({ date: lastPeriod, flow: 'medium' })
      setStep('invite')
    })

  const demo = () =>
    guard(async () => {
      await createCouple('Ada', 'cycling', { typicalCycleLength: 29 })
      await loadDemo()
    })

  const doJoin = () => guard(() => join(code, name.trim() || 'Partner'))

  const inviteCode = state?.inviteCode ?? ''
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  const share = async () => {
    const data = { title: 'Join me on Greenlight', text: `Use code ${inviteCode} to see our yes days together.`, url: `${location.origin}/?join=${inviteCode}` }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        /* cancelled */
      }
    } else await copyCode()
  }

  const flow = PARTNER_STEPS.includes(step) ? PARTNER_STEPS : HER_STEPS
  const progress = step === 'welcome' ? null : { at: flow.indexOf(step), of: flow.length }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      {step === 'welcome' && (
        <div className="rise flex flex-1 flex-col">
          <div className="mt-8 flex items-center gap-3">
            <Logo />
            <span className="display text-[22px] font-semibold">Greenlight</span>
          </div>
          <Illustration scene="beach" className="mt-8 block h-auto w-full" />
          <h1 className="display mt-8 text-[38px] leading-[1.05] font-semibold">
            Live fully. <span className="text-go">Love freely.</span>
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
            Your body, your plans, your joy. Know the days to relax and enjoy, and the days to get creative.
          </p>
          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Button onClick={() => go('name')}>I’m her — let’s start</Button>
            <Button variant="secondary" onClick={() => go('code')}>
              I’m the partner — I have a code
            </Button>
            <button onClick={demo} disabled={busy} className="mt-1 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-muted hover:text-ink">
              <Sparkles size={15} /> Explore with demo data
            </button>
            {error && <p className="text-center text-[13px] text-stop-deep">{error}</p>}
          </div>
        </div>
      )}

      {step === 'name' && (
        <StepScreen
          key={step}
          progress={progress}
          onBack={() => go('welcome')}
          scene="bloom"
          title="First, what should we call you?"
          subtitle="Just a first name — it’s how your partner will see you."
          cta="Continue"
          onNext={() => go('period')}
          disabled={!name.trim()}
        >
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="given-name" aria-label="Your name" />
        </StepScreen>
      )}

      {step === 'period' && (
        <StepScreen
          key={step}
          progress={progress}
          onBack={() => go('name')}
          scene="cozy"
          title={`When did your last period start, ${name.trim() || 'lovely'}?`}
          subtitle="The first day of bleeding. A close guess is fine — you can fix it later."
          cta="Continue"
          onNext={() => go('length')}
          disabled={!lastPeriod}
        >
          <input type="date" className={inputClass} value={lastPeriod} max={today} onChange={(e) => setLastPeriod(e.target.value)} aria-label="First day of your last period" />
        </StepScreen>
      )}

      {step === 'length' && (
        <StepScreen
          key={step}
          progress={progress}
          onBack={() => go('period')}
          scene="laptop"
          title="How long is your cycle, usually?"
          subtitle="From one period to the next. Not sure? Leave it at 28 — your real cycles take over as you log them."
          cta={busy ? 'Setting up…' : 'Create my tracker'}
          onNext={() => void create()}
          disabled={busy}
          error={error}
        >
          <div className="text-center">
            <div className="display text-[48px] font-semibold leading-none text-go-deep">{cycleLength}</div>
            <div className="mt-1 text-[14px] text-muted">days</div>
          </div>
          <input type="range" min={21} max={40} value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))} className="mt-4 w-full accent-go" aria-label="Typical cycle length" />
        </StepScreen>
      )}

      {step === 'invite' && (
        <StepScreen
          key={step}
          progress={progress}
          scene="dance"
          title="You’re all set! Invite your partner?"
          subtitle="They’ll see the same yes days and careful days — no awkward guessing."
          cta="Go to my day"
          onNext={onDone}
          secondary={{ label: 'I’ll do this later', onClick: onDone }}
        >
          <div className="card flex items-center justify-between gap-3 p-4">
            <div className="display text-[28px] font-semibold tracking-[0.2em]">{inviteCode || '······'}</div>
            <div className="flex gap-1">
              <button onClick={() => void copyCode()} className="rounded-xl p-2.5 hover:bg-go-tint" aria-label="Copy code">
                {copied ? <Check size={18} className="text-go-deep" /> : <Copy size={18} />}
              </button>
              <button onClick={() => void share()} className="rounded-xl p-2.5 hover:bg-go-tint" aria-label="Share invite">
                <Share2 size={18} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[13px] text-muted">You can always find this later in More → Partner.</p>
        </StepScreen>
      )}

      {step === 'code' && (
        <StepScreen
          key={step}
          progress={progress}
          onBack={() => go('welcome')}
          scene="bloom"
          title="Enter her invite code"
          subtitle="She’ll find the 6-character code in her Greenlight app under More → Partner."
          cta="Continue"
          onNext={() => go('partner-name')}
          disabled={code.length < 6}
        >
          <input
            autoFocus
            className={cx(inputClass, 'font-mono text-[22px] tracking-[0.3em] uppercase text-center')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect="off"
            aria-label="Invite code"
          />
        </StepScreen>
      )}

      {step === 'partner-name' && (
        <StepScreen
          key={step}
          progress={progress}
          onBack={() => go('code')}
          scene="laptop"
          title="And your name?"
          subtitle="So she knows it’s you."
          cta={busy ? 'Joining…' : 'Join'}
          onNext={() => void doJoin()}
          disabled={busy || !name.trim()}
          error={error}
        >
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="given-name" aria-label="Your name" />
        </StepScreen>
      )}
    </div>
  )
}

function StepScreen({
  progress,
  onBack,
  scene,
  title,
  subtitle,
  children,
  cta,
  onNext,
  disabled,
  error,
  secondary,
}: {
  progress: { at: number; of: number } | null
  onBack?: () => void
  scene: Scene
  title: string
  subtitle: string
  children: ReactNode
  cta: string
  onNext: () => void
  disabled?: boolean
  error?: string | null
  secondary?: { label: string; onClick: () => void }
}) {
  return (
    <form
      className="rise flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (!disabled) onNext()
      }}
    >
      <div className="flex h-9 items-center justify-between">
        {onBack ? <Back onClick={onBack} /> : <span />}
        {progress && (
          <div className="flex gap-1.5" aria-label={`Step ${progress.at + 1} of ${progress.of}`}>
            {Array.from({ length: progress.of }, (_, i) => (
              <span key={i} className={cx('h-1.5 rounded-full transition-all', i === progress.at ? 'w-6 bg-go' : i < progress.at ? 'w-1.5 bg-go' : 'w-1.5 bg-line')} />
            ))}
          </div>
        )}
      </div>
      <Illustration scene={scene} className="mx-auto mt-6 block h-auto w-4/5" />
      <h1 className="display mt-8 text-[28px] font-semibold leading-tight">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{subtitle}</p>
      <div className="mt-6">{children}</div>
      {error && <p className="mt-4 text-[13px] text-stop-deep">{error}</p>}
      <div className="mt-auto flex flex-col gap-2 pt-8">
        <Button type="submit" disabled={disabled} className="w-full">
          {cta}
        </Button>
        {secondary && (
          <Button variant="ghost" onClick={secondary.onClick} className="w-full">
            {secondary.label}
          </Button>
        )}
      </div>
    </form>
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

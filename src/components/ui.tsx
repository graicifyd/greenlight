import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import type { Light } from '../engine/engine'

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={cx('card p-4', onClick && 'cursor-pointer active:scale-[0.99] transition', className)} onClick={onClick}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-1 mb-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const styles = {
    primary: 'bg-gradient-to-br from-go to-go-deep text-white shadow-card hover:brightness-105 disabled:opacity-40',
    secondary: 'bg-paper border border-line text-go-deep hover:bg-go-tint',
    ghost: 'bg-transparent text-ink-2 hover:bg-go-tint',
    danger: 'bg-stop-tint text-stop-deep border border-stop-soft hover:bg-stop-soft',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx('h-12 px-5 rounded-2xl font-semibold text-[15px] transition active:scale-[0.98] disabled:cursor-not-allowed', styles, className)}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T | undefined
  options: { value: T; label: string; hint?: string; tone?: Light }[]
  onChange: (v: T | undefined) => void
  columns?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? undefined : o.value)}
            className={cx(
              'rounded-2xl border px-2 py-2.5 text-left transition active:scale-[0.98]',
              active ? 'bg-go text-white border-go shadow-card' : 'bg-paper border-line hover:bg-go-tint',
            )}
          >
            <div className={cx('text-[14px] font-semibold leading-tight', !active && 'text-ink')}>{o.label}</div>
            {o.hint && <div className={cx('text-[11.5px] leading-tight mt-0.5', active ? 'text-white/80' : 'text-muted')}>{o.hint}</div>}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-3 text-left" role="switch" aria-checked={checked}>
      <div>
        <div className="text-[15px] font-medium">{label}</div>
        {hint && <div className="text-[13px] text-muted mt-0.5 leading-snug">{hint}</div>}
      </div>
      <span className={cx('relative inline-flex h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-go' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-in relative w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-t-[28px] bg-cream shadow-float px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="display text-[22px] font-semibold leading-tight">{title}</div>
          <button onClick={onClose} className="rounded-full p-2 -mr-2 text-muted hover:bg-ink/5" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LightDot({ light, predicted, size = 10 }: { light: Light; predicted?: boolean; size?: number }) {
  return (
    <span
      className={cx('inline-block rounded-full', light === 'green' ? 'bg-go' : 'bg-stop', predicted && 'opacity-50')}
      style={{ width: size, height: size }}
    />
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'amber' | 'inverse' }) {
  const styles = {
    neutral: 'bg-go-tint text-ink-2',
    green: 'bg-go-soft text-go-deep',
    red: 'bg-stop-soft text-stop-deep',
    amber: 'bg-amber-soft text-[#9a4a2e]',
    inverse: 'bg-white/20 text-white',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', styles)}>{children}</span>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-[13px] font-semibold text-ink-2 mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-[12.5px] text-muted mt-1.5 leading-snug">{hint}</div>}
    </label>
  )
}

export const inputClass = 'w-full h-12 rounded-2xl border border-line bg-paper px-4 text-[16px] placeholder:text-muted/70 focus:border-go focus:outline-none'

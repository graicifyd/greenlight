import { CalendarDays, Ellipsis, PenLine, Sun, Trophy } from 'lucide-react'
import { useState } from 'react'
import { cx } from './components/ui'
import { useStore } from './lib/store'
import { CalendarScreen } from './screens/CalendarScreen'
import { CycleScreen } from './screens/CycleScreen'
import { LogScreen } from './screens/LogScreen'
import { MoreScreen } from './screens/MoreScreen'
import { Onboarding } from './screens/Onboarding'
import { TodayScreen } from './screens/TodayScreen'

export type Tab = 'today' | 'log' | 'calendar' | 'cycle' | 'more'

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'log', label: 'Log', icon: PenLine },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'cycle', label: 'Wins', icon: Trophy },
  { id: 'more', label: 'More', icon: Ellipsis },
]

export default function App() {
  const { state, loading, today } = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [logDate, setLogDate] = useState<string>(today)
  const [onboarding, setOnboarding] = useState(false)
  const [wasSignedOut, setWasSignedOut] = useState(!state)
  if (wasSignedOut !== !state) {
    setWasSignedOut(!state)
    if (!state) setTab('today')
  }

  const openLog = (date: string) => {
    setLogDate(date)
    setTab('log')
  }

  if (loading && !state) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-stop animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-go animate-pulse [animation-delay:200ms]" />
          Loading
        </div>
      </div>
    )
  }

  if (!state || onboarding) return <Onboarding onStart={() => setOnboarding(true)} onDone={() => {
    setOnboarding(false)
    setTab('today')
  }} />

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md md:my-6 md:min-h-0 md:h-[calc(100dvh-3rem)] md:max-h-[920px] md:rounded-[36px] md:border md:border-line md:bg-cream md:shadow-float md:overflow-hidden relative flex flex-col">
      <main className="flex-1 md:overflow-y-auto no-scrollbar px-4 pt-[max(16px,env(safe-area-inset-top))] pb-28">
        {tab === 'today' && <TodayScreen onLog={openLog} onLearn={() => setTab('more')} onCalendar={() => setTab('calendar')} onWins={() => setTab('cycle')} />}
        {tab === 'log' && <LogScreen date={logDate} setDate={setLogDate} />}
        {tab === 'calendar' && <CalendarScreen onLog={openLog} />}
        {tab === 'cycle' && <CycleScreen />}
        {tab === 'more' && <MoreScreen />}
      </main>
      <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 md:absolute md:left-0 md:translate-x-0 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-cream via-cream/95 to-transparent">
        <div className="card flex items-stretch justify-between px-1.5 py-1.5 rounded-[26px]">
          {TABS.map((t) => {
            const active = tab === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'log') setLogDate(today)
                  setTab(t.id)
                }}
                className={cx(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-[20px] py-2 text-[11px] font-semibold transition',
                  active ? 'bg-go text-white' : 'text-muted hover:text-go-deep',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

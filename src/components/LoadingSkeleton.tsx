import { useState } from 'react'
import type { AnimationEvent } from 'react'
import { Calendar, ChevronRight, DoorOpen, Search, Users } from 'lucide-react'
import { DASHBOARD_CONFIG, MOCK_WEATHER } from '#/core/demo-data'
import { PANEL, VIEWPORT_INSETS } from '#/core/domain/layout'
import type { FloorPlanLoader, LoadStage } from '#/core/sdk/load-floor-plan'
import { useCurrentTime } from '#/hooks/useCurrentTime'
import { useLoadStage } from '#/hooks/useFloorPlan'
import { WelcomeHeader } from '#/components/dashboard/WelcomeHeader'
import { WeatherWidget } from '#/components/dashboard/WeatherWidget'

/**
 * What the visitor sees while the floor loads: the dashboard in its final
 * layout, with everything the floor will fill in shimmering, and a progress
 * pill where the plan is about to appear. Fades out over the loaded kiosk
 * rather than vanishing the instant the engine is ready.
 */
export function LoadingSkeleton({ loader }: { loader: FloorPlanLoader }) {
  const stage = useLoadStage(loader)
  const [gone, setGone] = useState(false)
  if (gone || stage === 'error') return null

  const leaving = stage === 'ready'
  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === 'loading-fade-out') setGone(true)
  }

  return (
    <div
      className={`absolute inset-0 z-30 bg-background ${
        leaving ? 'loading-exit pointer-events-none' : 'pointer-events-auto'
      }`}
      role="status"
      aria-live="polite"
      aria-hidden={leaving}
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="sr-only">{STAGE_LABEL[stage]}</span>
      <DashboardSkeleton />
      <div
        className="absolute inset-y-0 flex items-center justify-center"
        style={{ left: VIEWPORT_INSETS.left, right: VIEWPORT_INSETS.right }}
      >
        <StageIndicator stage={stage} />
      </div>
    </div>
  )
}

const STAGE_LABEL: Record<LoadStage, string> = {
  engine: 'Loading the renderer',
  floor: 'Loading the floor plan',
  ready: 'Floor plan ready',
  error: 'Floor plan failed to load',
}

const STEPS: LoadStage[] = ['engine', 'floor']

function StageIndicator({ stage }: { stage: LoadStage }) {
  const done = stage === 'ready' ? STEPS.length : STEPS.indexOf(stage)
  return (
    <div
      className="floating-panel flex items-center gap-4 py-2.5 pr-5 pl-4"
      style={{ borderRadius: 9999 }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${
              i < done
                ? 'bg-primary'
                : i === done
                  ? 'animate-pulse bg-primary/50'
                  : 'bg-foreground/10'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {STAGE_LABEL[stage]}
      </span>
    </div>
  )
}

function DashboardSkeleton() {
  const { date, time } = useCurrentTime()
  const panels = [
    <WelcomeHeader
      key="welcome"
      companyName={DASHBOARD_CONFIG.companyName}
      date={date}
      time={time}
    />,
    <StatsSkeleton key="stats" />,
    <EventsSkeleton key="events" />,
    <WeatherWidget key="weather" weather={MOCK_WEATHER} />,
    <SearchSkeleton key="search" />,
  ]
  return (
    <div
      className="absolute top-4 left-4 flex flex-col gap-3"
      style={{ width: PANEL.dashboardWidth }}
    >
      {panels.map((panel, i) => (
        <div
          key={i}
          className="dashboard-stagger"
          style={{ '--stagger-index': i } as React.CSSProperties}
        >
          {panel}
        </div>
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="floating-panel grid grid-cols-2 gap-3 p-3">
      <div className="rounded-xl bg-emerald-50 px-4 py-4 text-emerald-800">
        <div className="mb-2 flex items-center gap-2">
          <Users className="size-4 text-emerald-600" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-700/70">
            In Office
          </span>
        </div>
        <span className="skeleton block h-8 w-14" />
        <span className="skeleton mt-2 block h-3 w-28" />
      </div>
      <div className="rounded-xl bg-amber-50 px-4 py-4 text-amber-800">
        <div className="mb-2 flex items-center gap-2">
          <DoorOpen className="size-4 text-amber-600" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wider text-amber-700/70">
            Free Rooms
          </span>
        </div>
        <span className="skeleton block h-8 w-14" />
        <span className="skeleton mt-2 block h-3 w-28" />
      </div>
    </div>
  )
}

const EVENT_TITLE_WIDTHS = ['w-3/5', 'w-4/5', 'w-1/2', 'w-2/3']

function EventsSkeleton() {
  return (
    <div className="floating-panel w-full px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          What's Happening
        </span>
        <ChevronRight
          className="ml-auto size-4 text-muted-foreground/50"
          aria-hidden="true"
        />
      </div>
      <ul className="space-y-3">
        {EVENT_TITLE_WIDTHS.map((width, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-16 shrink-0">
              <span className="skeleton block h-3.5 w-12" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`skeleton block h-3.5 ${width}`} />
              <span className="skeleton mt-1.5 block h-3 w-20" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchSkeleton() {
  return (
    <div className="floating-panel flex w-full items-center gap-3 px-5 py-4">
      <Search className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-lg text-muted-foreground/60">
        Search people, spaces, events...
      </span>
    </div>
  )
}

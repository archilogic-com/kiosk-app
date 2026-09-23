import { Children, useEffect, useState } from 'react'
import type { CSSProperties, Dispatch, ReactNode } from 'react'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Cloud,
  CloudRain,
  CloudSun,
  DoorOpen,
  MapPin,
  Search,
  Sun,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PANEL } from '#/config'
import { COMPANY_NAME, MOCK_WEATHER } from '#/demo-data'
import type { FloorData } from '#/floor-plan/engine'
import { computeFloorStats } from '#/kiosk-state'
import type { KioskAction, KioskState, ScheduledEvent } from '#/kiosk-state'
import { EVENT_STYLES, EventBadge, EventInfo } from '#/components/Details'

/** The kiosk at rest: who is in, what is free, what is on, and a way into search. */
export function Dashboard({
  floor,
  events,
  state: { eventsOpen, focusedEventId },
  bookedSpaceIds,
  onBook,
  dispatch,
}: {
  floor: FloorData
  events: ScheduledEvent[]
  state: KioskState
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
  dispatch: Dispatch<KioskAction>
}) {
  if (eventsOpen) {
    return (
      <EventsTimeline
        events={events}
        focusedEventId={focusedEventId}
        bookedSpaceIds={bookedSpaceIds}
        onBook={onBook}
        dispatch={dispatch}
      />
    )
  }

  const stats = computeFloorStats(
    floor.workstations,
    floor.spaces,
    bookedSpaceIds,
  )
  // The stat tiles are shortcuts into a filtered search.
  const browse = (category: string) => {
    dispatch({ type: 'setCategoryFilter', category })
    dispatch({ type: 'startSearch' })
  }

  return (
    <DashboardColumn>
      <WelcomeHeader />
      <div className="floating-panel grid grid-cols-2 gap-3 p-3">
        <StatCard
          icon={Users}
          label="In Office"
          tone={TONES.emerald}
          value={stats.attendance}
          detail={`of ${stats.totalWorkstations} workstations`}
          onClick={() => browse('people')}
        />
        <StatCard
          icon={DoorOpen}
          label="Free Rooms"
          tone={TONES.amber}
          value={stats.freeRooms}
          detail={`of ${stats.totalMeetingRooms} meeting rooms`}
          onClick={() => browse('meet')}
        />
      </div>
      <EventsSummary
        events={events}
        onOpen={() => dispatch({ type: 'showEvents', open: true })}
      />
      <WeatherCard />
      <SearchButton onClick={() => dispatch({ type: 'startSearch' })} />
    </DashboardColumn>
  )
}

/**
 * The dashboard as it will look once the floor has loaded, with everything
 * the floor fills in shimmering.
 */
export function DashboardSkeleton() {
  return (
    <DashboardColumn>
      <WelcomeHeader />
      <div className="floating-panel grid grid-cols-2 gap-3 p-3">
        <StatCard icon={Users} label="In Office" tone={TONES.emerald} />
        <StatCard icon={DoorOpen} label="Free Rooms" tone={TONES.amber} />
      </div>
      <EventsSummary />
      <WeatherCard />
      <SearchButton />
    </DashboardColumn>
  )
}

/** The dashboard's panels, stacked, sliding in one after another. */
function DashboardColumn({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3"
      style={{ width: PANEL.dashboardWidth }}
    >
      {Children.toArray(children).map((panel, i) => (
        <div
          key={i}
          className="dashboard-stagger"
          style={{ '--stagger-index': i } as CSSProperties}
        >
          {panel}
        </div>
      ))}
    </div>
  )
}

function WelcomeHeader() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="floating-panel flex items-center justify-between px-6 py-5">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-xl bg-primary/10"
          aria-hidden="true"
        >
          <Building2 className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{COMPANY_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      <p className="text-2xl font-semibold tabular-nums">
        {now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}

const TONES = {
  emerald: {
    card: 'bg-emerald-50 text-emerald-800 enabled:hover:bg-emerald-100/70',
    icon: 'text-emerald-600',
    label: 'text-emerald-700/70',
    detail: 'text-emerald-600/70',
  },
  amber: {
    card: 'bg-amber-50 text-amber-800 enabled:hover:bg-amber-100/70',
    icon: 'text-amber-600',
    label: 'text-amber-700/70',
    detail: 'text-amber-600/70',
  },
}

/** A figure from the floor; a shimmer until there is one to show. */
function StatCard({
  icon: Icon,
  label,
  tone,
  value,
  detail,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone: (typeof TONES)[keyof typeof TONES]
  value?: number
  detail?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl px-4 py-4 text-left transition-all enabled:hover:shadow-sm enabled:active:scale-[0.97] ${tone.card}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`size-4 ${tone.icon}`} aria-hidden="true" />
        <span
          className={`text-xs font-medium uppercase tracking-wider ${tone.label}`}
        >
          {label}
        </span>
      </div>
      {value == null ? (
        <>
          <span className="skeleton block h-8 w-14 rounded-md" />
          <span className="skeleton mt-2 block h-3 w-28 rounded-md" />
        </>
      ) : (
        <>
          <p className="text-3xl font-bold">{value}</p>
          <p className={`mt-1 text-xs ${tone.detail}`}>{detail}</p>
        </>
      )}
    </button>
  )
}

const SKELETON_TITLE_WIDTHS = ['w-3/5', 'w-4/5', 'w-1/2', 'w-2/3']

function EventsSummary({
  events,
  onOpen,
}: {
  events?: ScheduledEvent[]
  onOpen?: () => void
}) {
  return (
    <button
      onClick={onOpen}
      disabled={!onOpen}
      className="floating-panel w-full px-6 py-5 text-left transition-all enabled:hover:bg-white/80 enabled:active:scale-[0.98]"
    >
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          What's Happening
        </h2>
        <ChevronRight
          className="ml-auto size-4 text-muted-foreground/50"
          aria-hidden="true"
        />
      </div>
      <ul className="space-y-3">
        {events
          ? events.map((event) => (
              <li key={event.id} className="flex items-baseline gap-3">
                <span className="w-16 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                  {event.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {event.space?.name ?? 'TBD'}
                  </p>
                </div>
              </li>
            ))
          : SKELETON_TITLE_WIDTHS.map((width) => (
              <li key={width} className="flex items-center gap-3">
                <span className="w-16 shrink-0">
                  <span className="skeleton block h-3.5 w-12 rounded-md" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`skeleton block h-3.5 rounded-md ${width}`}
                  />
                  <span className="skeleton mt-1.5 block h-3 w-20 rounded-md" />
                </span>
              </li>
            ))}
      </ul>
    </button>
  )
}

const WEATHER_ICONS: Record<string, LucideIcon> = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rainy: CloudRain,
}

function WeatherCard() {
  const { location, currentTempF, condition, hourly } = MOCK_WEATHER
  const Current = WEATHER_ICONS[condition]
  return (
    <div className="floating-panel bg-sky-50/60 px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {location}
          </p>
          <p className="text-3xl font-bold">{currentTempF}°F</p>
        </div>
        <Current className="size-10 text-sky-500" aria-hidden="true" />
      </div>
      <div className="flex gap-4">
        {hourly.map(({ hour, tempF, condition }) => {
          const Icon = WEATHER_ICONS[condition]
          return (
            <div key={hour} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{hour}</span>
              <Icon className="size-5 text-sky-400" aria-hidden="true" />
              <span className="text-sm font-medium">{tempF}°</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SearchButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="floating-panel flex w-full items-center gap-3 px-5 py-4 text-left transition-colors enabled:hover:bg-white/80 enabled:active:scale-[0.98]"
    >
      <Search className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-lg text-muted-foreground/60">
        Search people, spaces, events...
      </span>
    </button>
  )
}

/** Today's events as a timeline; picking one highlights its room on the plan. */
function EventsTimeline({
  events,
  focusedEventId,
  bookedSpaceIds,
  onBook,
  dispatch,
}: {
  events: ScheduledEvent[]
  focusedEventId: string | null
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
  dispatch: Dispatch<KioskAction>
}) {
  const attending = events.reduce((sum, e) => sum + e.attendeeCount, 0)

  return (
    <div
      className="floating-panel kiosk-fade-in overflow-hidden"
      style={{ width: PANEL.dashboardWidth }}
    >
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button
          onClick={() => dispatch({ type: 'showEvents', open: false })}
          aria-label="Back to dashboard"
          className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent active:scale-95"
        >
          <ArrowLeft
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
        <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Today's Schedule
        </h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {events.length}
        </span>
      </div>

      <div className="kiosk-scroll max-h-[65vh] overflow-y-auto px-5 pb-5">
        <div className="relative">
          <div
            className="absolute top-3 bottom-3 left-[15px] w-px bg-border/60"
            aria-hidden="true"
          />
          <ul className="space-y-2">
            {events.map((event) => {
              const focused = event.id === focusedEventId
              return (
                <li key={event.id}>
                  <button
                    onClick={() =>
                      dispatch({
                        type: 'focusEvent',
                        id: focused ? null : event.id,
                      })
                    }
                    className={`relative flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
                      focused ? 'bg-accent/60 shadow-sm' : 'hover:bg-accent/40'
                    }`}
                  >
                    <div className="relative z-10 mt-1 flex size-[30px] shrink-0 items-center justify-center">
                      <span
                        className={`size-2.5 rounded-full ${EVENT_STYLES[event.category].dot} ${
                          focused ? 'ring-4 ring-primary/15' : ''
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {event.time}
                        </span>
                        <EventBadge category={event.category} />
                      </div>
                      <p className="text-sm font-semibold">{event.title}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden="true" />
                        {event.space?.name ?? 'TBD'}
                      </div>
                    </div>
                  </button>

                  {focused && (
                    <div className="kiosk-fade-in mt-1 mb-1 ml-[42px] overflow-hidden rounded-xl border border-border/40 bg-white/50">
                      <div className="flex items-center gap-2 border-b border-border/30 px-5 py-2.5 text-xs text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {event.time} – {event.endTime}
                      </div>
                      <EventInfo
                        event={event}
                        bookedSpaceIds={bookedSpaceIds}
                        onBook={onBook}
                        onNavigate={(space) =>
                          dispatch({
                            type: 'select',
                            item: { type: 'space', data: space },
                          })
                        }
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/30 px-5 py-3 text-xs text-muted-foreground">
        <Users className="size-3.5" aria-hidden="true" />
        {attending} people across {events.length} events today
      </div>
    </div>
  )
}

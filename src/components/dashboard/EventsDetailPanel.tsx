import { useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Sparkles,
  Users,
  Briefcase,
  Heart,
} from 'lucide-react'
import { getInitials, avatarColor } from '#/core/domain/avatar'
import { SpaceDetailCard } from '#/components/SpaceDetailCard'
import type { EventCategory, ScheduledEvent } from '#/core/domain/types'

export const CATEGORY_STYLE: Record<
  EventCategory,
  { bg: string; text: string; icon: typeof Sparkles }
> = {
  wellness: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Heart },
  meeting: { bg: 'bg-violet-100', text: 'text-violet-700', icon: Briefcase },
  social: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Sparkles },
  review: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
}

const TIMELINE_COLORS: Record<EventCategory, string> = {
  wellness: 'bg-emerald-400',
  meeting: 'bg-violet-400',
  social: 'bg-amber-400',
  review: 'bg-blue-400',
}

export function OrganizerAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex size-8 items-center justify-center rounded-full text-xs font-semibold"
      style={{
        backgroundColor: avatarColor(name),
        color: 'oklch(0.35 0.05 260)',
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  )
}

export function AttendeeStack({ count }: { count: number }) {
  const shown = Math.min(count, 4)
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => {
          const hues = [260, 330, 155, 30]
          return (
            <div
              key={i}
              className="flex size-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold"
              style={{
                backgroundColor: `oklch(0.88 0.04 ${hues[i % hues.length]})`,
                color: 'oklch(0.4 0.05 260)',
              }}
              aria-hidden="true"
            />
          )
        })}
      </div>
      <span className="ml-2 text-xs text-muted-foreground">
        {count} attending
      </span>
    </div>
  )
}

interface EventsDetailPanelProps {
  events: ScheduledEvent[]
  onBack: () => void
  onNavigateToSpace?: (spaceId: string) => void
  onHighlightSpace?: (spaceId: string | null) => void
  bookedSpaceIds?: Set<string>
  onBook?: (spaceId: string) => void
}

export function EventsDetailPanel({
  events,
  onBack,
  onNavigateToSpace,
  onHighlightSpace,
  bookedSpaceIds,
  onBook,
}: EventsDetailPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // The selected event's space is the one strongly highlighted on the map.
  const toggleSelected = (event: ScheduledEvent) => {
    const next = selectedId === event.id ? null : event
    setSelectedId(next?.id ?? null)
    onHighlightSpace?.(next?.space?.id ?? null)
  }

  return (
    <div className="floating-panel kiosk-fade-in w-[400px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button
          onClick={onBack}
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

      {/* Timeline */}
      <div className="kiosk-scroll max-h-[65vh] overflow-y-auto px-5 pb-5">
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute top-3 bottom-3 left-[15px] w-px bg-border/60"
            aria-hidden="true"
          />

          <ul className="space-y-2">
            {events.map((event) => {
              const isSelected = selectedId === event.id
              const catStyle = CATEGORY_STYLE[event.category]
              const CatIcon = catStyle.icon
              const spaceName = event.space?.name ?? 'TBD'

              return (
                <li key={event.id}>
                  <button
                    onClick={() => toggleSelected(event)}
                    className={`relative w-full rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-accent/60 shadow-sm'
                        : 'hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-1 flex size-[30px] shrink-0 items-center justify-center">
                        <span
                          className={`size-2.5 rounded-full ${TIMELINE_COLORS[event.category]} ${
                            isSelected ? 'ring-4 ring-primary/15' : ''
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            {event.time}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle.bg} ${catStyle.text}`}
                          >
                            <CatIcon className="size-2.5" aria-hidden="true" />
                            {event.category}
                          </span>
                        </div>
                        <p className="text-sm font-semibold">{event.title}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" aria-hidden="true" />
                          {spaceName}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded info card */}
                  {isSelected && (
                    <div className="ml-[42px] mt-1 mb-1 overflow-hidden rounded-xl border border-border/40 bg-white/50 kiosk-fade-in">
                      {/* Duration bar */}
                      <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2.5">
                        <Clock
                          className="size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-xs text-muted-foreground">
                          {event.time} – {event.endTime}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="px-4 py-3">
                        <p className="text-sm leading-relaxed text-foreground/80">
                          {event.description}
                        </p>
                      </div>

                      {/* Space details */}
                      {event.space && (
                        <div className="border-t border-border/30 px-4 py-3">
                          <SpaceDetailCard
                            space={event.space}
                            isBooked={bookedSpaceIds?.has(event.space.id)}
                            onBook={onBook}
                          />
                        </div>
                      )}

                      {/* Organizer + attendees */}
                      <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <OrganizerAvatar name={event.organizer} />
                          <div>
                            <p className="text-xs font-medium">
                              {event.organizer}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Organizer
                            </p>
                          </div>
                        </div>
                        <AttendeeStack count={event.attendeeCount} />
                      </div>

                      {/* Navigate to space */}
                      {onNavigateToSpace && event.space && (
                        <div className="border-t border-border/30 px-4 py-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onNavigateToSpace(event.space!.id)
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 active:scale-[0.97]"
                          >
                            <Navigation className="size-4" aria-hidden="true" />
                            Navigate to {spaceName}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-border/30 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          <span>
            {events.reduce((sum, e) => sum + e.attendeeCount, 0)} people across{' '}
            {events.length} events today
          </span>
        </div>
      </div>
    </div>
  )
}

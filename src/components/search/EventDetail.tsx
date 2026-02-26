import { ArrowLeft, Calendar, Clock, MapPin, Navigation } from 'lucide-react'
import type { ScheduledEvent, SearchableItem } from '#/core/domain/types'
import {
  AttendeeStack,
  CATEGORY_STYLE,
  OrganizerAvatar,
} from '#/components/dashboard/EventsDetailPanel'
import { SpaceDetailCard } from '#/components/SpaceDetailCard'

interface EventDetailProps {
  event: ScheduledEvent
  backButtonRef: React.RefObject<HTMLButtonElement | null>
  onBack: () => void
  onSelect: (item: SearchableItem | null) => void
  bookedSpaceIds?: Set<string>
  onBook?: (spaceId: string) => void
}

export function EventDetail({
  event,
  backButtonRef,
  onBack,
  onSelect,
  bookedSpaceIds,
  onBook,
}: EventDetailProps) {
  const catStyle = CATEGORY_STYLE[event.category]
  const CatIcon = catStyle.icon

  return (
    <section
      className="floating-panel kiosk-fade-in overflow-hidden"
      aria-label={`Event: ${event.title}`}
    >
      {/* Back button */}
      <button
        ref={backButtonRef}
        onClick={onBack}
        className="flex h-12 w-full items-center gap-2 px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.98]"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
        Back to search
      </button>

      {/* Event header */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-xl bg-sky-50"
            aria-hidden="true"
          >
            <Calendar className="size-6 text-sky-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{event.title}</h2>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-3" aria-hidden="true" />
                {event.time} – {event.endTime}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle.bg} ${catStyle.text}`}
              >
                <CatIcon className="size-2.5" aria-hidden="true" />
                {event.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-border/30 px-5 py-3">
        <p className="text-sm leading-relaxed text-foreground/80">
          {event.description}
        </p>
      </div>

      {/* Space details */}
      {event.space && (
        <div className="border-t border-border/30 px-5 py-3">
          <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            {event.space.name}
          </div>
          <SpaceDetailCard
            space={event.space}
            isBooked={bookedSpaceIds?.has(event.space.id)}
            onBook={onBook}
          />
        </div>
      )}

      {/* Organizer + attendees */}
      <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <OrganizerAvatar name={event.organizer} />
          <div>
            <p className="text-xs font-medium">{event.organizer}</p>
            <p className="text-[10px] text-muted-foreground">Organizer</p>
          </div>
        </div>
        <AttendeeStack count={event.attendeeCount} />
      </div>

      {/* Navigate to space button */}
      {event.space && (
        <div className="border-t border-border/30 px-5 py-3">
          <button
            onClick={() => onSelect({ type: 'space', data: event.space! })}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 active:scale-[0.97]"
          >
            <Navigation className="size-4" aria-hidden="true" />
            Navigate to {event.space.name}
          </button>
        </div>
      )}
    </section>
  )
}

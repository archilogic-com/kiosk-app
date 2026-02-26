import { Calendar, ChevronRight } from 'lucide-react'
import type { ScheduledEvent } from '#/core/domain/types'
interface EventsPanelProps {
  events: ScheduledEvent[]
  onExpand?: () => void
}

export function EventsPanel({ events, onExpand }: EventsPanelProps) {
  return (
    <button
      onClick={onExpand}
      className="floating-panel w-full px-6 py-5 text-left transition-all hover:bg-white/80 active:scale-[0.98]"
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
        {events.map((event) => (
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
        ))}
      </ul>
    </button>
  )
}

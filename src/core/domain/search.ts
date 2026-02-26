import type {
  ScheduledEvent,
  SearchableItem,
  Space,
  Workstation,
} from '#/core/domain/types'
import { isDestination } from '#/core/domain/types'

export interface SearchInput {
  query: string
  categoryFilter: string | null
  workstations: Workstation[]
  spaces: Space[]
  events: ScheduledEvent[]
}

const matchesWorkstation = (w: Workstation, q: string) =>
  !q ||
  Boolean(w.occupantName?.toLowerCase().includes(q)) ||
  Boolean(w.employeeId?.toLowerCase().includes(q))

const matchesEvent = (e: ScheduledEvent, q: string) =>
  !q ||
  e.title.toLowerCase().includes(q) ||
  e.organizer.toLowerCase().includes(q)

/**
 * With a category selected, everything in that category is listed. With only
 * free text, all three kinds are matched. With neither, nothing: the kiosk
 * shows the dashboard rather than an undifferentiated list of the whole floor.
 */
export function searchItems({
  query,
  categoryFilter,
  workstations,
  spaces,
  events,
}: SearchInput): SearchableItem[] {
  const q = query.trim().toLowerCase()

  if (categoryFilter === 'people') {
    return workstations
      .filter((w) => w.occupantName && matchesWorkstation(w, q))
      .map((data) => ({ type: 'workstation', data }))
  }

  if (categoryFilter === 'events') {
    return events
      .filter((e) => matchesEvent(e, q))
      .map((data) => ({ type: 'event', data }))
  }

  if (categoryFilter) {
    return spaces
      .filter(
        (s) =>
          s.category === categoryFilter &&
          isDestination(s) &&
          (!q || s.name.toLowerCase().includes(q)),
      )
      .map((data) => ({ type: 'space', data }))
  }

  if (!q) return []

  return [
    ...workstations
      .filter((w) => matchesWorkstation(w, q))
      .map((data): SearchableItem => ({ type: 'workstation', data })),
    ...spaces
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((data): SearchableItem => ({ type: 'space', data })),
    ...events
      .filter((e) => matchesEvent(e, q))
      .map((data): SearchableItem => ({ type: 'event', data })),
  ]
}

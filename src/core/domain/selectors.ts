import type { NodeStyles } from '#/core/highlight/compute'
import type { DeepLink } from '#/core/domain/deep-link'
import type { KioskState } from '#/core/domain/state'
import type {
  NavigableItem,
  ScheduledEvent,
  SearchableItem,
  Space,
  Workstation,
} from '#/core/domain/types'

/**
 * Things every UI derives from the kiosk's state. Kept here so a second
 * front end reads the same conclusions from the same state rather than
 * re-deriving them, and so they can be tested without either.
 */

/** The selection as a route target, if it has a position on the plan. */
export function navigationTarget(
  selected: SearchableItem | null,
): NavigableItem | null {
  return selected && selected.type !== 'event' ? selected : null
}

export function hoveredWorkstationId(
  hovered: SearchableItem | null,
): string | null {
  return hovered?.type === 'workstation' ? hovered.data.id : null
}

/**
 * Which occupied workstations get an avatar marker:
 * - the people layer, or the people filter → everyone on the floor
 * - a free-text search → only the people it matched
 * - a chosen destination → none, the route has the plan
 */
export function peopleToMark(
  state: Pick<KioskState, 'selected' | 'categoryFilter'>,
  results: SearchableItem[],
  workstations: Workstation[],
  showPeopleLayer: boolean,
): Workstation[] {
  if (state.selected) return []
  if (showPeopleLayer || state.categoryFilter === 'people') {
    return workstations.filter((w) => w.occupantName)
  }
  if (!state.categoryFilter) {
    return results.flatMap((r) => (r.type === 'workstation' ? [r.data] : []))
  }
  return []
}

/** The route's styles win over highlights for the same node. */
export function mergeNodeStyles(
  highlights: NodeStyles,
  route: NodeStyles,
): NodeStyles {
  return { ...highlights, ...route }
}

/** Meeting rooms the floor reports as unbookable, plus this session's bookings. */
export function bookedSpaceIds(
  spaces: Space[],
  sessionBookedIds: Iterable<string>,
): Set<string> {
  const ids = new Set(sessionBookedIds)
  for (const space of spaces) {
    if (space.category === 'meet' && space.isBookable === false) {
      ids.add(space.id)
    }
  }
  return ids
}

/** Category chip counts, with the virtual `events` category included. */
export function categoryCountsWith(
  counts: Record<string, number>,
  events: ScheduledEvent[],
): Record<string, number> {
  return { ...counts, events: events.length }
}

/** The item a deep link points at, once the floor it references has loaded. */
export function resolveDeepLink(
  link: DeepLink,
  spaces: Space[],
  workstations: Workstation[],
): NavigableItem | null {
  if (link.type === 'workstation') {
    const data = workstations.find((w) => w.id === link.id)
    return data ? { type: 'workstation', data } : null
  }
  const data = spaces.find((s) => s.id === link.id)
  return data ? { type: 'space', data } : null
}

export interface GroupedResults {
  workstations: Array<Extract<SearchableItem, { type: 'workstation' }>>
  /** Spaces keyed by category, in the order they were first seen. */
  spacesByCategory: Record<
    string,
    Array<Extract<SearchableItem, { type: 'space' }>>
  >
  events: Array<Extract<SearchableItem, { type: 'event' }>>
}

/** Results as the list shows them: people, then spaces per category, then events. */
export function groupResults(results: SearchableItem[]): GroupedResults {
  const grouped: GroupedResults = {
    workstations: [],
    spacesByCategory: {},
    events: [],
  }
  for (const item of results) {
    if (item.type === 'workstation') grouped.workstations.push(item)
    else if (item.type === 'event') grouped.events.push(item)
    else (grouped.spacesByCategory[item.data.category] ??= []).push(item)
  }
  return grouped
}

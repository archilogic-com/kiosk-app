import type { Vector2 } from '@archilogic/floor-plan-sdk'
import { CONFIG_PARAMS } from '#/config'

// ── The floor, as the kiosk sees it ─────────────────────────────────────

/** A workstation asset (`element:asset` with `subCategory: 'workstation'`). */
export interface Workstation {
  id: string
  position: Vector2
  occupantName: string | null
  employeeId: string | null
}

/** A space on the floor, as returned by `getSpaces()`. */
export interface Space {
  id: string
  name: string
  position: Vector2
  category: string
  subCategory: string
  area?: number
  seatCapacity?: number
  isBookable?: boolean
}

export type EventCategory = 'wellness' | 'meeting' | 'social' | 'review'

export interface ScheduledEvent {
  id: string
  time: string
  endTime: string
  title: string
  description: string
  organizer: string
  attendeeCount: number
  category: EventCategory
  space: Space | null
}

export type SearchableItem =
  | { type: 'workstation'; data: Workstation }
  | { type: 'space'; data: Space }
  | { type: 'event'; data: ScheduledEvent }

/** Items with a position on the floor plan, so they can be navigated to. */
export type NavigableItem = Exclude<SearchableItem, { type: 'event' }>

/**
 * Archilogic space categories. `circulate` and `none` are left out of search
 * because corridors and undefined spaces are not destinations.
 * https://developers.archilogic.com/space-graph/spaces.html
 */
export const CATEGORY_LABELS: Record<string, string> = {
  people: 'People',
  meet: 'Meeting Rooms',
  socialize: 'Social Spaces',
  work: 'Workspaces',
  care: 'Amenities',
  support: 'Facilities',
}

/** `hub` spaces are open collaboration zones, not bookable destinations. */
export const isDestination = (space: Pick<Space, 'subCategory'>): boolean =>
  space.subCategory !== 'hub'

/** Colours the kiosk draws itself: the path and the avatars. */
export const KIOSK_COLORS = {
  path: '#3b6de0',
  pathHighlightOpacity: 0.12,
  avatarText: 'oklch(0.35 0.05 260)',
} as const

// ── What the visitor is doing ───────────────────────────────────────────

/** Where a visitor dragged one end of the route, and what sits there. */
export interface PlacedPoint {
  position: Vector2
  name: string
}

/**
 * What the kiosk is currently doing.
 *
 * Deliberately not everything the app stores: layer toggles and theme choices
 * are operator settings rather than part of the visitor's journey, and stay
 * in the component that owns them.
 */
export interface KioskState {
  mode: 'dashboard' | 'wayfinding'
  query: string
  categoryFilter: string | null
  selected: SearchableItem | null
  hovered: SearchableItem | null
  /** The origin marker, if the visitor moved it away from the kiosk. */
  originOverride: PlacedPoint | null
  /** The destination marker, if the visitor moved it off the selected item. */
  destinationOverride: PlacedPoint | null
  /** The dashboard is showing today's events, with one of them expanded. */
  eventsOpen: boolean
  focusedEventId: string | null
}

export type KioskAction =
  /** Back to the start: idle timeout, or the visitor pressing home. */
  | { type: 'reset' }
  /** Leave the dashboard for the search and wayfinding view. */
  | { type: 'startSearch' }
  | { type: 'setQuery'; query: string }
  | { type: 'setCategoryFilter'; category: string | null }
  | { type: 'select'; item: SearchableItem | null }
  | { type: 'hover'; item: SearchableItem | null }
  | { type: 'moveOrigin'; point: PlacedPoint }
  | { type: 'moveDestination'; point: PlacedPoint }
  | { type: 'showEvents'; open: boolean }
  | { type: 'focusEvent'; id: string | null }

export const initialKioskState: KioskState = {
  mode: 'dashboard',
  query: '',
  categoryFilter: null,
  selected: null,
  hovered: null,
  originOverride: null,
  destinationOverride: null,
  eventsOpen: false,
  focusedEventId: null,
}

export function reduce(state: KioskState, action: KioskAction): KioskState {
  switch (action.type) {
    // Everything the visitor did goes, including where they dragged the
    // markers: the next person should find the kiosk where it stands.
    case 'reset':
      return initialKioskState

    case 'startSearch':
      return { ...state, mode: 'wayfinding' }

    case 'setQuery':
      return { ...state, query: action.query }

    // Choosing a category replaces free text rather than compounding with it,
    // so the two can never disagree about what is being listed. Clearing the
    // category leaves the text alone: typing is what clears it.
    case 'setCategoryFilter':
      return {
        ...state,
        categoryFilter: action.category,
        query: action.category ? '' : state.query,
      }

    // Selecting a destination is what moves the kiosk into wayfinding, whether
    // it came from the list, the plan, the dashboard or a deep link. Hover is
    // dropped: the list unmounts on click before it can report the pointer
    // leaving. A dragged destination belonged to the previous choice, so it
    // goes too, and so does the dashboard's events panel.
    case 'select':
      return {
        ...state,
        selected: action.item,
        hovered: null,
        destinationOverride: null,
        mode: action.item ? 'wayfinding' : state.mode,
        eventsOpen: false,
        focusedEventId: null,
      }

    // A selection outranks a hover, so previewing under one is meaningless.
    case 'hover':
      return state.selected ? state : { ...state, hovered: action.item }

    case 'moveOrigin':
      return { ...state, originOverride: action.point }

    case 'moveDestination':
      return { ...state, destinationOverride: action.point }

    case 'showEvents':
      return { ...state, eventsOpen: action.open, focusedEventId: null }

    case 'focusEvent':
      return { ...state, focusedEventId: action.id }

    default:
      return state
  }
}

// ── Reading the state ───────────────────────────────────────────────────

/** The selection as a route target, if it has a position on the plan. */
export function navigationTarget(
  selected: SearchableItem | null,
): NavigableItem | null {
  return selected && selected.type !== 'event' ? selected : null
}

/** A space or workstation by id, looking in both when the type is unknown. */
export function findItem(
  floor: { spaces: Space[]; workstations: Workstation[] },
  id: string,
  type?: NavigableItem['type'],
): NavigableItem | null {
  if (type !== 'workstation') {
    const space = floor.spaces.find((s) => s.id === id)
    if (space) return { type: 'space', data: space }
  }
  if (type !== 'space') {
    const workstation = floor.workstations.find((w) => w.id === id)
    if (workstation) return { type: 'workstation', data: workstation }
  }
  return null
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

export function computeFloorStats(
  workstations: Workstation[],
  spaces: Space[],
  bookedSpaceIds: Set<string>,
) {
  const meetingRooms = spaces.filter(
    (s) => s.category === 'meet' && isDestination(s),
  )
  const booked = meetingRooms.filter((s) => bookedSpaceIds.has(s.id)).length
  return {
    attendance: workstations.filter((w) => w.occupantName).length,
    totalWorkstations: workstations.length,
    freeRooms: meetingRooms.length - booked,
    totalMeetingRooms: meetingRooms.length,
  }
}

// ── Search ──────────────────────────────────────────────────────────────

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
}: {
  query: string
  categoryFilter: string | null
  workstations: Workstation[]
  spaces: Space[]
  events: ScheduledEvent[]
}): SearchableItem[] {
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

/** Results as the list shows them: people, then spaces per category, then events. */
export function groupResults(results: SearchableItem[]) {
  const workstations: Workstation[] = []
  /** Keyed by category, in the order each category was first seen. */
  const spacesByCategory: Record<string, Space[]> = {}
  const events: ScheduledEvent[] = []
  for (const item of results) {
    if (item.type === 'workstation') workstations.push(item.data)
    else if (item.type === 'event') events.push(item.data)
    else (spacesByCategory[item.data.category] ??= []).push(item.data)
  }
  return { workstations, spacesByCategory, events }
}

// ── Deep links ──────────────────────────────────────────────────────────

/**
 * `?to=<id>&type=space|workstation&directions=1` opens the kiosk straight on a
 * destination, so a QR code or a link in an invite can point at a room.
 */
export interface DeepLink {
  id: string
  type: NavigableItem['type']
  directionsOpen: boolean
}

export function parseDeepLink(
  search: string = window.location.search,
): DeepLink | null {
  const params = new URLSearchParams(search)
  const id = params.get('to')
  const type = params.get('type')
  if (!id || (type !== 'space' && type !== 'workstation')) return null
  return { id, type, directionsOpen: params.get('directions') === '1' }
}

/** Strip the deep-link params so a reload doesn't re-trigger navigation. */
export function clearDeepLink(): void {
  const url = new URL(window.location.href)
  for (const key of ['to', 'type', 'directions']) url.searchParams.delete(key)
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

/**
 * The inverse of `parseDeepLink`: a URL that opens the kiosk on `item`. Keeps
 * the params that chose the floor, so the link opens on the same one.
 */
export function buildDeepLink(
  item: NavigableItem,
  directionsOpen: boolean,
  base: string = window.location.href,
): string {
  const url = new URL(base)
  const kept = new Set<string>(Object.values(CONFIG_PARAMS))
  for (const key of [...url.searchParams.keys()]) {
    if (!kept.has(key)) url.searchParams.delete(key)
  }
  url.searchParams.set('to', item.data.id)
  url.searchParams.set('type', item.type)
  if (directionsOpen) url.searchParams.set('directions', '1')
  return url.toString()
}

// ── Formatting ──────────────────────────────────────────────────────────

/** Average walking speed in m/s, used to turn path length into a duration. */
const WALKING_SPEED_MS = 1.4

/** `openWorkspace` / `open_office` → `Open Workspace`, for taxonomy values shown in the UI. */
export function formatSpaceType(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** `36` metres → `<1 min walk`, `250` → `~3 min walk`. */
export function formatWalkingTime(distanceM: number): string {
  const seconds = distanceM / WALKING_SPEED_MS
  if (seconds < 60) return '<1 min walk'
  return `~${Math.round(seconds / 60)} min walk`
}

/** What a destination is called on its marker and in its panel. */
export function labelFor(item: NavigableItem): string {
  return item.type === 'workstation'
    ? (item.data.occupantName ?? item.data.id)
    : item.data.name
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Pastel hues for avatar backgrounds, picked deterministically by name. */
const AVATAR_HUES = [260, 330, 200, 30, 160, 290, 50, 100]

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return `oklch(0.90 0.04 ${AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length]})`
}

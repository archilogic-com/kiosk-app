import type { Vector2 } from '@archilogic/floor-plan-sdk'

/** A workstation asset (`element:asset` with `subCategory: 'workstation'`). */
export interface Workstation {
  id: string
  position: Vector2
  occupantName: string | null
  employeeId: string | null
  available: boolean
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
 * Archilogic space categories. `circulate` and `none` are excluded from search
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

export const EXCLUDED_CATEGORIES = ['circulate', 'none']

/** `hub` spaces are open collaboration zones, not bookable destinations. */
export const NON_DESTINATION_SUBCATEGORIES = ['hub']

/** True for spaces a visitor can be sent to or count as a room. */
export const isDestination = (space: Pick<Space, 'subCategory'>): boolean =>
  !NON_DESTINATION_SUBCATEGORIES.includes(space.subCategory)

/**
 * The quick filters offered on the search screen, in display order. `people`
 * and `events` are virtual categories that reshape the results rather than
 * filtering spaces.
 */
export const SEARCH_CATEGORIES: ReadonlyArray<{ key: string; label: string }> =
  [
    { key: 'people', label: 'People' },
    { key: 'meet', label: 'Rooms' },
    { key: 'events', label: 'Events' },
    { key: 'care', label: 'Amenities' },
    { key: 'work', label: 'Workspaces' },
  ]

/** Colours the kiosk draws itself: paths, markers, avatars. */
export const KIOSK_COLORS = {
  path: '#3b6de0',
  pathHighlightOpacity: 0.12,
  markerOuter: '#3b6de0',
  avatarText: 'oklch(0.35 0.05 260)',
} as const

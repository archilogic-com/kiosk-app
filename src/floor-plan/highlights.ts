/**
 * What is tinted on the plan, and why.
 *
 * Every highlight (hover, selection, category filter, search results, the
 * dashboard's events, the route's destination) resolves to one list here,
 * which the theme then applies. Nothing paints the plan imperatively, so
 * nothing has to reconstruct a previous colour in order to undo itself.
 */
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { CATEGORY_COLORS, hexToRgb } from '#/floor-plan/theme'
import type { NodeStyle } from '#/floor-plan/theme'
import { KIOSK_COLORS, isDestination } from '#/kiosk-state'
import type {
  KioskState,
  ScheduledEvent,
  SearchableItem,
  Space,
} from '#/kiosk-state'

/** Meeting-room availability, shown when the `meet` category is filtered. */
const BOOKING_FILL = { available: '#86c5a0', booked: '#d4908c' }

const OPACITY = {
  hover: 0.7,
  selected: 0.6,
  searchResult: 0.55,
  contextual: 0.3,
  furniture: 0.45,
}

/** Element types inside a space that are tinted along with it. */
type FurnitureType = 'element:asset' | 'element:casework' | 'element:kitchen'
const FURNITURE_TYPES = new Set<string>([
  'element:asset',
  'element:casework',
  'element:kitchen',
])
const isFurniture = (type: string): type is FurnitureType =>
  FURNITURE_TYPES.has(type)

export interface Highlight {
  id: string
  /** A space, or the workstation a route leads to. */
  type: 'layout:space' | 'element:asset'
  fill: string
  fillOpacity: number
}

export interface HighlightInput extends Pick<
  KioskState,
  'categoryFilter' | 'selected' | 'hovered' | 'eventsOpen' | 'focusedEventId'
> {
  results: SearchableItem[]
  spaces: Space[]
  events: ScheduledEvent[]
  bookedSpaceIds: Set<string>
  /** Where a dragged destination landed; the route tints that space instead. */
  destinationSpaceId: string | null
}

export function computeHighlights(input: HighlightInput): Highlight[] {
  const hovered = spaceOf(input.hovered)
  const base = baseHighlights(input).filter((h) => h.id !== hovered?.id)
  // Hover goes last, so it wins: it is the most immediate feedback on screen.
  return hovered ? [...base, tint(hovered, OPACITY.hover)] : base
}

function baseHighlights({
  categoryFilter,
  selected,
  results,
  spaces,
  events,
  bookedSpaceIds,
  eventsOpen,
  focusedEventId,
  destinationSpaceId,
}: HighlightInput): Highlight[] {
  // A selected event has no route of its own, so highlight where it is.
  if (selected?.type === 'event') {
    const space = selected.data.space
    return space ? [tint(space, OPACITY.selected)] : []
  }

  if (selected) {
    return [
      {
        id: destinationSpaceId ?? selected.data.id,
        type:
          selected.type === 'workstation' && !destinationSpaceId
            ? 'element:asset'
            : 'layout:space',
        fill: KIOSK_COLORS.path,
        fillOpacity: KIOSK_COLORS.pathHighlightOpacity,
      },
    ]
  }

  // People are shown as avatar markers, not tinted spaces.
  if (categoryFilter === 'people') return []

  if (categoryFilter === 'events') {
    return spacesOf(events).map((space) => tint(space, OPACITY.contextual))
  }

  if (categoryFilter) {
    const color = CATEGORY_COLORS[categoryFilter]
    if (!color) return []
    const fillOpacity = Math.min(color.fillOpacity + 0.15, 0.7)
    return spaces
      .filter((s) => s.category === categoryFilter && isDestination(s))
      .map((s): Highlight => ({
        id: s.id,
        type: 'layout:space',
        fill:
          categoryFilter !== 'meet'
            ? color.fill
            : bookedSpaceIds.has(s.id)
              ? BOOKING_FILL.booked
              : BOOKING_FILL.available,
        fillOpacity,
      }))
  }

  if (results.length > 0) {
    return results.flatMap((item) =>
      item.type === 'space' && CATEGORY_COLORS[item.data.category]
        ? [tint(item.data, OPACITY.searchResult)]
        : [],
    )
  }

  if (eventsOpen) {
    const focused = events.find((e) => e.id === focusedEventId)?.space?.id
    return spacesOf(events).map((space) =>
      tint(space, space.id === focused ? OPACITY.selected : OPACITY.contextual),
    )
  }

  return []
}

function tint(space: Space, fillOpacity: number): Highlight {
  return {
    id: space.id,
    type: 'layout:space',
    fill: CATEGORY_COLORS[space.category]?.fill ?? KIOSK_COLORS.path,
    fillOpacity,
  }
}

function spaceOf(item: SearchableItem | null): Space | null {
  if (item?.type === 'space') return item.data
  if (item?.type === 'event') return item.data.space
  return null
}

/** The distinct spaces a list of events is held in. */
function spacesOf(events: ScheduledEvent[]): Space[] {
  const byId = new Map<string, Space>()
  for (const { space } of events) if (space) byId.set(space.id, space)
  return [...byId.values()]
}

/**
 * Expand highlights into node styles for the theme.
 *
 * Furniture inside a highlighted space is tinted a darker shade of it;
 * otherwise it keeps its default fill and reads as holes punched in the zone.
 */
export function toNodeStyles(
  floorPlan: FloorPlanEngine,
  highlights: Highlight[],
): NodeStyle[] {
  const spaceIds = highlights
    .filter((h) => h.type === 'layout:space')
    .map((h) => h.id)
  const spaces =
    spaceIds.length > 0
      ? floorPlan.getSpaces({
          where: { id: { in: spaceIds } },
          select: { id: true, elements: { select: { id: true, type: true } } },
        })
      : []
  const elementsBySpace = new Map(
    spaces.map((space) => [space.id, space.elements] as const),
  )
  const highlighted = new Set(highlights.map((h) => h.id))

  const furniture = highlights.flatMap(({ id, fill }) =>
    (elementsBySpace.get(id) ?? []).flatMap((element): NodeStyle[] =>
      isFurniture(element.type) && !highlighted.has(element.id)
        ? [
            {
              id: element.id,
              type: element.type,
              style: {
                fill: darken(fill, 0.7),
                fillOpacity: OPACITY.furniture,
                strokeWidth: 0,
              },
            },
          ]
        : [],
    ),
  )

  return [
    ...furniture,
    ...highlights.map(({ id, type, fill, fillOpacity }) => ({
      id,
      type,
      style: { fill, fillOpacity },
    })),
  ]
}

/** Scale each channel of a hex colour (0 = black, 1 = unchanged). */
function darken(hex: string, factor: number): number[] {
  return hexToRgb(hex).map((channel) => Math.round(channel * factor))
}

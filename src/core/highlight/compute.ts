import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { ScheduledEvent, SearchableItem, Space } from '#/core/domain/types'
import { CATEGORY_COLORS, rgbTupleToHex } from '#/core/theme/palette'
import { KIOSK_COLORS, isDestination } from '#/core/domain/types'

/** Element types inside a space that should be tinted along with it. */
const ASSET_TYPES = new Set([
  'element:asset',
  'element:casework',
  'element:kitchen',
])

/** Meeting-room availability, shown when the `meet` category is filtered. */
const BOOKING_FILL = { available: '#86c5a0', booked: '#d4908c' } as const

const OPACITY = {
  hover: 0.7,
  selected: 0.6,
  searchResult: 0.55,
  contextual: 0.3,
  asset: 0.45,
} as const

export type NodeStyles = Record<string, Record<string, unknown>>

export interface SpaceHighlight {
  id: string
  fill: string
  fillOpacity: number
}

/** Darken a hex colour by a factor (0 = black, 1 = unchanged). */
export function darken(hex: string, factor: number): string {
  const h = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * factor),
  )
  return '#' + channels.map((c) => c.toString(16).padStart(2, '0')).join('')
}

export function categoryFill(space: Space): string {
  const colour = CATEGORY_COLORS[space.category]
  return colour ? rgbTupleToHex(colour.fill) : KIOSK_COLORS.path
}

/**
 * Expand space highlights into engine node styles.
 *
 * Assets inside a highlighted space are tinted a darker shade of it, otherwise
 * furniture keeps its default fill and reads as holes punched in the zone.
 * `__type` carries the element's type through so `buildFloorPlanTheme` can
 * merge the byType style underneath and the engine never falls back to its own
 * defaults for properties we did not set.
 */
export function toNodeStyles(
  floorPlan: FloorPlanEngine,
  highlights: SpaceHighlight[],
): NodeStyles {
  const styles: NodeStyles = {}

  for (const { id, fill, fillOpacity } of highlights) {
    styles[id] = { __type: 'layout:space', fill, fillOpacity }
  }

  for (const { id, fill } of highlights) {
    // Throws when the id is not a space; a space may also have no elements.
    let elements: Array<{ id: string; type: string }> | undefined
    try {
      elements = floorPlan.getSpacesById({
        id,
        select: { elements: { select: { id: true, type: true } } },
      })?.elements
    } catch {
      continue
    }
    if (!elements) continue

    const assetFill = darken(fill, 0.7)
    for (const element of elements) {
      if (element.id in styles) continue
      if (!ASSET_TYPES.has(element.type)) continue
      styles[element.id] = {
        __type: element.type,
        fill: assetFill,
        fillOpacity: OPACITY.asset,
        strokeWidth: 0,
      }
    }
  }

  return styles
}

export interface HighlightState {
  categoryFilter: string | null
  results: SearchableItem[]
  selectedItem: SearchableItem | null
  hoveredItem: SearchableItem | null
  spaces: Space[]
  events: ScheduledEvent[]
  bookedSpaceIds?: Set<string>
  /** Spaces the dashboard events panel is showing. */
  contextSpaceIds?: string[]
  /** The one space focused within that context, if any. */
  focusSpaceId?: string | null
}

/**
 * The single source of truth for what is tinted on the plan.
 *
 * Every highlight (hover, selection, category filter, search results, the
 * dashboard's event spaces) resolves to one set of styles here, which the
 * theme then applies. Nothing paints the plan imperatively, so nothing has to
 * reconstruct a previous colour in order to undo itself.
 */
export function computeHighlights(state: HighlightState): SpaceHighlight[] {
  const {
    categoryFilter,
    results,
    selectedItem,
    hoveredItem,
    spaces,
    events,
    bookedSpaceIds,
    contextSpaceIds = [],
    focusSpaceId = null,
  } = state

  const byId = new Map(spaces.map((s) => [s.id, s]))
  const resolveHover = (item: SearchableItem | null): Space | null => {
    if (!item) return null
    if (item.type === 'space') return byId.get(item.data.id) ?? item.data
    if (item.type === 'event' && item.data.space)
      return byId.get(item.data.space.id) ?? null
    return null
  }

  // Hover wins: it is the most immediate feedback on screen.
  const hovered = resolveHover(hoveredItem)
  const hover: SpaceHighlight[] = hovered
    ? [
        {
          id: hovered.id,
          fill: categoryFill(hovered),
          fillOpacity: OPACITY.hover,
        },
      ]
    : []

  const base = ((): SpaceHighlight[] => {
    // A selected event has no route of its own, so highlight where it is.
    if (selectedItem?.type === 'event') {
      const space = resolveHover(selectedItem)
      return space
        ? [
            {
              id: space.id,
              fill: categoryFill(space),
              fillOpacity: OPACITY.selected,
            },
          ]
        : []
    }
    // Anything else selected is a destination, and wayfinding owns the plan.
    if (selectedItem) return []

    if (categoryFilter) {
      // People are shown as avatar markers, not tinted spaces.
      if (categoryFilter === 'people') return []

      if (categoryFilter === 'events') {
        const seen = new Set<string>()
        return events.flatMap((event) => {
          const space = event.space
          if (!space || seen.has(space.id)) return []
          seen.add(space.id)
          return [
            {
              id: space.id,
              fill: categoryFill(space),
              fillOpacity: OPACITY.contextual,
            },
          ]
        })
      }

      const colour = CATEGORY_COLORS[categoryFilter]
      if (!colour) return []
      const fill = rgbTupleToHex(colour.fill)
      const fillOpacity = Math.min(colour.fillOpacity + 0.15, 0.7)

      return spaces
        .filter((s) => s.category === categoryFilter && isDestination(s))
        .map((s) => ({
          id: s.id,
          fill:
            categoryFilter === 'meet' && bookedSpaceIds
              ? bookedSpaceIds.has(s.id)
                ? BOOKING_FILL.booked
                : BOOKING_FILL.available
              : fill,
          fillOpacity,
        }))
    }

    if (results.length > 0) {
      return results.flatMap((item) =>
        item.type === 'space' && CATEGORY_COLORS[item.data.category]
          ? [
              {
                id: item.data.id,
                fill: categoryFill(item.data),
                fillOpacity: OPACITY.searchResult,
              },
            ]
          : [],
      )
    }

    if (contextSpaceIds.length > 0) {
      return contextSpaceIds.flatMap((id) => {
        const space = byId.get(id)
        if (!space) return []
        return [
          {
            id,
            fill: categoryFill(space),
            fillOpacity:
              id === focusSpaceId ? OPACITY.selected : OPACITY.contextual,
          },
        ]
      })
    }

    return []
  })()

  // Later entries win in toNodeStyles, so hover goes last.
  return [...base.filter((h) => h.id !== hovered?.id), ...hover]
}

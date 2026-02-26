import type { Vector2 } from '@archilogic/floor-plan-sdk'
import type { SearchableItem } from '#/core/domain/types'

export type KioskMode = 'dashboard' | 'wayfinding'

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
 * local to the panels that own them.
 */
export interface KioskState {
  mode: KioskMode
  query: string
  categoryFilter: string | null
  selected: SearchableItem | null
  hovered: SearchableItem | null
  /** The origin marker, if the visitor moved it away from the kiosk. */
  originOverride: PlacedPoint | null
  /** The destination marker, if the visitor moved it off the selected item. */
  destinationOverride: PlacedPoint | null
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

export const initialKioskState: KioskState = {
  mode: 'dashboard',
  query: '',
  categoryFilter: null,
  selected: null,
  hovered: null,
  originOverride: null,
  destinationOverride: null,
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
    // it came from the list, the plan, or a deep link. Hover is dropped: the
    // list unmounts on click before it can report the pointer leaving. A
    // dragged destination belonged to the previous choice, so it goes too.
    case 'select':
      return {
        ...state,
        selected: action.item,
        hovered: null,
        destinationOverride: null,
        mode: action.item ? 'wayfinding' : state.mode,
      }

    // A selection outranks a hover, so previewing under one is meaningless.
    case 'hover':
      return state.selected ? state : { ...state, hovered: action.item }

    case 'moveOrigin':
      return { ...state, originOverride: action.point }

    case 'moveDestination':
      return { ...state, destinationOverride: action.point }

    default:
      return state
  }
}

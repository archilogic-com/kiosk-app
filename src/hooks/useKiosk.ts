import { useMemo, useReducer, useState } from 'react'
import type { ScheduledEvent, Space, Workstation } from '#/core/domain/types'
import type { KioskAction, KioskState } from '#/core/domain/state'
import { initialKioskState, reduce } from '#/core/domain/state'
import { searchItems } from '#/core/domain/search'
import type { DeepLink } from '#/core/domain/deep-link'
import { parseDeepLink } from '#/core/domain/deep-link'

export interface Kiosk extends KioskState {
  dispatch: React.Dispatch<KioskAction>
  results: ReturnType<typeof searchItems>
  /** The URL the kiosk was opened with, if it named a destination. */
  deepLink: DeepLink | null
}

/**
 * The kiosk's state machine, bound to React.
 *
 * The transitions live in core so a different UI can drive the same machine;
 * this adds only the binding and the derived search results.
 */
export function useKiosk(
  workstations: Workstation[],
  spaces: Space[],
  events: ScheduledEvent[],
): Kiosk {
  const [deepLink] = useState(() => parseDeepLink())

  // A deep link means the visitor already has a destination in mind, so open
  // in wayfinding rather than flashing the dashboard before navigating.
  const [state, dispatch] = useReducer(
    reduce,
    initialKioskState,
    (initial): KioskState =>
      deepLink ? { ...initial, mode: 'wayfinding' } : initial,
  )

  const results = useMemo(
    () =>
      searchItems({
        query: state.query,
        categoryFilter: state.categoryFilter,
        workstations,
        spaces,
        events,
      }),
    [state.query, state.categoryFilter, workstations, spaces, events],
  )

  return { ...state, dispatch, results, deepLink }
}

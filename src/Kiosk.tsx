import { useEffect, useMemo, useReducer, useState } from 'react'
import type { Dispatch } from 'react'
import type {
  FloorPlanEngine,
  FpePointerEvent,
} from '@archilogic/floor-plan-sdk'
import { EXIT_ANIMATION_MS, PANEL } from '#/config'
import { buildMockEvents } from '#/demo-data'
import { resolveClick } from '#/floor-plan/engine'
import type { FloorData } from '#/floor-plan/engine'
import { computeHighlights, toNodeStyles } from '#/floor-plan/highlights'
import { usePeopleMarkers } from '#/floor-plan/markers'
import { floorPlanStyle } from '#/floor-plan/theme'
import { useRoute } from '#/floor-plan/wayfinding'
import {
  bookedSpaceIds,
  clearDeepLink,
  findItem,
  initialKioskState,
  navigationTarget,
  parseDeepLink,
  peopleToMark,
  reduce,
  searchItems,
} from '#/kiosk-state'
import type { KioskAction, KioskState } from '#/kiosk-state'
import { Dashboard } from '#/components/Dashboard'
import { DEFAULT_SETTINGS, MapControls } from '#/components/MapControls'
import { SearchPanel } from '#/components/SearchPanel'

/**
 * The kiosk, once the floor has loaded: what the visitor is doing, and every
 * place that meets the floor plan: the theme, highlights, clicks, the route
 * and the people markers.
 */
export function Kiosk({
  floorPlan,
  floor,
}: {
  floorPlan: FloorPlanEngine
  floor: FloorData
}) {
  const { workstations, spaces } = floor
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const events = useMemo(() => buildMockEvents(spaces), [spaces])

  // A deep link means the visitor already has a destination in mind, so
  // open on it rather than on the dashboard, then strip it from the URL so a
  // reload does not navigate again.
  const [deepLink] = useState(() => parseDeepLink())
  const [state, dispatch] = useReducer(reduce, deepLink, (link): KioskState =>
    link
      ? {
          ...initialKioskState,
          mode: 'wayfinding',
          selected: findItem(floor, link.id, link.type),
        }
      : initialKioskState,
  )
  useEffect(() => {
    if (deepLink) clearDeepLink()
  }, [deepLink])

  const {
    mode,
    query,
    categoryFilter,
    selected,
    hovered,
    eventsOpen,
    focusedEventId,
  } = state
  const results = useMemo(
    () => searchItems({ query, categoryFilter, workstations, spaces, events }),
    [query, categoryFilter, workstations, spaces, events],
  )

  const [sessionBookings, setSessionBookings] = useState<Set<string>>(
    () => new Set(),
  )
  const booked = useMemo(
    () => bookedSpaceIds(spaces, sessionBookings),
    [spaces, sessionBookings],
  )
  const book = (spaceId: string) =>
    setSessionBookings((ids) => new Set(ids).add(spaceId))

  // Wayfinding: pins at either end of the route and the path between them.
  const route = useRoute(floorPlan, {
    kioskPosition: floor.kioskPosition,
    kioskSpaceName: floor.kioskSpaceName,
    target: navigationTarget(selected),
    originOverride: state.originOverride,
    destinationOverride: state.destinationOverride,
    spaces,
    style: settings,
    zoomOnNavigate: settings.zoomOnNavigate,
    onOriginMoved: (point) => dispatch({ type: 'moveOrigin', point }),
    onDestinationMoved: (point) => dispatch({ type: 'moveDestination', point }),
  })

  // Everything tinted on the plan, and the operator's layers and theme, go
  // into one complete style: the only `floorPlan.set` the kiosk makes.
  const nodeStyles = useMemo(
    () =>
      toNodeStyles(
        floorPlan,
        computeHighlights({
          categoryFilter,
          selected,
          hovered,
          eventsOpen,
          focusedEventId,
          results,
          spaces,
          events,
          bookedSpaceIds: booked,
          destinationSpaceId: route.destinationSpace?.id ?? null,
        }),
      ),
    [
      floorPlan,
      categoryFilter,
      selected,
      hovered,
      eventsOpen,
      focusedEventId,
      results,
      spaces,
      events,
      booked,
      route.destinationSpace,
    ],
  )
  const { showCategories, showLabels, showAssets, themeOverrides } = settings
  useEffect(() => {
    floorPlan.set(
      floorPlanStyle({
        layers: { showCategories, showLabels, showAssets },
        overrides: themeOverrides,
        nodeStyles,
      }),
    )
  }, [
    floorPlan,
    showCategories,
    showLabels,
    showAssets,
    themeOverrides,
    nodeStyles,
  ])

  // A click on the plan selects whatever was clicked.
  useEffect(() => {
    const onClick = (event: FpePointerEvent) => {
      const item = resolveClick(floorPlan, event, floor)
      if (item) dispatch({ type: 'select', item })
    }
    floorPlan.on('click', onClick)
    return () => {
      floorPlan.off('click', onClick)
    }
  }, [floorPlan, floor])

  const people = useMemo(
    () =>
      peopleToMark(
        { selected, categoryFilter },
        results,
        workstations,
        settings.showPeople,
      ),
    [selected, categoryFilter, results, workstations, settings.showPeople],
  )
  usePeopleMarkers(
    floorPlan,
    people,
    hovered?.type === 'workstation' ? hovered.data.id : null,
    {
      onHover: (workstation) =>
        dispatch({
          type: 'hover',
          item: workstation && { type: 'workstation', data: workstation },
        }),
      onClick: (workstation) =>
        dispatch({
          type: 'select',
          item: { type: 'workstation', data: workstation },
        }),
    },
  )

  useResetWhenIdle(dispatch)

  // The outgoing panel finishes its exit before the incoming one mounts, so
  // the panel on screen trails `mode` by the length of that animation. The
  // first panel does not slide in: the loading skeleton already did.
  const [shown, setShown] = useState({ mode, entering: false })
  useEffect(() => {
    if (mode === shown.mode) return
    const timer = setTimeout(
      () => setShown({ mode, entering: true }),
      EXIT_ANIMATION_MS,
    )
    return () => clearTimeout(timer)
  }, [mode, shown.mode])
  const exiting = mode !== shown.mode

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute top-4 left-4">
        {shown.mode === 'dashboard' ? (
          <div
            className={
              exiting
                ? 'dashboard-exit'
                : shown.entering
                  ? 'dashboard-enter'
                  : ''
            }
          >
            <Dashboard
              floor={floor}
              events={events}
              state={state}
              bookedSpaceIds={booked}
              onBook={book}
              dispatch={dispatch}
            />
          </div>
        ) : (
          <div
            style={{ width: PANEL.searchWidth }}
            className={
              exiting
                ? 'searchbar-exit'
                : shown.entering
                  ? 'searchbar-enter'
                  : ''
            }
          >
            <SearchPanel
              state={state}
              results={results}
              route={route}
              categoryCounts={{
                ...floor.categoryCounts,
                events: events.length,
              }}
              defaultDirectionsOpen={deepLink?.directionsOpen ?? false}
              bookedSpaceIds={booked}
              onBook={book}
              dispatch={dispatch}
            />
          </div>
        )}
      </div>

      <div className="pointer-events-auto absolute top-4 right-4">
        <MapControls
          settings={settings}
          onChange={(change) => setSettings((s) => ({ ...s, ...change }))}
        />
      </div>
    </div>
  )
}

const IDLE_MS = 60_000
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel']

/**
 * Walking away is the same as pressing home: once the display has gone
 * untouched for a minute, reset for the next visitor. Polls rather than
 * debouncing each event, because pointermove on a touch display fires
 * continuously while someone is using it.
 */
function useResetWhenIdle(dispatch: Dispatch<KioskAction>) {
  useEffect(() => {
    let lastActivity = Date.now()
    const markActive = () => {
      lastActivity = Date.now()
    }
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true })
    }
    const interval = setInterval(() => {
      if (Date.now() - lastActivity < IDLE_MS) return
      markActive()
      dispatch({ type: 'reset' })
    }, 5_000)
    return () => {
      clearInterval(interval)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive)
      }
    }
  }, [dispatch])
}

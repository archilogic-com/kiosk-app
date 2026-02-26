import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildMockEvents } from '#/core/demo-data'
import { useFloorPlan } from '#/hooks/useFloorPlan'
import { useFloorPlanData } from '#/hooks/useFloorPlanData'
import { useFloorPlanLayers } from '#/hooks/useFloorPlanLayers'
import { useKiosk } from '#/hooks/useKiosk'
import { useWayfinding } from '#/hooks/useWayfinding'
import { useMapHighlights } from '#/hooks/useMapHighlights'
import { useFloorPlanClick } from '#/hooks/useFloorPlanClick'
import { useIdleTimer } from '#/hooks/useIdleTimer'
import { EXIT_ANIMATION_MS, PANEL, VIEWPORT_INSETS } from '#/core/domain/layout'
import {
  bookedSpaceIds as computeBookedSpaceIds,
  categoryCountsWith,
  hoveredWorkstationId,
  mergeNodeStyles,
  navigationTarget,
  peopleToMark,
  resolveDeepLink,
} from '#/core/domain/selectors'
import { clearDeepLink } from '#/core/domain/deep-link'
import { zoomToFloor } from '#/core/sdk/zoom'
import { usePeopleMarkers } from '#/hooks/usePeopleMarkers'
import { useThemePreviews } from '#/hooks/useThemePreviews'
import { SearchPanel } from '#/components/search/SearchPanel'
import { MapControls } from '#/components/MapControls'
import { DashboardOverlay } from '#/components/dashboard/DashboardOverlay'
import type { SearchableItem, Workstation } from '#/core/domain/types'
import type { PlacedPoint } from '#/core/domain/state'
import type { ThemeOverrides } from '#/core/theme/defaults'
import { THEME_PRESETS } from '#/core/theme/presets'

export function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { floorPlan, isLoading, error } = useFloorPlan(containerRef)
  const {
    workstations,
    spaces,
    kioskPosition,
    kioskSpaceName,
    categoryCounts,
  } = useFloorPlanData(floorPlan)

  // Operator settings: what the plan shows and how routes are drawn. Not part
  // of the visitor's journey, so they live beside the state machine, not in it.
  const [showCategories, setShowCategories] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showPeople, setShowPeople] = useState(false)
  const [showAssets, setShowAssets] = useState(true)

  const [pathSmoothing, setPathSmoothing] = useState(6)
  const [zoomOnNavigate, setZoomOnNavigate] = useState(false)
  const [pathThickness, setPathThickness] = useState(10)
  const [pathDashed, setPathDashed] = useState(true)
  const [themePresetId, setThemePresetId] = useState<string | null>('default')
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides>(
    () => THEME_PRESETS.find((p) => p.id === 'default')?.overrides ?? {},
  )

  const handleThemePresetChange = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      setThemePresetId(presetId)
      setThemeOverrides(preset.overrides)
    }
  }, [])

  const handleThemeOverridesChange = useCallback(
    (overrides: ThemeOverrides) => {
      setThemePresetId(null)
      setThemeOverrides(overrides)
    },
    [],
  )

  const themePreviews = useThemePreviews(!isLoading && !error, {
    showCategories,
    showLabels,
    showAssets,
  })

  const events = useMemo(() => buildMockEvents(spaces), [spaces])
  const chipCounts = useMemo(
    () => categoryCountsWith(categoryCounts, events),
    [categoryCounts, events],
  )

  const {
    mode,
    query,
    categoryFilter,
    selected,
    hovered,
    originOverride,
    destinationOverride,
    results,
    dispatch,
    deepLink,
  } = useKiosk(workstations, spaces, events)

  // The outgoing panel finishes its exit before the incoming one mounts,
  // so displayMode trails mode by the length of that animation.
  const [displayMode, setDisplayMode] = useState(mode)
  useEffect(() => {
    if (mode === displayMode) return
    const timer = setTimeout(() => setDisplayMode(mode), EXIT_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [mode, displayMode])
  const isExiting = mode !== displayMode

  // Spaces booked during this session (the visitor pressed "Book room").
  const [sessionBookedIds, setSessionBookedIds] = useState<Set<string>>(
    new Set(),
  )
  const handleBook = useCallback((spaceId: string) => {
    setSessionBookedIds((prev) => new Set(prev).add(spaceId))
  }, [])
  const bookedSpaceIds = useMemo(
    () => computeBookedSpaceIds(spaces, sessionBookedIds),
    [spaces, sessionBookedIds],
  )

  const target = navigationTarget(selected)
  const pathStyle = useMemo(
    () => ({
      smoothing: pathSmoothing,
      thickness: pathThickness,
      dashed: pathDashed,
    }),
    [pathSmoothing, pathThickness, pathDashed],
  )
  const handleOriginMoved = useCallback(
    (point: PlacedPoint) => dispatch({ type: 'moveOrigin', point }),
    [dispatch],
  )
  const handleDestinationMoved = useCallback(
    (point: PlacedPoint) => dispatch({ type: 'moveDestination', point }),
    [dispatch],
  )
  const { distance, directions, pathError, nodeStyles, destinationSpaceId } =
    useWayfinding(
      floorPlan,
      {
        kioskPosition,
        kioskSpaceName,
        target,
        originOverride,
        destinationOverride,
        spaces,
        style: pathStyle,
        zoomOnNavigate,
        insets: VIEWPORT_INSETS,
      },
      {
        onOriginMoved: handleOriginMoved,
        onDestinationMoved: handleDestinationMoved,
      },
    )

  // Spaces the dashboard's events panel is currently showing.
  const [dashboardEventSpaceIds, setDashboardEventSpaceIds] = useState<
    string[]
  >([])
  const [dashboardFocusSpaceId, setDashboardFocusSpaceId] = useState<
    string | null
  >(null)

  const handleHighlightSpaces = useCallback((spaceIds: string[]) => {
    setDashboardEventSpaceIds(spaceIds)
  }, [])

  const handleHighlightSpace = useCallback((spaceId: string | null) => {
    setDashboardFocusSpaceId(spaceId)
  }, [])

  const highlightByIds = useMapHighlights(floorPlan, {
    categoryFilter,
    results,
    selectedItem: selected,
    hoveredItem: hovered,
    spaces,
    events,
    bookedSpaceIds,
    contextSpaceIds: dashboardEventSpaceIds,
    focusSpaceId: dashboardFocusSpaceId,
  })

  const mergedByIds = useMemo(
    () => mergeNodeStyles(highlightByIds, nodeStyles),
    [highlightByIds, nodeStyles],
  )

  useFloorPlanLayers(floorPlan, {
    showCategories,
    showLabels,
    showAssets,
    byId: mergedByIds,
    themeOverrides,
  })

  // On first load, frame the floor within the area the panels leave visible.
  useEffect(() => {
    if (floorPlan) zoomToFloor(floorPlan, VIEWPORT_INSETS, false)
  }, [floorPlan])

  const handleFloorPlanSelect = useCallback(
    (item: SearchableItem | null) => dispatch({ type: 'select', item }),
    [dispatch],
  )

  useFloorPlanClick(floorPlan, workstations, spaces, handleFloorPlanSelect)

  const handleActivateWayfinding = useCallback(
    () => dispatch({ type: 'startSearch' }),
    [dispatch],
  )

  // The dashboard's stat tiles are shortcuts into a filtered search.
  const browseCategory = useCallback(
    (category: string) => {
      dispatch({ type: 'setCategoryFilter', category })
      dispatch({ type: 'startSearch' })
    },
    [dispatch],
  )
  const handleViewAttendance = useCallback(
    () => browseCategory('people'),
    [browseCategory],
  )
  const handleViewFreeRooms = useCallback(
    () => browseCategory('meet'),
    [browseCategory],
  )

  const handleNavigateToSpace = useCallback(
    (spaceId: string) => {
      const match = spaces.find((space) => space.id === spaceId)
      dispatch(
        match
          ? { type: 'select', item: { type: 'space', data: match } }
          : { type: 'startSearch' },
      )
    },
    [spaces, dispatch],
  )

  const peopleMarkerWorkstations = useMemo(
    () =>
      peopleToMark(
        { selected, categoryFilter },
        results,
        workstations,
        showPeople,
      ),
    [selected, categoryFilter, results, workstations, showPeople],
  )

  const handleMarkerHover = useCallback(
    (workstation: Workstation | null) =>
      dispatch({
        type: 'hover',
        item: workstation ? { type: 'workstation', data: workstation } : null,
      }),
    [dispatch],
  )

  const handleMarkerClick = useCallback(
    (workstation: Workstation) =>
      dispatch({
        type: 'select',
        item: { type: 'workstation', data: workstation },
      }),
    [dispatch],
  )

  usePeopleMarkers(
    floorPlan,
    peopleMarkerWorkstations,
    hoveredWorkstationId(hovered),
    { onHover: handleMarkerHover, onClick: handleMarkerClick },
  )

  // Pressing home and walking away are the same transition.
  const handleReset = useCallback(() => dispatch({ type: 'reset' }), [dispatch])

  useIdleTimer(handleReset)

  // Act on a deep link once the floor it references has loaded, then strip
  // it from the URL so a reload does not navigate again.
  useEffect(() => {
    if (!deepLink) return
    if (spaces.length === 0 && workstations.length === 0) return
    const item = resolveDeepLink(deepLink, spaces, workstations)
    if (item) dispatch({ type: 'select', item })
    clearDeepLink()
  }, [deepLink, spaces, workstations, dispatch])

  // Which panel to render: trails `mode` while the previous one exits.
  const showDashboard = displayMode === 'dashboard'
  const showWayfinding = displayMode === 'wayfinding'

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      role="application"
      aria-label="Interactive floor plan kiosk"
    >
      {/* Inline style so url(#liquid-glass) resolves against the document,
          not an external CSS file where fragment refs break in production */}
      <style>{`.floating-panel {
        backdrop-filter: blur(16px) saturate(1.4) url(#liquid-glass);
        -webkit-backdrop-filter: blur(16px) saturate(1.4) url(#liquid-glass);
      }`}</style>

      {/* Liquid glass SVG filter definitions */}
      <svg
        className="absolute"
        style={{ width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="liquid-glass" x="-5%" y="-5%" width="110%" height="110%">
            {/* Frosted blur, strong enough to read text over any background */}
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />

            {/* Organic noise pattern used as displacement source */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="3"
              seed="2"
              result="noise"
            />

            {/* Refract the blurred backdrop through the noise */}
            <feDisplacementMap
              in="blur"
              in2="noise"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />

            {/* Boost color vibrancy of refracted content */}
            <feColorMatrix in="displaced" type="saturate" values="1.5" />
          </filter>
        </defs>
      </svg>

      {/* Floor plan canvas, full viewport */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Floating overlays: the container does not capture pointer events */}
      {!isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {/* Top-left: dashboard, or search and wayfinding */}
          <div className="pointer-events-auto absolute top-4 left-4">
            {showDashboard && (
              <div
                className={
                  isExiting && mode === 'wayfinding' ? 'dashboard-exit' : ''
                }
              >
                <DashboardOverlay
                  workstations={workstations}
                  spaces={spaces}
                  events={events}
                  onActivateWayfinding={handleActivateWayfinding}
                  onViewAttendance={handleViewAttendance}
                  onViewFreeRooms={handleViewFreeRooms}
                  onNavigateToSpace={handleNavigateToSpace}
                  onHighlightSpaces={handleHighlightSpaces}
                  onHighlightSpace={handleHighlightSpace}
                  bookedSpaceIds={bookedSpaceIds}
                  onBook={handleBook}
                />
              </div>
            )}
            {showWayfinding && (
              <div
                style={{ width: PANEL.searchWidth }}
                className={`${isExiting && mode === 'dashboard' ? 'searchbar-exit' : 'searchbar-enter'}`}
              >
                <SearchPanel
                  query={query}
                  categoryFilter={categoryFilter}
                  results={results}
                  selectedItem={selected}
                  dispatch={dispatch}
                  distance={distance}
                  pathError={pathError}
                  directions={directions}
                  categoryCounts={chipCounts}
                  onBackToDashboard={handleReset}
                  destinationNameOverride={destinationOverride?.name ?? null}
                  destinationSpace={
                    destinationSpaceId
                      ? (spaces.find((r) => r.id === destinationSpaceId) ??
                        null)
                      : null
                  }
                  defaultDirectionsOpen={deepLink?.directionsOpen ?? false}
                  bookedSpaceIds={bookedSpaceIds}
                  onBook={handleBook}
                />
              </div>
            )}
          </div>

          {/* Top-right: Layers panel */}
          <div className="pointer-events-auto absolute top-4 right-4">
            <MapControls
              showCategories={showCategories}
              showLabels={showLabels}
              showPeople={showPeople}
              showAssets={showAssets}
              onShowCategoriesChange={setShowCategories}
              onShowLabelsChange={setShowLabels}
              onShowPeopleChange={setShowPeople}
              onShowAssetsChange={setShowAssets}
              pathSmoothing={pathSmoothing}
              onPathSmoothingChange={setPathSmoothing}
              zoomOnNavigate={zoomOnNavigate}
              onZoomOnNavigateChange={setZoomOnNavigate}
              pathThickness={pathThickness}
              onPathThicknessChange={setPathThickness}
              pathDashed={pathDashed}
              onPathDashedChange={setPathDashed}
              themePresetId={themePresetId}
              onThemePresetChange={handleThemePresetChange}
              themeOverrides={themeOverrides}
              onThemeOverridesChange={handleThemeOverridesChange}
              themePreviews={themePreviews}
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-background"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="size-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-muted-foreground">
              Loading floor plan...
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-background"
          role="alert"
        >
          <div className="max-w-sm rounded-2xl border border-destructive/50 bg-card p-8 text-center">
            <p className="font-medium text-destructive">
              Failed to load floor plan
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

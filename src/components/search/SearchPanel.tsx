import { useCallback, useEffect, useRef, useState } from 'react'
import type { KioskAction } from '#/core/domain/state'
import { groupResults } from '#/core/domain/selectors'
import type { SearchableItem, Space } from '#/core/domain/types'
import type { DirectionStep } from '#/core/wayfinding/directions'
import { DestinationDetail } from '#/components/search/DestinationDetail'
import { EventDetail } from '#/components/search/EventDetail'
import { SearchList } from '#/components/search/SearchList'

interface SearchPanelProps {
  query: string
  categoryFilter: string | null
  results: SearchableItem[]
  selectedItem: SearchableItem | null
  dispatch: React.Dispatch<KioskAction>
  distance: number | null
  pathError: string | null
  directions: DirectionStep[]
  categoryCounts: Record<string, number>
  onBackToDashboard?: () => void
  destinationNameOverride?: string | null
  destinationSpace?: Space | null
  defaultDirectionsOpen?: boolean
  bookedSpaceIds?: Set<string>
  onBook?: (spaceId: string) => void
}

/**
 * The left-hand panel, which is one of three screens: the search list, the
 * detail for a chosen destination, or the detail for a chosen event.
 *
 * It is the only part of the search UI that knows about the kiosk's state
 * machine; the screens below it take plain callbacks.
 */
export function SearchPanel({
  query,
  categoryFilter,
  results,
  selectedItem,
  dispatch,
  distance,
  pathError,
  directions,
  categoryCounts,
  onBackToDashboard,
  destinationNameOverride,
  destinationSpace,
  defaultDirectionsOpen = false,
  bookedSpaceIds,
  onBook,
}: SearchPanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const chipsRef = useRef<{ focusFirst: () => void }>(null)
  // Leaving a detail screen unmounts it, so focus has to be claimed by the
  // search input on the render after it reappears.
  const focusInputOnMount = useRef(false)

  const select = useCallback(
    (item: SearchableItem | null) => dispatch({ type: 'select', item }),
    [dispatch],
  )
  const hover = useCallback(
    (item: SearchableItem | null) => dispatch({ type: 'hover', item }),
    [dispatch],
  )
  const setQuery = useCallback(
    (value: string) => dispatch({ type: 'setQuery', query: value }),
    [dispatch],
  )
  const setCategoryFilter = useCallback(
    (category: string | null) =>
      dispatch({ type: 'setCategoryFilter', category }),
    [dispatch],
  )
  const back = useCallback(() => {
    focusInputOnMount.current = true
    select(null)
  }, [select])

  // A deep link can ask for directions before the data it points at has
  // loaded, so the prop may turn true after mount. Tracking the visitor's own
  // toggle separately lets the prop act as a default rather than a reset.
  const [toggledDirections, setToggledDirections] = useState<boolean | null>(
    null,
  )
  const directionsExpanded = toggledDirections ?? defaultDirectionsOpen

  useEffect(() => {
    if (selectedItem) backButtonRef.current?.focus()
  }, [selectedItem])

  // Activating a chip unmounts it and focus falls to <body>; move it to the
  // input so the results are immediately navigable with arrow keys.
  useEffect(() => {
    if (categoryFilter) searchInputRef.current?.focus()
  }, [categoryFilter])

  useEffect(() => {
    if (!focusInputOnMount.current) return
    searchInputRef.current?.focus()
    focusInputOnMount.current = false
  })

  // Escape steps back out: first out of a detail screen, then out of a search.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (selectedItem) {
        event.preventDefault()
        back()
      } else if (query || categoryFilter) {
        event.preventDefault()
        setQuery('')
        setCategoryFilter(null)
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedItem, query, categoryFilter, back, setQuery, setCategoryFilter])

  if (selectedItem?.type === 'event') {
    return (
      <EventDetail
        event={selectedItem.data}
        backButtonRef={backButtonRef}
        onBack={back}
        onSelect={select}
      />
    )
  }

  if (selectedItem) {
    return (
      <DestinationDetail
        selectedItem={selectedItem}
        backButtonRef={backButtonRef}
        onBack={back}
        distance={distance}
        pathError={pathError}
        directions={directions}
        directionsExpanded={directionsExpanded}
        setDirectionsExpanded={setToggledDirections}
        destinationNameOverride={destinationNameOverride}
        destinationSpace={destinationSpace}
        bookedSpaceIds={bookedSpaceIds}
        onBook={onBook}
      />
    )
  }

  const grouped = groupResults(results)

  return (
    <SearchList
      query={query}
      onQueryChange={setQuery}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      categoryCounts={categoryCounts}
      resultCount={results.length}
      workstationResults={grouped.workstations}
      spacesByCategory={grouped.spacesByCategory}
      eventResults={grouped.events}
      onSelect={select}
      onHover={hover}
      onBackToDashboard={onBackToDashboard}
      searchInputRef={searchInputRef}
      chipsRef={chipsRef}
      hasActiveSearch={query.trim().length > 0 || categoryFilter !== null}
      bookedSpaceIds={bookedSpaceIds}
    />
  )
}

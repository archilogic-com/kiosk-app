import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Dispatch, ReactNode, RefObject } from 'react'
import { Command } from 'cmdk'
import {
  Armchair,
  ArrowLeft,
  Calendar,
  DoorOpen,
  Heart,
  MapPin,
  Monitor,
  Search,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Route } from '#/floor-plan/wayfinding'
import { CATEGORY_LABELS, formatSpaceType, groupResults } from '#/kiosk-state'
import type {
  KioskAction,
  KioskState,
  SearchableItem,
  Space,
} from '#/kiosk-state'
import { Avatar, DestinationDetail, EventDetail } from '#/components/Details'

/**
 * The quick filters offered on the search screen, in display order. `people`
 * and `events` are virtual categories that reshape the results rather than
 * filtering spaces.
 */
const SEARCH_CATEGORIES: Array<{
  key: string
  label: string
  icon: LucideIcon
  className: string
}> = [
  {
    key: 'people',
    label: 'People',
    icon: Users,
    className: 'bg-violet-50 hover:bg-violet-100/60',
  },
  {
    key: 'meet',
    label: 'Rooms',
    icon: DoorOpen,
    className: 'bg-amber-50 hover:bg-amber-100/60',
  },
  {
    key: 'events',
    label: 'Events',
    icon: Calendar,
    className: 'bg-sky-50 hover:bg-sky-100/60',
  },
  {
    key: 'care',
    label: 'Amenities',
    icon: Heart,
    className: 'bg-rose-50 hover:bg-rose-100/60',
  },
  {
    key: 'work',
    label: 'Workspaces',
    icon: Monitor,
    className: 'bg-blue-50 hover:bg-blue-100/60',
  },
]

const SPACE_ICONS: Record<string, LucideIcon> = {
  meet: DoorOpen,
  socialize: Users,
  work: Monitor,
  care: Heart,
}

/**
 * The left-hand panel, which is one of three screens: the search list, the
 * detail for a chosen destination, or the detail for a chosen event.
 */
export function SearchPanel({
  state: { query, categoryFilter, selected, destinationOverride },
  results,
  route,
  categoryCounts,
  defaultDirectionsOpen,
  bookedSpaceIds,
  onBook,
  dispatch,
}: {
  state: KioskState
  results: SearchableItem[]
  route: Route
  categoryCounts: Record<string, number>
  defaultDirectionsOpen: boolean
  bookedSpaceIds: Set<string>
  onBook: (spaceId: string) => void
  dispatch: Dispatch<KioskAction>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  // Leaving a detail screen unmounts it, so focus has to be claimed by the
  // search input on the render after it reappears.
  const focusInputOnMount = useRef(false)
  const [directionsOpen, setDirectionsOpen] = useState(defaultDirectionsOpen)

  const select = (item: SearchableItem | null) =>
    dispatch({ type: 'select', item })
  const back = () => {
    focusInputOnMount.current = true
    select(null)
  }
  const clear = () => {
    dispatch({ type: 'setQuery', query: '' })
    dispatch({ type: 'setCategoryFilter', category: null })
    inputRef.current?.focus()
  }
  const navigate = (space: Space) => select({ type: 'space', data: space })

  useEffect(() => {
    if (selected) backButtonRef.current?.focus()
  }, [selected])

  // Activating a chip unmounts it and focus falls to <body>; move it to the
  // input so the results are immediately navigable with arrow keys.
  useEffect(() => {
    if (categoryFilter) inputRef.current?.focus()
  }, [categoryFilter])

  useEffect(() => {
    if (!focusInputOnMount.current) return
    inputRef.current?.focus()
    focusInputOnMount.current = false
  })

  // Escape steps back out: first out of a detail screen, then out of a search.
  const stepBack = useEffectEvent((event: KeyboardEvent) => {
    if (selected) {
      event.preventDefault()
      back()
    } else if (query || categoryFilter) {
      event.preventDefault()
      clear()
    }
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stepBack(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (selected?.type === 'event') {
    return (
      <EventDetail
        event={selected.data}
        backButtonRef={backButtonRef}
        onBack={back}
        onNavigate={navigate}
        bookedSpaceIds={bookedSpaceIds}
        onBook={onBook}
      />
    )
  }

  if (selected) {
    return (
      <DestinationDetail
        item={selected}
        route={route}
        destinationName={destinationOverride?.name ?? null}
        directionsOpen={directionsOpen}
        onToggleDirections={() => setDirectionsOpen((open) => !open)}
        onHoverStep={(index) => dispatch({ type: 'hoverStep', index })}
        backButtonRef={backButtonRef}
        onBack={back}
        bookedSpaceIds={bookedSpaceIds}
        onBook={onBook}
      />
    )
  }

  return (
    <SearchList
      query={query}
      categoryFilter={categoryFilter}
      results={results}
      categoryCounts={categoryCounts}
      bookedSpaceIds={bookedSpaceIds}
      inputRef={inputRef}
      onClear={clear}
      dispatch={dispatch}
    />
  )
}

// cmdk renders unstyled; these are the classes for its parts.
const GROUP_CLASS =
  'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground'
const ITEM_CLASS =
  "relative flex min-h-[56px] cursor-default items-center gap-3 rounded-sm px-4 py-3 text-sm outline-hidden select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

function Result({
  item,
  dispatch,
  children,
}: {
  item: SearchableItem
  dispatch: Dispatch<KioskAction>
  children: ReactNode
}) {
  return (
    <Command.Item
      value={`${item.type}-${item.data.id}`}
      onSelect={() => dispatch({ type: 'select', item })}
      onMouseEnter={() => dispatch({ type: 'hover', item })}
      onMouseLeave={() => dispatch({ type: 'hover', item: null })}
      className={ITEM_CLASS}
    >
      {children}
    </Command.Item>
  )
}

function SearchList({
  query,
  categoryFilter,
  results,
  categoryCounts,
  bookedSpaceIds,
  inputRef,
  onClear,
  dispatch,
}: {
  query: string
  categoryFilter: string | null
  results: SearchableItem[]
  categoryCounts: Record<string, number>
  bookedSpaceIds: Set<string>
  inputRef: RefObject<HTMLInputElement | null>
  onClear: () => void
  dispatch: Dispatch<KioskAction>
}) {
  const chipsRef = useRef<HTMLDivElement>(null)
  const hasActiveSearch = query.trim().length > 0 || categoryFilter !== null
  const { workstations, spacesByCategory, events } = groupResults(results)

  const setCategoryFilter = (category: string | null) =>
    dispatch({ type: 'setCategoryFilter', category })

  return (
    <search
      className="floating-panel kiosk-fade-in"
      aria-label="Search people, spaces, or events"
    >
      <Command
        className="flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent text-popover-foreground"
        shouldFilter={false}
      >
        <div className="flex items-center gap-1.5 px-4 pb-1">
          <Search
            className="size-4 shrink-0 text-muted-foreground/60"
            aria-hidden="true"
          />
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2">
            <Command.Input
              ref={inputRef}
              placeholder="Search people, spaces, or events..."
              value={query}
              onValueChange={(value) => {
                dispatch({ type: 'setQuery', query: value })
                if (value && categoryFilter) setCategoryFilter(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && !hasActiveSearch) {
                  event.preventDefault()
                  chipsRef.current?.querySelector('button')?.focus()
                }
              }}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {(query || categoryFilter) && (
            <button
              onClick={onClear}
              aria-label="Clear search"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent active:scale-95"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {hasActiveSearch && (
          <Command.List className="kiosk-scroll max-h-[60vh] scroll-py-1 overflow-x-hidden overflow-y-auto border-t border-border/30">
            <Command.Empty className="py-6 text-center text-sm">
              <div className="py-8 text-center">
                <Search
                  className="mx-auto mb-2 size-8 text-muted-foreground/40"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground">No results found</p>
              </div>
            </Command.Empty>

            {workstations.length > 0 && (
              <Command.Group heading="People" className={GROUP_CLASS}>
                {workstations.map((data) => (
                  <Result
                    key={data.id}
                    item={{ type: 'workstation', data }}
                    dispatch={dispatch}
                  >
                    {data.occupantName ? (
                      <Avatar name={data.occupantName} size="md" />
                    ) : (
                      <div
                        className="flex size-10 items-center justify-center rounded-full bg-primary/10"
                        aria-hidden="true"
                      >
                        <Users className="size-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {data.occupantName}
                      </p>
                      {data.employeeId && (
                        <p className="truncate text-xs text-muted-foreground">
                          {data.employeeId}
                        </p>
                      )}
                    </div>
                  </Result>
                ))}
              </Command.Group>
            )}

            {Object.entries(spacesByCategory).map(([category, spaces]) => {
              const Icon = SPACE_ICONS[category]
              return (
                <Command.Group
                  key={category}
                  heading={CATEGORY_LABELS[category] ?? category}
                  className={GROUP_CLASS}
                >
                  {spaces.map((data) => (
                    <Result
                      key={data.id}
                      item={{ type: 'space', data }}
                      dispatch={dispatch}
                    >
                      <div
                        className="flex size-10 items-center justify-center rounded-lg bg-primary/10"
                        aria-hidden="true"
                      >
                        {Icon ? (
                          <Icon className="size-5" />
                        ) : (
                          <MapPin className="size-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{data.name}</p>
                          {data.seatCapacity != null &&
                            data.seatCapacity > 0 && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                                <Armchair
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                {data.seatCapacity}
                              </span>
                            )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatSpaceType(data.subCategory)}
                        </p>
                      </div>
                      {data.category === 'meet' && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            bookedSpaceIds.has(data.id)
                              ? 'bg-rose-100/50 text-rose-600/80'
                              : 'bg-emerald-100/50 text-emerald-600/80'
                          }`}
                        >
                          {bookedSpaceIds.has(data.id) ? 'Booked' : 'Available'}
                        </span>
                      )}
                    </Result>
                  ))}
                </Command.Group>
              )
            })}

            {events.length > 0 && (
              <Command.Group heading="Events" className={GROUP_CLASS}>
                {events.map((data) => (
                  <Result
                    key={data.id}
                    item={{ type: 'event', data }}
                    dispatch={dispatch}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-lg bg-sky-50"
                      aria-hidden="true"
                    >
                      <Calendar className="size-5 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{data.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {data.time} &middot;{' '}
                        {data.space?.name ?? 'No room assigned'}
                      </p>
                    </div>
                  </Result>
                ))}
              </Command.Group>
            )}
          </Command.List>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {hasActiveSearch &&
            (results.length > 0
              ? `${results.length} result${results.length === 1 ? '' : 's'} found`
              : 'No results found')}
        </div>
      </Command>

      {!query && !categoryFilter && (
        <div
          ref={chipsRef}
          className="flex flex-wrap gap-2 px-4 pb-4"
          role="group"
          aria-label="Filter by category"
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              inputRef.current?.focus()
            }
          }}
        >
          {SEARCH_CATEGORIES.map(({ key, label, icon: Icon, className }) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${className}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              {categoryCounts[key] != null && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {categoryCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border/30">
        <button
          onClick={() => dispatch({ type: 'reset' })}
          className="flex h-11 w-full items-center gap-2 px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </button>
      </div>
    </search>
  )
}

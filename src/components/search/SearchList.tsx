import React from 'react'
import {
  Armchair,
  ArrowLeft,
  Calendar,
  MapPin,
  Search,
  Users,
  X,
} from 'lucide-react'
import type { SearchableItem } from '#/core/domain/types'
import { CATEGORY_LABELS } from '#/core/domain/types'
import { formatSpaceType } from '#/core/domain/format'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import { Avatar, CATEGORY_ICONS } from '#/components/search/shared'
import { CategoryChips } from '#/components/search/CategoryChips'

interface SearchListProps {
  query: string
  onQueryChange: (query: string) => void
  categoryFilter: string | null
  onCategoryFilterChange: (category: string | null) => void
  categoryCounts: Record<string, number>
  workstationResults: Array<Extract<SearchableItem, { type: 'workstation' }>>
  spacesByCategory: Record<
    string,
    Array<Extract<SearchableItem, { type: 'space' }>>
  >
  eventResults: Array<Extract<SearchableItem, { type: 'event' }>>
  resultCount: number
  onSelect: (item: SearchableItem | null) => void
  onHover?: (item: SearchableItem | null) => void
  onBackToDashboard?: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  chipsRef: React.RefObject<{ focusFirst: () => void } | null>
  hasActiveSearch: boolean
  bookedSpaceIds?: Set<string>
}

export function SearchList({
  query,
  onQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryCounts,
  resultCount,
  workstationResults,
  spacesByCategory,
  eventResults,
  onSelect,
  onHover,
  onBackToDashboard,
  searchInputRef,
  chipsRef,
  hasActiveSearch,
  bookedSpaceIds,
}: SearchListProps) {
  return (
    <search
      className="floating-panel kiosk-fade-in"
      aria-label="Search people, spaces, or events"
    >
      {/* Search input */}
      <Command
        className="bg-transparent **:data-[slot=command-input-wrapper]:min-w-0 **:data-[slot=command-input-wrapper]:flex-1 **:data-[slot=command-input-wrapper]:border-0 **:data-[slot=command-input-wrapper]:px-0"
        shouldFilter={false}
      >
        <div className="flex items-center gap-1.5 px-4 pb-1">
          <Search
            className="size-4 shrink-0 text-muted-foreground/60"
            aria-hidden="true"
          />
          <CommandInput
            ref={searchInputRef}
            icon={false}
            placeholder="Search people, spaces, or events..."
            value={query}
            onValueChange={(val) => {
              onQueryChange(val)
              if (val && categoryFilter) onCategoryFilterChange(null)
            }}
            onKeyDown={(e) => {
              // Down arrow from empty input → focus category chips
              if (
                e.key === 'ArrowDown' &&
                !hasActiveSearch &&
                chipsRef.current
              ) {
                e.preventDefault()
                chipsRef.current.focusFirst()
              }
            }}
            className="h-11 text-sm placeholder:text-muted-foreground/50"
          />
          {(query || categoryFilter) && (
            <button
              onClick={() => {
                onQueryChange('')
                onCategoryFilterChange(null)
                searchInputRef.current?.focus()
              }}
              aria-label="Clear search"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent active:scale-95"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {hasActiveSearch && (
          <CommandList className="kiosk-scroll max-h-[60vh] border-t border-border/30">
            <CommandEmpty>
              <div className="py-8 text-center">
                <Search
                  className="mx-auto mb-2 size-8 text-muted-foreground/40"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground">No results found</p>
              </div>
            </CommandEmpty>

            {workstationResults.length > 0 && (
              <CommandGroup heading="People">
                {workstationResults.map((item) => (
                  <CommandItem
                    key={item.data.id}
                    value={item.data.id}
                    onSelect={() => onSelect(item)}
                    onMouseEnter={() => onHover?.(item)}
                    onMouseLeave={() => onHover?.(null)}
                    className="min-h-[56px] gap-3 px-4 py-3"
                  >
                    {item.data.occupantName ? (
                      <Avatar name={item.data.occupantName} />
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
                        {item.data.occupantName}
                      </p>
                      {item.data.employeeId && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.data.employeeId}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {Object.entries(spacesByCategory).map(([category, items]) => (
              <CommandGroup
                key={category}
                heading={CATEGORY_LABELS[category] ?? category}
              >
                {items.map((item) => {
                  if (item.type !== 'space') return null
                  return (
                    <CommandItem
                      key={item.data.id}
                      value={item.data.id}
                      onSelect={() => onSelect(item)}
                      onMouseEnter={() => onHover?.(item)}
                      onMouseLeave={() => onHover?.(null)}
                      className="min-h-[56px] gap-3 px-4 py-3"
                    >
                      <div
                        className="flex size-10 items-center justify-center rounded-lg bg-primary/10"
                        aria-hidden="true"
                      >
                        {CATEGORY_ICONS[category] ?? (
                          <MapPin className="size-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">
                            {item.data.name}
                          </p>
                          {item.data.seatCapacity != null &&
                            item.data.seatCapacity > 0 && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <Armchair
                                  className="size-2.5"
                                  aria-hidden="true"
                                />
                                {item.data.seatCapacity}
                              </span>
                            )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatSpaceType(item.data.subCategory)}
                        </p>
                      </div>
                      {item.data.category === 'meet' &&
                        (() => {
                          const booked = bookedSpaceIds?.has(item.data.id)
                          return (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                booked
                                  ? 'bg-rose-100/50 text-rose-600/80'
                                  : 'bg-emerald-100/50 text-emerald-600/80'
                              }`}
                            >
                              {booked ? 'Booked' : 'Available'}
                            </span>
                          )
                        })()}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}

            {eventResults.length > 0 && (
              <CommandGroup heading="Events">
                {eventResults.map((item) => {
                  if (item.type !== 'event') return null
                  const event = item.data
                  return (
                    <CommandItem
                      key={event.id}
                      value={`event-${event.id}`}
                      onSelect={() => {
                        onSelect({ type: 'event', data: event })
                      }}
                      onMouseEnter={() =>
                        onHover?.({ type: 'event', data: event })
                      }
                      onMouseLeave={() => onHover?.(null)}
                      className="min-h-[56px] gap-3 px-4 py-3"
                    >
                      <div
                        className="flex size-10 items-center justify-center rounded-lg bg-sky-50"
                        aria-hidden="true"
                      >
                        <Calendar className="size-5 text-sky-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{event.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.time} &middot;{' '}
                          {event.space?.name ?? 'No room assigned'}
                        </p>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        )}

        {/* Live region for screen readers to announce result counts */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {hasActiveSearch &&
            (resultCount > 0
              ? `${resultCount} result${resultCount === 1 ? '' : 's'} found`
              : 'No results found')}
        </div>
      </Command>

      {/* Category filter chips, a roving tabindex toolbar */}
      {!query && !categoryFilter && (
        <CategoryChips
          ref={chipsRef}
          categoryCounts={categoryCounts}
          onSelect={onCategoryFilterChange}
          onFocusInput={() => searchInputRef.current?.focus()}
        />
      )}

      {/* Back to dashboard */}
      {onBackToDashboard && (
        <div className="border-t border-border/30">
          <button
            onClick={onBackToDashboard}
            className="flex h-11 w-full items-center gap-2 px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.98]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </button>
        </div>
      )}
    </search>
  )
}

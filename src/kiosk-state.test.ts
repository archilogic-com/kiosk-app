import { describe, expect, it } from 'vitest'
import {
  bookedSpaceIds,
  buildDeepLink,
  computeFloorStats,
  findItem,
  formatSpaceType,
  formatWalkingTime,
  groupResults,
  initialKioskState,
  navigationTarget,
  parseDeepLink,
  peopleToMark,
  reduce,
  searchItems,
} from '#/kiosk-state'
import type {
  KioskAction,
  KioskState,
  PlacedPoint,
  ScheduledEvent,
  SearchableItem,
  Space,
  Workstation,
} from '#/kiosk-state'

const space = (over: Partial<Space> = {}): Space => ({
  id: 's1',
  name: 'Oslo',
  position: [0, 0],
  category: 'meet',
  subCategory: 'meetingRoom',
  ...over,
})

const workstation = (over: Partial<Workstation> = {}): Workstation => ({
  id: 'w1',
  position: [0, 0],
  occupantName: 'Ada Lovelace',
  employeeId: 'E-100',
  ...over,
})

const event = (over: Partial<ScheduledEvent> = {}): ScheduledEvent => ({
  id: 'e1',
  time: '9:00 AM',
  endTime: '9:45 AM',
  title: 'Standup',
  description: '',
  organizer: 'Grace Hopper',
  attendeeCount: 4,
  category: 'meeting',
  space: null,
  ...over,
})

const oslo = space()
const osloItem: SearchableItem = { type: 'space', data: oslo }

const after = (state: KioskState, ...actions: KioskAction[]) =>
  actions.reduce(reduce, state)

describe('kiosk state', () => {
  const corridor: PlacedPoint = { position: [1, 1], name: 'Corridor' }

  it('starts on the dashboard with nothing chosen', () => {
    expect(initialKioskState).toMatchObject({
      mode: 'dashboard',
      query: '',
      categoryFilter: null,
      selected: null,
      hovered: null,
    })
  })

  it('moves into wayfinding when a destination is selected', () => {
    expect(
      after(initialKioskState, { type: 'select', item: osloItem }).mode,
    ).toBe('wayfinding')
  })

  it('stays put when a selection is merely cleared', () => {
    const browsing = after(initialKioskState, { type: 'startSearch' })
    expect(after(browsing, { type: 'select', item: null }).mode).toBe(
      'wayfinding',
    )
  })

  it('clears the query when a category is chosen, so the two cannot disagree', () => {
    const state = after(
      initialKioskState,
      { type: 'setQuery', query: 'oslo' },
      { type: 'setCategoryFilter', category: 'meet' },
    )
    expect(state).toMatchObject({ query: '', categoryFilter: 'meet' })
  })

  it('keeps typed text when the category is cleared', () => {
    const state = after(
      initialKioskState,
      { type: 'setCategoryFilter', category: 'meet' },
      { type: 'setQuery', query: 'o' },
      { type: 'setCategoryFilter', category: null },
    )
    expect(state).toMatchObject({ query: 'o', categoryFilter: null })
  })

  it('forgets a dragged destination when a new one is chosen', () => {
    const dragged = after(
      initialKioskState,
      { type: 'select', item: osloItem },
      { type: 'moveDestination', point: corridor },
    )
    expect(dragged.destinationOverride).toEqual(corridor)
    expect(
      after(dragged, { type: 'select', item: osloItem }).destinationOverride,
    ).toBeNull()
  })

  it('puts the origin back where the kiosk stands on reset', () => {
    const moved = after(initialKioskState, {
      type: 'moveOrigin',
      point: corridor,
    })
    expect(moved.originOverride).toEqual(corridor)
    expect(after(moved, { type: 'reset' }).originOverride).toBeNull()
  })

  it('drops hover when something is selected', () => {
    const state = after(
      initialKioskState,
      { type: 'hover', item: osloItem },
      { type: 'select', item: osloItem },
    )
    expect(state.hovered).toBeNull()
  })

  it('remembers the hovered direction step until the selection changes', () => {
    const hovering = reduce(initialKioskState, { type: 'hoverStep', index: 2 })
    expect(hovering.hoveredStep).toBe(2)
    expect(
      reduce(hovering, { type: 'select', item: osloItem }).hoveredStep,
    ).toBeNull()
  })

  it('ignores hover while a destination is selected', () => {
    const state = after(
      initialKioskState,
      { type: 'select', item: osloItem },
      { type: 'hover', item: osloItem },
    )
    expect(state.hovered).toBeNull()
  })

  it('closes the dashboard events when a destination is chosen', () => {
    const state = after(
      initialKioskState,
      { type: 'showEvents', open: true },
      { type: 'focusEvent', id: 'e1' },
      { type: 'select', item: osloItem },
    )
    expect(state).toMatchObject({ eventsOpen: false, focusedEventId: null })
  })

  it('reset is one transition, whether the visitor left or pressed home', () => {
    const busy = after(
      initialKioskState,
      { type: 'showEvents', open: true },
      { type: 'startSearch' },
      { type: 'setQuery', query: 'oslo' },
      { type: 'setCategoryFilter', category: 'meet' },
      { type: 'select', item: osloItem },
    )
    expect(busy).not.toEqual(initialKioskState)
    expect(after(busy, { type: 'reset' })).toEqual(initialKioskState)
  })

  it('never mutates the state it is given', () => {
    const before = { ...initialKioskState }
    reduce(before, { type: 'select', item: osloItem })
    expect(before).toEqual(initialKioskState)
  })
})

describe('searchItems', () => {
  const base = {
    workstations: [workstation()],
    spaces: [space({ name: 'Bletchley' })],
    events: [event()],
  }

  it('returns nothing without a query or a category', () => {
    expect(searchItems({ ...base, query: '', categoryFilter: null })).toEqual(
      [],
    )
  })

  it('matches spaces, people and events on free text', () => {
    expect(
      searchItems({ ...base, query: 'bletch', categoryFilter: null }),
    ).toEqual([{ type: 'space', data: base.spaces[0] }])
    expect(
      searchItems({ ...base, query: 'ada', categoryFilter: null }),
    ).toEqual([{ type: 'workstation', data: base.workstations[0] }])
    expect(
      searchItems({ ...base, query: 'standup', categoryFilter: null }),
    ).toEqual([{ type: 'event', data: base.events[0] }])
  })

  it('matches people by employee id as well as name', () => {
    expect(
      searchItems({ ...base, query: 'e-100', categoryFilter: null }),
    ).toHaveLength(1)
  })

  it('lists a whole category when one is selected, even with no query', () => {
    const results = searchItems({ ...base, query: '', categoryFilter: 'meet' })
    expect(results).toEqual([{ type: 'space', data: base.spaces[0] }])
  })

  it('excludes hub spaces, which are zones rather than destinations', () => {
    const hub = space({ id: 's2', name: 'Team Hub', subCategory: 'hub' })
    const results = searchItems({
      ...base,
      spaces: [...base.spaces, hub],
      query: '',
      categoryFilter: 'meet',
    })
    expect(results.map((r) => r.data.id)).toEqual(['s1'])
  })

  it('only lists occupied workstations under the people category', () => {
    const empty = workstation({ id: 'w2', occupantName: null })
    const results = searchItems({
      ...base,
      workstations: [...base.workstations, empty],
      query: '',
      categoryFilter: 'people',
    })
    expect(results.map((r) => r.data.id)).toEqual(['w1'])
  })

  it('is case-insensitive and ignores surrounding whitespace', () => {
    expect(
      searchItems({ ...base, query: '  BLETCHLEY  ', categoryFilter: null }),
    ).toHaveLength(1)
  })
})

describe('groupResults', () => {
  it('splits by kind and groups spaces by category in first-seen order', () => {
    const cafe = space({ id: 's2', name: 'Cafe', category: 'socialize' })
    const ada = workstation()
    const standup = event()
    const grouped = groupResults([
      { type: 'space', data: cafe },
      { type: 'workstation', data: ada },
      osloItem,
      { type: 'event', data: standup },
    ])
    expect(grouped.workstations).toEqual([ada])
    expect(grouped.events).toEqual([standup])
    expect(Object.keys(grouped.spacesByCategory)).toEqual(['socialize', 'meet'])
    expect(grouped.spacesByCategory.meet).toEqual([oslo])
  })
})

describe('navigationTarget', () => {
  it('routes to spaces and workstations, never to events', () => {
    const adaItem: SearchableItem = { type: 'workstation', data: workstation() }
    expect(navigationTarget(osloItem)).toBe(osloItem)
    expect(navigationTarget(adaItem)).toBe(adaItem)
    expect(navigationTarget({ type: 'event', data: event() })).toBeNull()
    expect(navigationTarget(null)).toBeNull()
  })
})

describe('findItem', () => {
  const floor = { spaces: [oslo], workstations: [workstation()] }

  it('finds a space or a workstation by id', () => {
    expect(findItem(floor, 's1')).toEqual(osloItem)
    expect(findItem(floor, 'w1')?.type).toBe('workstation')
  })

  it('looks only where a known type says to', () => {
    expect(findItem(floor, 's1', 'workstation')).toBeNull()
    expect(findItem(floor, 'w1', 'space')).toBeNull()
  })

  it('returns null for an id the floor does not have', () => {
    expect(findItem(floor, 'nope')).toBeNull()
  })
})

describe('peopleToMark', () => {
  const ada = workstation()
  const all = [ada, workstation({ id: 'w2', occupantName: null })]
  const adaItem: SearchableItem = { type: 'workstation', data: ada }

  it('marks nobody once a destination is chosen', () => {
    expect(
      peopleToMark(
        { selected: osloItem, categoryFilter: 'people' },
        [],
        all,
        true,
      ),
    ).toEqual([])
  })

  it('marks everyone occupied for the people layer or filter', () => {
    expect(
      peopleToMark({ selected: null, categoryFilter: null }, [], all, true),
    ).toEqual([ada])
    expect(
      peopleToMark(
        { selected: null, categoryFilter: 'people' },
        [],
        all,
        false,
      ),
    ).toEqual([ada])
  })

  it('marks only the people a free-text search matched', () => {
    expect(
      peopleToMark(
        { selected: null, categoryFilter: null },
        [adaItem, osloItem],
        all,
        false,
      ),
    ).toEqual([ada])
  })

  it('marks nobody under a space category', () => {
    expect(
      peopleToMark(
        { selected: null, categoryFilter: 'meet' },
        [osloItem],
        all,
        false,
      ),
    ).toEqual([])
  })
})

describe('bookedSpaceIds', () => {
  it('combines unbookable meeting rooms with session bookings', () => {
    const unbookable = space({ isBookable: false })
    const cafe = space({ id: 's2', category: 'socialize', isBookable: false })
    expect([...bookedSpaceIds([unbookable, cafe], ['s9'])].sort()).toEqual([
      's1',
      's9',
    ])
  })
})

describe('computeFloorStats', () => {
  const workstations = [
    workstation({ id: 'a' }),
    workstation({ id: 'b' }),
    workstation({ id: 'c', occupantName: null }),
  ]
  const spaces = [
    space({ id: 'm1' }),
    space({ id: 'm2' }),
    space({ id: 'w1', category: 'work', subCategory: 'openWorkspace' }),
  ]

  it('counts attendance as occupied workstations', () => {
    const stats = computeFloorStats(workstations, spaces, new Set())
    expect(stats.attendance).toBe(2)
    expect(stats.totalWorkstations).toBe(3)
  })

  it('counts only meeting rooms, excluding hubs', () => {
    const withHub = [...spaces, space({ id: 'h1', subCategory: 'hub' })]
    expect(
      computeFloorStats(workstations, withHub, new Set()).totalMeetingRooms,
    ).toBe(2)
  })

  it('subtracts booked rooms, and only rooms, from the free count', () => {
    expect(
      computeFloorStats(workstations, spaces, new Set(['m1'])).freeRooms,
    ).toBe(1)
    expect(
      computeFloorStats(workstations, spaces, new Set(['m1', 'm2', 'w1']))
        .freeRooms,
    ).toBe(0)
  })
})

describe('parseDeepLink', () => {
  it('reads a space target', () => {
    expect(parseDeepLink('?to=abc&type=space')).toEqual({
      id: 'abc',
      type: 'space',
      directionsOpen: false,
    })
  })

  it('opens directions when asked', () => {
    expect(
      parseDeepLink('?to=abc&type=workstation&directions=1')?.directionsOpen,
    ).toBe(true)
  })

  it.each([
    ['no params', ''],
    ['missing id', '?type=space'],
    ['missing type', '?to=abc'],
    ['unknown type', '?to=abc&type=building'],
    ['legacy type', '?to=abc&type=room'],
  ])('returns null for %s', (_label, search) => {
    expect(parseDeepLink(search)).toBeNull()
  })
})

describe('buildDeepLink', () => {
  it('round-trips through parseDeepLink and drops unrelated params', () => {
    const url = buildDeepLink(
      osloItem,
      true,
      'https://kiosk.example/?utm=x&to=old#top',
    )
    expect(new URL(url).searchParams.get('utm')).toBeNull()
    expect(parseDeepLink(new URL(url).search)).toEqual({
      id: 's1',
      type: 'space',
      directionsOpen: true,
    })
  })

  it('keeps the params that chose the floor', () => {
    const url = new URL(
      buildDeepLink(
        { type: 'workstation', data: workstation() },
        false,
        'https://kiosk.example/?floor=f1&token=t1&utm=x',
      ),
    )
    expect(url.searchParams.get('floor')).toBe('f1')
    expect(url.searchParams.get('token')).toBe('t1')
    expect(url.searchParams.get('utm')).toBeNull()
  })
})

describe('formatSpaceType', () => {
  it.each([
    ['openWorkspace', 'Open Workspace'],
    ['privateOffice', 'Private Office'],
    ['open_office', 'Open Office'],
    ['meeting-room', 'Meeting Room'],
    ['lobby', 'Lobby'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatSpaceType(input)).toBe(expected)
  })

  it.each([null, undefined, ''])('returns an empty string for %s', (input) => {
    expect(formatSpaceType(input)).toBe('')
  })
})

describe('formatWalkingTime', () => {
  it('rounds to minutes at 1.4 m/s and floors short walks', () => {
    expect(formatWalkingTime(36)).toBe('<1 min walk')
    expect(formatWalkingTime(84)).toBe('~1 min walk')
    expect(formatWalkingTime(250)).toBe('~3 min walk')
  })
})

import { describe, expect, it } from 'vitest'
import type {
  ScheduledEvent,
  SearchableItem,
  Space,
  Workstation,
} from '#/core/domain/types'
import {
  bookedSpaceIds,
  categoryCountsWith,
  groupResults,
  hoveredWorkstationId,
  mergeNodeStyles,
  navigationTarget,
  peopleToMark,
  resolveDeepLink,
} from '#/core/domain/selectors'

const oslo: Space = {
  id: 's1',
  name: 'Oslo',
  position: [0, 0],
  category: 'meet',
  subCategory: 'meetingRoom',
  isBookable: false,
}
const cafe: Space = {
  id: 's2',
  name: 'Cafe',
  position: [1, 1],
  category: 'socialize',
  subCategory: 'cafe',
}
const ada: Workstation = {
  id: 'w1',
  position: [2, 2],
  occupantName: 'Ada',
  employeeId: null,
  available: false,
}
const empty: Workstation = {
  id: 'w2',
  position: [3, 3],
  occupantName: null,
  employeeId: null,
  available: true,
}
const event: ScheduledEvent = {
  id: 'e1',
  time: '9:00 AM',
  endTime: '10:00 AM',
  title: 'Standup',
  description: '',
  organizer: 'Ada',
  attendeeCount: 3,
  category: 'meeting',
  space: oslo,
}
const spaceItem: SearchableItem = { type: 'space', data: oslo }
const adaItem: SearchableItem = { type: 'workstation', data: ada }
const eventItem: SearchableItem = { type: 'event', data: event }

describe('navigationTarget', () => {
  it('routes to spaces and workstations, never to events', () => {
    expect(navigationTarget(spaceItem)).toBe(spaceItem)
    expect(navigationTarget(adaItem)).toBe(adaItem)
    expect(navigationTarget(eventItem)).toBeNull()
    expect(navigationTarget(null)).toBeNull()
  })
})

describe('hoveredWorkstationId', () => {
  it('reports only workstation hovers', () => {
    expect(hoveredWorkstationId(adaItem)).toBe('w1')
    expect(hoveredWorkstationId(spaceItem)).toBeNull()
  })
})

describe('peopleToMark', () => {
  const all = [ada, empty]

  it('marks nobody once a destination is chosen', () => {
    expect(
      peopleToMark(
        { selected: spaceItem, categoryFilter: 'people' },
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
        [adaItem, spaceItem],
        all,
        false,
      ),
    ).toEqual([ada])
  })

  it('marks nobody under a space category', () => {
    expect(
      peopleToMark(
        { selected: null, categoryFilter: 'meet' },
        [spaceItem],
        all,
        false,
      ),
    ).toEqual([])
  })
})

describe('mergeNodeStyles', () => {
  it('lets the route win over a highlight of the same node', () => {
    expect(
      mergeNodeStyles(
        { a: { fill: 'x' }, b: { fill: 'y' } },
        { a: { fill: 'z' } },
      ),
    ).toEqual({ a: { fill: 'z' }, b: { fill: 'y' } })
  })
})

describe('bookedSpaceIds', () => {
  it('combines unbookable meeting rooms with session bookings', () => {
    expect([...bookedSpaceIds([oslo, cafe], ['s9'])].sort()).toEqual([
      's1',
      's9',
    ])
  })
})

describe('categoryCountsWith', () => {
  it('adds the virtual events category', () => {
    expect(categoryCountsWith({ meet: 2 }, [event])).toEqual({
      meet: 2,
      events: 1,
    })
  })
})

describe('resolveDeepLink', () => {
  it('finds the item a link names, by type', () => {
    expect(
      resolveDeepLink(
        { id: 's1', type: 'space', directionsOpen: false },
        [oslo],
        [ada],
      ),
    ).toEqual(spaceItem)
    expect(
      resolveDeepLink(
        { id: 'w1', type: 'workstation', directionsOpen: false },
        [oslo],
        [ada],
      ),
    ).toEqual(adaItem)
  })

  it('returns null for an id the floor does not have', () => {
    expect(
      resolveDeepLink(
        { id: 'nope', type: 'space', directionsOpen: true },
        [oslo],
        [ada],
      ),
    ).toBeNull()
  })
})

describe('groupResults', () => {
  it('splits by kind and groups spaces by category in first-seen order', () => {
    const cafeItem: SearchableItem = { type: 'space', data: cafe }
    const grouped = groupResults([cafeItem, adaItem, spaceItem, eventItem])
    expect(grouped.workstations).toEqual([adaItem])
    expect(grouped.events).toEqual([eventItem])
    expect(Object.keys(grouped.spacesByCategory)).toEqual(['socialize', 'meet'])
    expect(grouped.spacesByCategory.meet).toEqual([spaceItem])
  })
})

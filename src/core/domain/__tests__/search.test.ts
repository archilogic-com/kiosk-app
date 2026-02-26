import { describe, expect, it } from 'vitest'
import type { ScheduledEvent, Space, Workstation } from '#/core/domain/types'
import { searchItems } from '#/core/domain/search'

const workstation = (over: Partial<Workstation> = {}): Workstation => ({
  id: 'w1',
  position: [0, 0],
  occupantName: 'Ada Lovelace',
  employeeId: 'E-100',
  available: false,
  ...over,
})

const space = (over: Partial<Space> = {}): Space => ({
  id: 's1',
  name: 'Bletchley',
  position: [0, 0],
  category: 'meet',
  subCategory: 'meetingRoom',
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

const base = {
  workstations: [workstation()],
  spaces: [space()],
  events: [event()],
}

describe('searchItems', () => {
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
    const empty = workstation({ id: 'w2', occupantName: null, available: true })
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

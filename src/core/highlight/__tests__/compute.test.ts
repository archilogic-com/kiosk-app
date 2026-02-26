import { describe, expect, it } from 'vitest'
import type { ScheduledEvent, SearchableItem, Space } from '#/core/domain/types'
import type { HighlightState } from '#/core/highlight/compute'
import { computeHighlights, darken } from '#/core/highlight/compute'

const space = (id: string, category = 'meet'): Space => ({
  id,
  name: id,
  position: [0, 0],
  category,
  subCategory: 'meetingRoom',
})
const spaces = [space('a'), space('b'), space('c', 'work')]
const asItem = (s: Space): SearchableItem => ({ type: 'space', data: s })

const state = (over: Partial<HighlightState> = {}): HighlightState => ({
  categoryFilter: null,
  results: [],
  selectedItem: null,
  hoveredItem: null,
  spaces,
  events: [],
  ...over,
})

describe('darken', () => {
  it('scales each channel', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080')
    expect(darken('#3b6de0', 1)).toBe('#3b6de0')
  })
})

describe('computeHighlights', () => {
  it('highlights nothing at rest', () => {
    expect(computeHighlights(state())).toEqual([])
  })

  it('highlights every space in a selected category', () => {
    const ids = computeHighlights(state({ categoryFilter: 'meet' })).map(
      (h) => h.id,
    )
    expect(ids).toEqual(['a', 'b'])
  })

  it('leaves the plan to wayfinding when a destination is selected', () => {
    expect(
      computeHighlights(state({ selectedItem: asItem(spaces[0]) })),
    ).toEqual([])
  })

  it('shows avatar markers rather than tinted spaces for people', () => {
    expect(computeHighlights(state({ categoryFilter: 'people' }))).toEqual([])
  })

  it('highlights search results', () => {
    const ids = computeHighlights(state({ results: [asItem(spaces[2])] })).map(
      (h) => h.id,
    )
    expect(ids).toEqual(['c'])
  })

  it('applies hover on top of the base highlights, only once', () => {
    const highlights = computeHighlights(
      state({ categoryFilter: 'meet', hoveredItem: asItem(spaces[0]) }),
    )
    expect(highlights.filter((h) => h.id === 'a')).toHaveLength(1)
    // hover is last, so it wins when styles are applied
    expect(highlights.at(-1)?.id).toBe('a')
    expect(highlights.at(-1)?.fillOpacity).toBeGreaterThan(
      highlights.find((h) => h.id === 'b')!.fillOpacity,
    )
  })

  it('clears hover when it moves away, leaving no residue', () => {
    const hovering = computeHighlights(
      state({ hoveredItem: asItem(spaces[0]) }),
    )
    const after = computeHighlights(state({ hoveredItem: null }))
    expect(hovering).toHaveLength(1)
    expect(after).toEqual([])
  })

  it('highlights where a selected event is held', () => {
    const event: ScheduledEvent = {
      id: 'e1',
      time: '',
      endTime: '',
      title: 'Retro',
      description: '',
      organizer: 'Someone',
      attendeeCount: 3,
      category: 'meeting',
      space: spaces[1],
    }
    const ids = computeHighlights(
      state({ selectedItem: { type: 'event', data: event } }),
    ).map((h) => h.id)
    expect(ids).toEqual(['b'])
  })

  it('emphasises the focused space within a dashboard context', () => {
    const highlights = computeHighlights(
      state({ contextSpaceIds: ['a', 'b'], focusSpaceId: 'b' }),
    )
    const focused = highlights.find((h) => h.id === 'b')!
    const other = highlights.find((h) => h.id === 'a')!
    expect(focused.fillOpacity).toBeGreaterThan(other.fillOpacity)
  })

  it('colours meeting rooms by booking status', () => {
    const highlights = computeHighlights(
      state({ categoryFilter: 'meet', bookedSpaceIds: new Set(['a']) }),
    )
    const booked = highlights.find((h) => h.id === 'a')!
    const free = highlights.find((h) => h.id === 'b')!
    expect(booked.fill).not.toBe(free.fill)
  })
})

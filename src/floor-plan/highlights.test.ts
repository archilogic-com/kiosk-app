import { describe, expect, it, vi } from 'vitest'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { computeHighlights, toNodeStyles } from '#/floor-plan/highlights'
import type { HighlightInput } from '#/floor-plan/highlights'
import { KIOSK_COLORS } from '#/kiosk-state'
import type { ScheduledEvent, SearchableItem, Space } from '#/kiosk-state'

const space = (id: string, category = 'meet'): Space => ({
  id,
  name: id,
  position: [0, 0],
  category,
  subCategory: 'meetingRoom',
})
const spaces = [space('a'), space('b'), space('c', 'work')]
const asItem = (s: Space): SearchableItem => ({ type: 'space', data: s })
const event = (id: string, where: Space): ScheduledEvent => ({
  id,
  time: '',
  endTime: '',
  title: id,
  description: '',
  organizer: 'Someone',
  attendeeCount: 3,
  category: 'meeting',
  space: where,
})

const input = (over: Partial<HighlightInput> = {}): HighlightInput => ({
  categoryFilter: null,
  selected: null,
  hovered: null,
  eventsOpen: false,
  focusedEventId: null,
  results: [],
  spaces,
  events: [],
  bookedSpaceIds: new Set(),
  destinationSpaceId: null,
  ...over,
})

const ids = (over: Partial<HighlightInput>) =>
  computeHighlights(input(over)).map((h) => h.id)

describe('computeHighlights', () => {
  it('highlights nothing at rest', () => {
    expect(computeHighlights(input())).toEqual([])
  })

  it('highlights every space in a selected category', () => {
    expect(ids({ categoryFilter: 'meet' })).toEqual(['a', 'b'])
  })

  it('shows avatar markers rather than tinted spaces for people', () => {
    expect(computeHighlights(input({ categoryFilter: 'people' }))).toEqual([])
  })

  it('highlights search results', () => {
    expect(ids({ results: [asItem(spaces[2])] })).toEqual(['c'])
  })

  it('tints only the destination once one is selected', () => {
    const [destination, ...rest] = computeHighlights(
      input({ selected: asItem(spaces[0]), categoryFilter: 'meet' }),
    )
    expect(rest).toEqual([])
    expect(destination).toMatchObject({
      id: 'a',
      type: 'layout:space',
      fill: KIOSK_COLORS.path,
    })
  })

  it('tints the space a dragged destination landed in', () => {
    expect(
      computeHighlights(
        input({ selected: asItem(spaces[0]), destinationSpaceId: 'b' }),
      ),
    ).toMatchObject([{ id: 'b', type: 'layout:space' }])
  })

  it('tints a workstation destination as the asset it is', () => {
    const desk = {
      id: 'w1',
      position: [0, 0] as [number, number],
      occupantName: 'Ada',
      employeeId: null,
    }
    expect(
      computeHighlights(
        input({ selected: { type: 'workstation', data: desk } }),
      ),
    ).toMatchObject([{ id: 'w1', type: 'element:asset' }])
  })

  it('applies hover on top of the base highlights, only once', () => {
    const highlights = computeHighlights(
      input({ categoryFilter: 'meet', hovered: asItem(spaces[0]) }),
    )
    expect(highlights.filter((h) => h.id === 'a')).toHaveLength(1)
    // Hover is last, so it wins when styles are applied.
    expect(highlights.at(-1)?.id).toBe('a')
    expect(highlights.at(-1)?.fillOpacity).toBeGreaterThan(
      highlights.find((h) => h.id === 'b')!.fillOpacity,
    )
  })

  it('clears hover when it moves away, leaving no residue', () => {
    expect(ids({ hovered: asItem(spaces[0]) })).toEqual(['a'])
    expect(ids({ hovered: null })).toEqual([])
  })

  it('highlights where a selected event is held', () => {
    expect(
      ids({ selected: { type: 'event', data: event('retro', spaces[1]) } }),
    ).toEqual(['b'])
  })

  it('shows every event room while the events are open, the focused one strongest', () => {
    const events = [event('yoga', spaces[0]), event('retro', spaces[1])]
    expect(ids({ events })).toEqual([])

    const highlights = computeHighlights(
      input({ events, eventsOpen: true, focusedEventId: 'retro' }),
    )
    const focused = highlights.find((h) => h.id === 'b')!
    const other = highlights.find((h) => h.id === 'a')!
    expect(focused.fillOpacity).toBeGreaterThan(other.fillOpacity)
  })

  it('colours meeting rooms by booking status', () => {
    const highlights = computeHighlights(
      input({ categoryFilter: 'meet', bookedSpaceIds: new Set(['a']) }),
    )
    const booked = highlights.find((h) => h.id === 'a')!
    const free = highlights.find((h) => h.id === 'b')!
    expect(booked.fill).not.toBe(free.fill)
  })
})

describe('toNodeStyles', () => {
  const getSpaces = vi.fn(() => [
    {
      id: 'a',
      elements: [
        { id: 'chair', type: 'element:asset' },
        { id: 'wall', type: 'element:wall' },
        { id: 'b', type: 'element:asset' },
      ],
    },
  ])
  const floorPlan = { getSpaces } as unknown as FloorPlanEngine

  it('tints the furniture inside a highlighted space, in one query', () => {
    const styles = toNodeStyles(floorPlan, [
      { id: 'a', type: 'layout:space', fill: '#ffffff', fillOpacity: 0.5 },
    ])
    const furniture = {
      fill: [179, 179, 179],
      fillOpacity: 0.45,
      strokeWidth: 0,
    }
    expect(getSpaces).toHaveBeenCalledOnce()
    expect(styles).toEqual([
      { id: 'chair', type: 'element:asset', style: furniture },
      { id: 'b', type: 'element:asset', style: furniture },
      {
        id: 'a',
        type: 'layout:space',
        style: { fill: '#ffffff', fillOpacity: 0.5 },
      },
    ])
  })

  it('leaves a node that has a highlight of its own alone', () => {
    const styles = toNodeStyles(floorPlan, [
      { id: 'a', type: 'layout:space', fill: '#ffffff', fillOpacity: 0.5 },
      { id: 'b', type: 'element:asset', fill: '#000000', fillOpacity: 1 },
    ])
    expect(styles.filter((s) => s.id === 'b')).toEqual([
      {
        id: 'b',
        type: 'element:asset',
        style: { fill: '#000000', fillOpacity: 1 },
      },
    ])
  })
})

import { describe, expect, it } from 'vitest'
import type { SearchableItem, Space } from '#/core/domain/types'
import type { KioskState } from '#/core/domain/state'
import { initialKioskState, reduce } from '#/core/domain/state'

const space: Space = {
  id: 's1',
  name: 'Oslo',
  position: [0, 0],
  category: 'meet',
  subCategory: 'meetingRoom',
}
const item: SearchableItem = { type: 'space', data: space }

const after = (state: KioskState, ...actions: Parameters<typeof reduce>[1][]) =>
  actions.reduce(reduce, state)

describe('kiosk state', () => {
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
    expect(after(initialKioskState, { type: 'select', item }).mode).toBe(
      'wayfinding',
    )
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
    const point = { position: [1, 1] as [number, number], name: 'Corridor' }
    const dragged = after(
      initialKioskState,
      { type: 'select', item },
      { type: 'moveDestination', point },
    )
    expect(dragged.destinationOverride).toEqual(point)
    expect(
      after(dragged, { type: 'select', item }).destinationOverride,
    ).toBeNull()
  })

  it('puts the origin back where the kiosk stands on reset', () => {
    const point = { position: [1, 1] as [number, number], name: 'Corridor' }
    const moved = after(initialKioskState, { type: 'moveOrigin', point })
    expect(moved.originOverride).toEqual(point)
    expect(after(moved, { type: 'reset' }).originOverride).toBeNull()
  })

  it('drops hover when something is selected', () => {
    const state = after(
      initialKioskState,
      { type: 'hover', item },
      { type: 'select', item },
    )
    expect(state.hovered).toBeNull()
  })

  it('ignores hover while a destination is selected', () => {
    const state = after(
      initialKioskState,
      { type: 'select', item },
      { type: 'hover', item },
    )
    expect(state.hovered).toBeNull()
  })

  it('reset is one transition, whether the visitor left or pressed home', () => {
    const busy = after(
      initialKioskState,
      { type: 'startSearch' },
      { type: 'setQuery', query: 'oslo' },
      { type: 'setCategoryFilter', category: 'meet' },
      { type: 'select', item },
    )
    expect(busy).not.toEqual(initialKioskState)
    expect(after(busy, { type: 'reset' })).toEqual(initialKioskState)
  })

  it('never mutates the state it is given', () => {
    const before = { ...initialKioskState }
    reduce(before, { type: 'select', item })
    expect(before).toEqual(initialKioskState)
  })
})

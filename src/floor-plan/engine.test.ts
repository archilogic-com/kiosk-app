import { describe, expect, it, vi } from 'vitest'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { loadFloorPlan, readFloor, resolveClick } from '#/floor-plan/engine'

/** Spaces as `getSpaces` returns them for the fields the kiosk selects. */
const SPACES = [
  {
    id: 'foyer',
    name: '',
    labelPoint: [0, 0],
    category: 'circulate',
    subCategory: 'foyer',
  },
  {
    id: 'corridor',
    name: 'Hall',
    labelPoint: [5, 0],
    category: 'circulate',
    subCategory: 'corridor',
  },
  {
    id: 'oslo',
    name: 'Oslo',
    labelPoint: [10, 0],
    category: 'meet',
    subCategory: 'meetingRoom',
    seatCapacity: 8,
    customAttributes: { isBookable: false },
  },
  {
    id: 'wc',
    name: ' ',
    labelPoint: [15, 0],
    category: 'care',
    subCategory: 'wc',
  },
  {
    id: 'store',
    name: '',
    labelPoint: [20, 0],
    category: 'support',
    subCategory: 'storage',
  },
]

const WORKSTATIONS = [
  {
    id: 'desk-1',
    transform: { position: [30, 0, 4] },
    customAttributes: { 'Occupant-Name': 'Ada Lovelace' },
  },
  { id: 'desk-2', transform: { position: [40, 0, 4] }, customAttributes: {} },
]

const { engines, control } = vi.hoisted(() => ({
  engines: [] as Array<{ destroyed: boolean; zoomExtents: unknown }>,
  control: { result: Promise.resolve<boolean | Error>(true) },
}))

vi.mock('@archilogic/floor-plan-sdk', () => ({
  FloorPlanEngine: class {
    destroyed = false
    zoomExtents = vi.fn()
    constructor() {
      engines.push(this)
    }
    loadFloorById() {
      return control.result
    }
    loadLayoutById() {
      return control.result
    }
    getBoundingBox() {
      return { min: [0, 0], max: [1, 1] }
    }
    getZoomExtentsBoundingBox(box: unknown) {
      return box
    }
    getElements() {
      return []
    }
    getSpaces() {
      return []
    }
    destroy() {
      this.destroyed = true
    }
  },
}))

function deferred() {
  let resolve!: (value: boolean | Error) => void
  const promise = new Promise<boolean | Error>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('loadFloorPlan', () => {
  it('reports each stage and resolves with the framed engine', async () => {
    const load = deferred()
    control.result = load.promise
    const stages: string[] = []
    const loader = loadFloorPlan(document.createElement('div'), {})
    loader.subscribe(() => stages.push(loader.getStage()))

    expect(loader.getStage()).toBe('engine')
    await vi.waitFor(() => expect(loader.getStage()).toBe('floor'))

    load.resolve(true)
    const { floorPlan } = await loader.ready
    expect(floorPlan).toBe(engines.at(-1))
    expect(engines.at(-1)?.zoomExtents).toHaveBeenCalledWith(
      undefined,
      false,
      expect.anything(),
    )
    expect(stages).toEqual(['floor', 'ready'])
  })

  it('rejects, destroys the engine and reports an error when the floor fails', async () => {
    control.result = Promise.resolve(new Error('no such floor'))
    const loader = loadFloorPlan(document.createElement('div'), {})

    await expect(loader.ready).rejects.toThrow('no such floor')
    await vi.waitFor(() => expect(loader.getStage()).toBe('error'))
    expect(engines.at(-1)?.destroyed).toBe(true)
  })

  it('stops notifying an unsubscribed listener', async () => {
    control.result = Promise.resolve(true)
    const loader = loadFloorPlan(document.createElement('div'), {})
    const listener = vi.fn()
    loader.subscribe(listener)()

    await loader.ready
    expect(listener).not.toHaveBeenCalled()
  })
})

/** Answers `getSpaces({ where: { at } })` with whichever space is labelled there. */
const floorPlan = {
  getElements: () => WORKSTATIONS,
  getSpaces: ({ where }: { where?: { at?: [number, number] } } = {}) =>
    where?.at
      ? SPACES.filter((s) => s.labelPoint[0] === where.at?.[0])
      : SPACES,
} as unknown as FloorPlanEngine

describe('readFloor', () => {
  const floor = readFloor(floorPlan, {
    occupantName: 'Occupant-Name',
    employeeId: 'Employee-ID',
  })

  it('lists named spaces and unnamed restrooms, but not corridors', () => {
    expect(floor.spaces.map((s) => [s.id, s.name])).toEqual([
      ['oslo', 'Oslo'],
      ['wc', 'WC'],
    ])
  })

  it('reads bookability and capacity from the space', () => {
    expect(floor.spaces[0]).toMatchObject({
      seatCapacity: 8,
      isBookable: false,
    })
    expect(floor.spaces[1].isBookable).toBe(true)
  })

  it('reads occupants from custom attributes, on the X/Z plane', () => {
    expect(floor.workstations[0]).toEqual({
      id: 'desk-1',
      position: [30, 4],
      occupantName: 'Ada Lovelace',
      employeeId: null,
    })
    expect(floor.workstations[1].occupantName).toBeNull()
  })

  it('stands the kiosk in the foyer, named by its type', () => {
    expect(floor.kioskPosition).toEqual([0, 0])
    expect(floor.kioskSpaceName).toBe('Foyer')
  })

  it('counts spaces per category, and occupied desks as people', () => {
    expect(floor.categoryCounts).toEqual({ people: 1, meet: 1, care: 1 })
  })
})

describe('resolveClick', () => {
  const floor = readFloor(floorPlan)
  const click = (nodeId: string | undefined, position: [number, number]) =>
    resolveClick(
      floorPlan,
      { nodeId, position, sourceEvent: new MouseEvent('click') },
      floor,
    )

  it('selects a known space or workstation by the node clicked', () => {
    expect(click('oslo', [99, 99])?.data.id).toBe('oslo')
    expect(click('desk-2', [99, 99])?.type).toBe('workstation')
  })

  it('counts a near miss on a workstation', () => {
    expect(click(undefined, [30.5, 4.5])?.data.id).toBe('desk-1')
  })

  it('falls back to whatever space is under the click, listed or not', () => {
    expect(click('some-wall', [20, 0])?.data).toMatchObject({
      id: 'store',
      name: 'Storage',
    })
    expect(click(undefined, [99, 99])).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { Space } from '#/core/domain/types'
import type {
  RouteState,
  WayfindingInput,
} from '#/core/sdk/wayfinding-controller'
import { WayfindingController } from '#/core/sdk/wayfinding-controller'

/**
 * Enough of an engine for the controller: markers and layers are recorded,
 * and `getPath` resolves when the test says so, which is what makes ordering
 * observable.
 */
function fakeEngine() {
  const layers: Array<{ destroyed: boolean; graphics: unknown[] }> = []
  const markers: Array<{ removed: boolean; set: ReturnType<typeof vi.fn> }> = []
  const pending: Array<(r: { path: Vector2[]; distance: number }) => void> = []
  const engine = {
    getPath: vi.fn(
      () =>
        new Promise<{ path: Vector2[]; distance: number }>((resolve) => {
          pending.push(resolve)
        }),
    ),
    addLayer: vi.fn(() => {
      const layer = {
        destroyed: false,
        graphics: [] as unknown[],
        addGraphic: (g: unknown) => layer.graphics.push(g),
        destroy: () => {
          layer.destroyed = true
        },
      }
      layers.push(layer)
      return layer
    }),
    addHtmlMarker: vi.fn(() => {
      const marker = {
        removed: false,
        size: [100, 40],
        set: vi.fn(),
        remove: () => {
          marker.removed = true
        },
      }
      markers.push(marker)
      return marker
    }),
    getSpaces: () => [],
    getSpacesById: () => ({ elements: [] }),
    getPlanPosition: (p: Vector2) => p,
  }
  return {
    engine: engine as unknown as FloorPlanEngine,
    layers,
    markers,
    /** Resolve the oldest outstanding getPath call. */
    resolveNext: (distance: number) =>
      pending.shift()?.({
        path: [
          [0, 0],
          [0, distance],
        ],
        distance,
      }),
    pendingCount: () => pending.length,
  }
}

const oslo: Space = {
  id: 'oslo',
  name: 'Oslo',
  position: [0, 10],
  category: 'meet',
  subCategory: 'meetingRoom',
}
const lagos: Space = { ...oslo, id: 'lagos', name: 'Lagos', position: [0, 20] }
/** Shared across inputs: a fresh array would read as a changed floor. */
const SPACES = [oslo, lagos]
const KIOSK: Vector2 = [0, 0]

const input = (over: Partial<WayfindingInput> = {}): WayfindingInput => ({
  kioskPosition: KIOSK,
  kioskSpaceName: 'Foyer',
  target: null,
  originOverride: null,
  destinationOverride: null,
  spaces: SPACES,
  style: { smoothing: 0, thickness: 4, dashed: false },
  zoomOnNavigate: false,
  ...over,
})

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('WayfindingController', () => {
  it('reports the current route to a subscriber straight away', () => {
    const { engine } = fakeEngine()
    const controller = new WayfindingController(engine)
    const seen: RouteState[] = []
    controller.subscribe((r) => seen.push(r))
    expect(seen).toHaveLength(1)
    expect(seen[0].distance).toBeNull()
  })

  it('draws a path and reports distance and directions once getPath resolves', async () => {
    const fake = fakeEngine()
    const controller = new WayfindingController(fake.engine)
    const seen: RouteState[] = []
    controller.subscribe((r) => seen.push(r))

    controller.update(input({ target: { type: 'space', data: oslo } }))
    expect(fake.layers).toHaveLength(0)
    fake.resolveNext(10)
    await flush()

    expect(fake.layers.filter((l) => !l.destroyed)).toHaveLength(1)
    const route = seen.at(-1)!
    expect(route.distance).toBe(10)
    expect(route.directions.at(-1)?.instruction).toBe('Arrive at Oslo')
    expect(route.nodeStyles).toHaveProperty('oslo')
  })

  it('ignores a route that resolves after the destination changed', async () => {
    const fake = fakeEngine()
    const controller = new WayfindingController(fake.engine)
    const seen: RouteState[] = []
    controller.subscribe((r) => seen.push(r))

    controller.update(input({ target: { type: 'space', data: oslo } }))
    controller.update(input({ target: { type: 'space', data: lagos } }))
    expect(fake.pendingCount()).toBe(2)

    // Lagos answers first, then the stale Oslo request lands.
    fake.resolveNext(10) // oslo
    fake.resolveNext(20) // lagos
    await flush()

    expect(seen.at(-1)?.distance).toBe(20)
    const live = fake.layers.filter((l) => !l.destroyed)
    expect(live).toHaveLength(1)
    expect(seen.at(-1)?.directions.at(-1)?.instruction).toBe('Arrive at Lagos')
  })

  it('leaves nothing drawn when the destination is cleared mid-route', async () => {
    const fake = fakeEngine()
    const controller = new WayfindingController(fake.engine)
    const seen: RouteState[] = []
    controller.subscribe((r) => seen.push(r))

    controller.update(input({ target: { type: 'space', data: oslo } }))
    controller.update(input({ target: null }))
    fake.resolveNext(10)
    await flush()

    expect(fake.layers.filter((l) => !l.destroyed)).toHaveLength(0)
    expect(seen.at(-1)?.distance).toBeNull()
    expect(seen.at(-1)?.pathError).toBeNull()
  })

  it('surfaces a failed path as an error rather than an empty panel', async () => {
    const fake = fakeEngine()
    ;(
      fake.engine.getPath as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error('No path found'))
    const controller = new WayfindingController(fake.engine)
    const seen: RouteState[] = []
    controller.subscribe((r) => seen.push(r))
    controller.update(input({ target: { type: 'space', data: oslo } }))
    await flush()
    expect(seen.at(-1)?.pathError).toBe('No path found')
  })

  it('keeps one origin and one destination marker across destination changes', () => {
    const fake = fakeEngine()
    const controller = new WayfindingController(fake.engine)
    controller.update(input({ target: { type: 'space', data: oslo } }))
    controller.update(input({ target: { type: 'space', data: lagos } }))
    controller.update(input({ target: { type: 'space', data: oslo } }))
    expect(fake.markers.filter((m) => !m.removed)).toHaveLength(2)
    controller.destroy()
    expect(fake.markers.filter((m) => !m.removed)).toHaveLength(0)
  })

  it('puts the origin marker back when its override is cleared by a reset', () => {
    const fake = fakeEngine()
    const controller = new WayfindingController(fake.engine)
    controller.update(input())
    const origin = fake.markers[0]
    const moved = { position: [5, 5] as Vector2, name: 'Corridor' }
    controller.update(input({ originOverride: moved }))
    expect(origin.set).toHaveBeenLastCalledWith({ position: [5, 5] })
    controller.update(input({ originOverride: null }))
    expect(origin.set).toHaveBeenLastCalledWith({ position: KIOSK })
    // Still the same marker: a reset repositions, it does not rebuild.
    expect(fake.markers.filter((m) => !m.removed)).toHaveLength(1)
  })

  it('does not reroute when only the input object identity changes', () => {
    const fake = fakeEngine()
    const controller = new WayfindingController(fake.engine)
    controller.update(input({ target: { type: 'space', data: oslo } }))
    const target = controller['previous']!.target
    controller.update(input({ target }))
    expect(fake.engine.getPath).toHaveBeenCalledTimes(1)
  })
})

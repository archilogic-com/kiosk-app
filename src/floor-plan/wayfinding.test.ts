import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import {
  boundingBox,
  generateDirections,
  roundCorners,
  useRoute,
} from '#/floor-plan/wayfinding'
import type { NavigableItem, PlacedPoint, Space } from '#/kiosk-state'

type PathResult = { path: Vector2[]; distance: number }

/**
 * Enough of an engine for wayfinding: markers and layers are recorded, and
 * `getPath` resolves when the test says so, which makes ordering observable.
 */
function fakeEngine() {
  const layers: Array<{ destroyed: boolean }> = []
  const markers: Array<{ removed: boolean; set: ReturnType<typeof vi.fn> }> = []
  const pending: Array<(result: PathResult) => void> = []
  const getPath = vi.fn(
    () =>
      new Promise<PathResult>((resolve) => {
        pending.push(resolve)
      }),
  )
  const engine = {
    getPath,
    addLayer: () => {
      const layer = {
        destroyed: false,
        addGraphic: () => {},
        destroy: () => {
          layer.destroyed = true
        },
      }
      layers.push(layer)
      return layer
    },
    addHtmlMarker: () => {
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
    },
    getSpaces: () => [],
  }
  return {
    floorPlan: engine as unknown as FloorPlanEngine,
    getPath,
    liveLayers: () => layers.filter((l) => !l.destroyed),
    liveMarkers: () => markers.filter((m) => !m.removed),
    markers,
    /** Resolve the oldest outstanding getPath call with a straight path. */
    resolveNext: async (distance: number) => {
      await act(async () =>
        pending.shift()?.({
          path:
            distance > 0
              ? [
                  [0, 0],
                  [0, distance],
                ]
              : [],
          distance,
        }),
      )
    },
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
const toOslo: NavigableItem = { type: 'space', data: oslo }
const toLagos: NavigableItem = { type: 'space', data: lagos }
const KIOSK: Vector2 = [0, 0]
/** Shared across renders: a fresh array would read as a changed floor. */
const SPACES = [oslo, lagos]
const STYLE = { smoothing: 0, thickness: 4, dashed: false }

interface Props {
  target: NavigableItem | null
  originOverride?: PlacedPoint | null
}

function renderRoute(floorPlan: FloorPlanEngine, target: NavigableItem | null) {
  const initialProps: Props = { target }
  return renderHook(
    ({ target, originOverride = null }: Props) =>
      useRoute(floorPlan, {
        kioskPosition: KIOSK,
        kioskSpaceName: 'Foyer',
        target,
        originOverride,
        destinationOverride: null,
        spaces: SPACES,
        style: STYLE,
        zoomOnNavigate: false,
        onOriginMoved: () => {},
        onDestinationMoved: () => {},
      }),
    { initialProps },
  )
}

describe('useRoute', () => {
  it('reports no route until there is a destination', () => {
    const { floorPlan, getPath } = fakeEngine()
    const { result } = renderRoute(floorPlan, null)
    expect(result.current.distance).toBeNull()
    expect(getPath).not.toHaveBeenCalled()
  })

  it('draws a path and reports distance and directions once getPath resolves', async () => {
    const fake = fakeEngine()
    const { result } = renderRoute(fake.floorPlan, toOslo)
    expect(fake.liveLayers()).toHaveLength(0)

    await fake.resolveNext(10)
    expect(fake.liveLayers()).toHaveLength(1)
    expect(result.current.distance).toBe(10)
    expect(result.current.directions.at(-1)?.instruction).toBe('Arrive at Oslo')
  })

  it('ignores a route that resolves after the destination changed', async () => {
    const fake = fakeEngine()
    const { result, rerender } = renderRoute(fake.floorPlan, toOslo)
    rerender({ target: toLagos })

    await fake.resolveNext(10) // the stale route to Oslo
    await fake.resolveNext(20)
    expect(result.current.distance).toBe(20)
    expect(result.current.directions.at(-1)?.instruction).toBe(
      'Arrive at Lagos',
    )
    expect(fake.liveLayers()).toHaveLength(1)
  })

  it('leaves nothing drawn when the destination is cleared mid-route', async () => {
    const fake = fakeEngine()
    const { result, rerender } = renderRoute(fake.floorPlan, toOslo)
    rerender({ target: null })

    await fake.resolveNext(10)
    expect(fake.liveLayers()).toHaveLength(0)
    expect(result.current).toMatchObject({ distance: null, pathError: null })
  })

  it('reports an unreachable destination when getPath returns an empty path', async () => {
    const fake = fakeEngine()
    const { result } = renderRoute(fake.floorPlan, toOslo)

    await fake.resolveNext(0)
    expect(result.current.pathError).toBe(
      'No walking path to this destination.',
    )
    expect(result.current.distance).toBeNull()
    expect(fake.liveLayers()).toHaveLength(0)
  })

  it('surfaces a failed path as an error rather than an empty panel', async () => {
    const fake = fakeEngine()
    fake.getPath.mockRejectedValueOnce(new Error('No path found'))
    const { result } = renderRoute(fake.floorPlan, toOslo)

    await act(async () => {})
    expect(result.current.pathError).toBe('No path found')
  })

  it('keeps one origin and one destination pin across destination changes', () => {
    const fake = fakeEngine()
    const { rerender, unmount } = renderRoute(fake.floorPlan, toOslo)
    rerender({ target: toLagos })
    rerender({ target: toOslo })
    expect(fake.liveMarkers()).toHaveLength(2)

    unmount()
    expect(fake.liveMarkers()).toHaveLength(0)
  })

  it('puts the origin pin back when its override is cleared by a reset', () => {
    const fake = fakeEngine()
    const { rerender } = renderRoute(fake.floorPlan, null)
    const [origin] = fake.markers

    rerender({
      target: null,
      originOverride: { position: [5, 5], name: 'Hall' },
    })
    expect(origin.set).toHaveBeenLastCalledWith({ position: [5, 5] })
    rerender({ target: null, originOverride: null })
    expect(origin.set).toHaveBeenLastCalledWith({ position: KIOSK })
    // Still the same pin: a reset repositions it rather than rebuilding it.
    expect(fake.liveMarkers()).toHaveLength(1)
  })

  it('does not reroute when rendered again with the same destination', () => {
    const fake = fakeEngine()
    const { rerender } = renderRoute(fake.floorPlan, toOslo)
    rerender({ target: toOslo })
    expect(fake.getPath).toHaveBeenCalledOnce()
  })
})

/** An engine that knows no spaces, so walks carry no "through" context. */
const noSpaces = { getSpaces: () => [] } as unknown as FloorPlanEngine

describe('generateDirections', () => {
  const directions = (path: Vector2[], spaces: Space[] = []) =>
    generateDirections(path, spaces, 'Oslo', noSpaces)

  it('describes a straight walk as one step and an arrival', () => {
    const steps = directions([
      [0, 0],
      [0, 10],
    ])
    expect(steps.map((s) => s.kind)).toEqual(['walk', 'arrive'])
    expect(steps[0].instruction).toBe('Walk 10m')
    expect(steps[1].instruction).toBe('Arrive at Oslo')
  })

  it('classifies turns by kind rather than by wording', () => {
    // Plan coordinates have y growing downwards, so heading +y then +x bears
    // left.
    const left = directions([
      [0, 0],
      [0, 10],
      [10, 10],
    ])
    const right = directions([
      [0, 0],
      [0, 10],
      [-10, 10],
    ])
    expect(left.map((s) => s.kind)).toEqual([
      'walk',
      'turn-left',
      'walk',
      'arrive',
    ])
    expect(right.map((s) => s.kind)).toEqual([
      'walk',
      'turn-right',
      'walk',
      'arrive',
    ])
    expect(left[1].instruction).toBe('Turn left')
    expect(left[2].instruction).toBe('Continue for 10m')
  })

  it('names the nearest space at a turn', () => {
    const reception: Space = {
      id: 's',
      name: 'Reception',
      position: [1, 10],
      category: 'socialize',
      subCategory: 'reception',
    }
    const steps = directions(
      [
        [0, 0],
        [0, 10],
        [10, 10],
      ],
      [reception],
    )
    expect(steps[1]).toMatchObject({ kind: 'turn-left', landmark: 'Reception' })
    expect(steps[1].instruction).toBe('Turn left at Reception')
  })

  it('gives each step the stretch of the raw path it covers', () => {
    // A wobble at [0.1, 3] is straightened out of the directions but stays
    // in the drawn path, so the walk must span it rather than skip it.
    const path: Vector2[] = [
      [0, 0],
      [0.1, 3],
      [0, 6],
      [0, 10],
      [10, 10],
    ]
    const [walk, turn, onward, arrive] = directions(path)
    expect(walk.points).toEqual(path.slice(0, 4))
    expect(turn.points).toEqual([
      [0, 8],
      [0, 10],
      [2, 10],
    ])
    expect(onward.points).toEqual(path.slice(3))
    expect(arrive.points).toEqual([
      [8, 10],
      [10, 10],
    ])
  })

  it('follows the drawn path around a corner it takes in several vertices', () => {
    // Two 45° bends make one turn in the directions, but the highlight must
    // trace both bends rather than cut straight across them.
    const path: Vector2[] = [
      [0, 0],
      [0, 10],
      [1, 11],
      [11, 11],
    ]
    const [, turn] = directions(path)
    expect(turn.kind).toBe('slight-left')
    expect(turn.points).toHaveLength(4)
    expect(turn.points.slice(0, 3)).toEqual([
      [0, 8],
      [0, 10],
      [1, 11],
    ])
    expect(turn.points[3][0]).toBeCloseTo(1 + (2 - Math.SQRT2))
    expect(turn.points[3][1]).toBe(11)
  })

  it('keeps only the first of back-to-back turns', () => {
    const steps = directions([
      [0, 0],
      [0, 10],
      [0.5, 10.5],
      [0.5, 20],
    ])
    const turns = steps.filter((s) => s.kind !== 'walk' && s.kind !== 'arrive')
    expect(turns).toHaveLength(1)
  })
})

describe('roundCorners', () => {
  const corner: Vector2[] = [
    [0, 0],
    [10, 0],
    [10, 10],
  ]

  it('leaves a straight two-point path alone', () => {
    const path: Vector2[] = [
      [0, 0],
      [10, 0],
    ]
    expect(roundCorners(path, 0.6, 6)).toEqual(path)
  })

  it('returns the input when smoothing is off', () => {
    expect(roundCorners(corner, 0.6, 0)).toEqual(corner)
  })

  it('keeps the endpoints and replaces the sharp vertex with an arc', () => {
    const smoothed = roundCorners(corner, 0.6, 6)
    expect(smoothed.at(0)).toEqual([0, 0])
    expect(smoothed.at(-1)).toEqual([10, 10])
    expect(smoothed.length).toBeGreaterThan(corner.length)
    expect(smoothed).not.toContainEqual([10, 0])
  })

  it('never cuts more than 40% into a segment, so paths stay off walls', () => {
    const tight: Vector2[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ]
    const smoothed = roundCorners(tight, 100, 6)
    for (const [x, y] of smoothed) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
    expect(smoothed.some(([x]) => x >= 0.6 - 1e-9)).toBe(true)
  })

  it('skips degenerate vertices rather than dividing by zero', () => {
    const duplicated: Vector2[] = [
      [0, 0],
      [0, 0],
      [5, 5],
    ]
    expect(
      roundCorners(duplicated, 0.6, 6).every(
        ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
      ),
    ).toBe(true)
  })
})

describe('boundingBox', () => {
  it('covers every point plus the padding', () => {
    expect(
      boundingBox(
        [
          [0, 0],
          [10, 4],
        ],
        2,
      ),
    ).toEqual({ min: [-2, -2], max: [12, 6] })
  })

  it('handles a single point', () => {
    expect(boundingBox([[5, 5]], 1)).toEqual({ min: [4, 4], max: [6, 6] })
  })
})

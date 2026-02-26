import { describe, expect, it } from 'vitest'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { generateDirections } from '#/core/wayfinding/directions'

/** An engine that knows no spaces, so walks carry no "through" context. */
const floorPlan = { getSpaces: () => [] } as unknown as FloorPlanEngine

describe('generateDirections', () => {
  it('describes a straight walk as one step and an arrival', () => {
    const steps = generateDirections(
      [
        [0, 0],
        [0, 10],
      ],
      [],
      'Oslo',
      floorPlan,
    )
    expect(steps.map((s) => s.kind)).toEqual(['walk', 'arrive'])
    expect(steps[0].instruction).toBe('Walk 10m')
    expect(steps[1].instruction).toBe('Arrive at Oslo')
  })

  it('classifies turns by kind rather than by wording', () => {
    const left = generateDirections(
      [
        [0, 0],
        [0, 10],
        [10, 10],
      ],
      [],
      'Oslo',
      floorPlan,
    )
    const right = generateDirections(
      [
        [0, 0],
        [0, 10],
        [-10, 10],
      ],
      [],
      'Oslo',
      floorPlan,
    )
    // Plan coordinates have y growing downwards, so heading +y then +x
    // bears left.
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
  })

  it('names the nearest space at a turn', () => {
    const steps = generateDirections(
      [
        [0, 0],
        [0, 10],
        [10, 10],
      ],
      [
        {
          id: 's',
          name: 'Reception',
          position: [1, 10],
          category: 'socialize',
          subCategory: 'reception',
        },
      ],
      'Oslo',
      floorPlan,
    )
    expect(steps[1]).toMatchObject({
      kind: 'turn-left',
      landmark: 'Reception',
    })
    expect(steps[1].instruction).toBe('Turn left at Reception')
  })

  it('keeps only the first of back-to-back turns', () => {
    const steps = generateDirections(
      [
        [0, 0],
        [0, 10],
        [0.5, 10.5],
        [0.5, 20],
      ],
      [],
      'Oslo',
      floorPlan,
    )
    const turns = steps.filter((s) => s.kind !== 'walk' && s.kind !== 'arrive')
    expect(turns).toHaveLength(1)
  })
})

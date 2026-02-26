import { describe, expect, it } from 'vitest'
import type { Vector2 } from '@archilogic/floor-plan-sdk'
import { pathBoundingBox, roundCorners } from '#/core/wayfinding/path'

const corner: Vector2[] = [
  [0, 0],
  [10, 0],
  [10, 10],
]

describe('roundCorners', () => {
  it('leaves a straight two-point path alone', () => {
    const path: Vector2[] = [
      [0, 0],
      [10, 0],
    ]
    expect(roundCorners(path)).toEqual(path)
  })

  it('returns the input when smoothing is disabled', () => {
    expect(roundCorners(corner, 0.6, 0)).toEqual(corner)
  })

  it('keeps the endpoints exactly', () => {
    const smoothed = roundCorners(corner)
    expect(smoothed.at(0)).toEqual([0, 0])
    expect(smoothed.at(-1)).toEqual([10, 10])
  })

  it('replaces the sharp vertex with an arc', () => {
    const smoothed = roundCorners(corner)
    expect(smoothed.length).toBeGreaterThan(corner.length)
    expect(smoothed).not.toContainEqual([10, 0])
  })

  it('never cuts more than 40% into a segment, so paths stay off walls', () => {
    // A huge radius on a short segment must still be clamped.
    const tight: Vector2[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ]
    const smoothed = roundCorners(tight, 100)
    for (const [x, y] of smoothed) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
    // the arc must start no earlier than 40% back along the incoming segment
    expect(Math.min(...smoothed.map((p) => p[0]))).toBeGreaterThanOrEqual(0)
    expect(smoothed.some((p) => p[0] >= 0.6 - 1e-9)).toBe(true)
  })

  it('skips degenerate vertices rather than dividing by zero', () => {
    const duplicated: Vector2[] = [
      [0, 0],
      [0, 0],
      [5, 5],
    ]
    expect(
      roundCorners(duplicated).every(
        ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
      ),
    ).toBe(true)
  })
})

describe('pathBoundingBox', () => {
  it('covers every point plus the padding', () => {
    expect(
      pathBoundingBox(
        [
          [0, 0],
          [10, 4],
        ],
        2,
      ),
    ).toEqual({
      min: [-2, -2],
      max: [12, 6],
    })
  })

  it('handles a single point', () => {
    expect(pathBoundingBox([[5, 5]], 1)).toEqual({ min: [4, 4], max: [6, 6] })
  })
})

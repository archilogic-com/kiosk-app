import type { BoundingBox2d, Vector2 } from '@archilogic/floor-plan-sdk'

/**
 * Round sharp corners in a polyline by replacing each interior vertex with
 * a short quadratic-bezier arc sampled as extra polyline points.
 * The arc stays within `radius` meters of the original corner so the path
 * doesn't shortcut through walls.
 */
export function roundCorners(
  points: Vector2[],
  radius = 0.6,
  steps = 6,
): Vector2[] {
  if (points.length <= 2 || steps <= 0) return points

  const result: Vector2[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    const toPrev: Vector2 = [prev[0] - curr[0], prev[1] - curr[1]]
    const toNext: Vector2 = [next[0] - curr[0], next[1] - curr[1]]
    const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2)
    const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2)

    if (lenPrev < 0.01 || lenNext < 0.01) {
      result.push(curr)
      continue
    }

    // Clamp radius so it never exceeds 40 % of either segment
    const r = Math.min(radius, lenPrev * 0.4, lenNext * 0.4)

    const before: Vector2 = [
      curr[0] + (toPrev[0] / lenPrev) * r,
      curr[1] + (toPrev[1] / lenPrev) * r,
    ]
    const after: Vector2 = [
      curr[0] + (toNext[0] / lenNext) * r,
      curr[1] + (toNext[1] / lenNext) * r,
    ]

    // Sample a quadratic bezier arc: before → curr (control) → after
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const u = 1 - t
      result.push([
        u * u * before[0] + 2 * u * t * curr[0] + t * t * after[0],
        u * u * before[1] + 2 * u * t * curr[1] + t * t * after[1],
      ])
    }
  }

  result.push(points[points.length - 1])
  return result
}

/** Compute a bounding box that contains all given points with padding */
export function pathBoundingBox(
  points: Vector2[],
  padding: number,
): BoundingBox2d {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return {
    min: [minX - padding, minY - padding],
    max: [maxX + padding, maxY + padding],
  }
}

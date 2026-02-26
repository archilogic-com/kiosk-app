import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { Space } from '#/core/domain/types'
/** What a step asks the visitor to do; the UI picks an icon from it. */
export type StepKind =
  | 'walk'
  | 'turn-left'
  | 'turn-right'
  | 'slight-left'
  | 'slight-right'
  | 'arrive'

export interface DirectionStep {
  kind: StepKind
  instruction: string
  distance: number
  landmark: string | null
}

/** Distance threshold (meters) to consider a space "near" a turn point */
const LANDMARK_RADIUS = 4

/**
 * Angle threshold (radians): below this the path is considered straight.
 * ~30° absorbs minor wobbles from the pathfinding graph.
 */
const STRAIGHT_THRESHOLD = Math.PI / 6

/** Minimum walk distance (meters) to report as its own step */
const MIN_WALK_DISTANCE = 2

/** Human-readable space descriptions by category */
const SPACE_DESCRIPTIONS: Record<string, string> = {
  'circulate/corridor': 'the corridor',
  'circulate/foyer': 'the foyer',
  'circulate/staircase': 'the staircase',
  'circulate/elevator': 'the elevator area',
  'socialize/cafe': 'the cafe',
  'socialize/reception': 'reception',
  'work/openWorkspace': 'the open workspace',
}

function dist(a: Vector2, b: Vector2): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function angle(a: Vector2, b: Vector2): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

/**
 * Simplify a polyline by removing interior points that are nearly collinear
 * with their neighbors (angle deviation below threshold).
 */
function simplifyPath(path: Vector2[]): Vector2[] {
  if (path.length <= 2) return path

  const result: Vector2[] = [path[0]]

  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = path[i]
    const next = path[i + 1]

    const a1 = angle(prev, curr)
    const a2 = angle(curr, next)
    let delta = a2 - a1
    while (delta > Math.PI) delta -= 2 * Math.PI
    while (delta < -Math.PI) delta += 2 * Math.PI

    if (Math.abs(delta) >= STRAIGHT_THRESHOLD) {
      result.push(curr)
    }
  }

  result.push(path[path.length - 1])
  return result
}

/**
 * Compute the signed turn angle between two consecutive segments.
 * Positive delta = left turn (counter-clockwise), negative = right turn.
 * The classifyTurn function expects: negative = left, positive = right.
 */
function turnAngle(prev: Vector2, curr: Vector2, next: Vector2): number {
  const a1 = angle(prev, curr)
  const a2 = angle(curr, next)
  let delta = a2 - a1
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  return delta
}

type TurnKind = Exclude<StepKind, 'walk' | 'arrive'>

function classifyTurn(a: number): TurnKind {
  const slight = Math.abs(a) < Math.PI / 3
  if (a > 0) return slight ? 'slight-right' : 'turn-right'
  return slight ? 'slight-left' : 'turn-left'
}

const TURN_VERBS: Record<TurnKind, string> = {
  'slight-left': 'Slight left',
  'slight-right': 'Slight right',
  'turn-left': 'Turn left',
  'turn-right': 'Turn right',
}

function findNearestLandmark(point: Vector2, spaces: Space[]): string | null {
  let nearest: Space | null = null
  let nearestDist = LANDMARK_RADIUS

  for (const space of spaces) {
    const d = dist(point, space.position)
    if (d < nearestDist) {
      nearestDist = d
      nearest = space
    }
  }

  return nearest ? nearest.name : null
}

/** Midpoint of a segment */
function midpoint(a: Vector2, b: Vector2): Vector2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

/**
 * Describe the space at a given point using the SDK's spatial query.
 * Returns a human-readable description like "the corridor" or "reception".
 */
function describeSpaceAt(
  point: Vector2,
  floorPlan: FloorPlanEngine,
): string | null {
  const spaces = floorPlan.getSpaces({
    select: { id: true, name: true, category: true, subCategory: true },
    where: { at: point },
  })

  if (spaces.length === 0) return null

  // Prefer the most specific (named) space, otherwise use category
  const space = spaces[0]
  const key = `${space.category}/${space.subCategory}`

  // If the space has a meaningful name, use it
  if (space.name && space.name.trim().length > 0) {
    const desc = SPACE_DESCRIPTIONS[key]
    if (desc) return desc
    return space.name
  }

  return SPACE_DESCRIPTIONS[key] ?? null
}

/**
 * For a walk segment between two simplified path points, determine what
 * space the user walks through. Samples the midpoint of the segment.
 */
function getSegmentContext(
  from: Vector2,
  to: Vector2,
  floorPlan: FloorPlanEngine,
): string | null {
  const mid = midpoint(from, to)
  return describeSpaceAt(mid, floorPlan)
}

type RawStep = DirectionStep

/**
 * Generate turn-by-turn directions from a polyline path.
 *
 * 1. Simplify the path to remove near-collinear graph noise
 * 2. Walk segments, accumulating straight-line distance
 * 3. At significant turns, emit a walk step then a turn instruction
 * 4. Annotate turns with the nearest named space when available
 * 5. Annotate walks with the space being traversed (corridor, reception, etc.)
 * 6. Post-process: merge rapid-fire turns near the destination
 */
export function generateDirections(
  rawPath: Vector2[],
  spaces: Space[],
  destinationName: string,
  floorPlan: FloorPlanEngine,
): DirectionStep[] {
  const path = simplifyPath(rawPath)
  if (path.length < 2) return []

  const raw: RawStep[] = []
  let accDist = dist(path[0], path[1])
  let lastWalkStart = path[0]
  let lastWalkSegEnd = path[1]

  for (let i = 1; i < path.length - 1; i++) {
    const ta = turnAngle(path[i - 1], path[i], path[i + 1])
    const nextDist = dist(path[i], path[i + 1])

    // Absorb small angles as straight
    if (Math.abs(ta) < STRAIGHT_THRESHOLD) {
      accDist += nextDist
      lastWalkSegEnd = path[i + 1]
      continue
    }

    // Emit accumulated walk with space context
    if (accDist >= MIN_WALK_DISTANCE) {
      const context = getSegmentContext(
        lastWalkStart,
        lastWalkSegEnd,
        floorPlan,
      )
      const through = context ? ` through ${context}` : ''
      const rounded = Math.round(accDist)

      raw.push({
        kind: 'walk',
        instruction:
          raw.length === 0
            ? `Walk ${rounded}m${through}`
            : `Continue for ${rounded}m${through}`,
        distance: accDist,
        landmark: null,
      })
    }

    // Emit the turn
    const kind = classifyTurn(ta)
    const landmark = findNearestLandmark(path[i], spaces)
    const suffix = landmark ? ` at ${landmark}` : ''

    raw.push({
      kind,
      instruction: `${TURN_VERBS[kind]}${suffix}`,
      distance: 0,
      landmark,
    })

    accDist = nextDist
    lastWalkStart = path[i]
    lastWalkSegEnd = path[i + 1]
  }

  // Final walk to destination
  if (accDist >= MIN_WALK_DISTANCE) {
    const context = getSegmentContext(lastWalkStart, lastWalkSegEnd, floorPlan)
    const through = context ? ` through ${context}` : ''
    const rounded = Math.round(accDist)

    raw.push({
      kind: 'walk',
      instruction:
        raw.length === 0
          ? `Walk ${rounded}m${through}`
          : `Continue for ${rounded}m${through}`,
      distance: accDist,
      landmark: null,
    })
  }

  // Post-process: collapse consecutive turns (no walk between them) into
  // a single turn, keeping only the first since rapid turns mean the path
  // is navigating around a corner into a space
  const merged: DirectionStep[] = []
  for (const step of raw) {
    const previous = merged[merged.length - 1]
    if (step.kind !== 'walk' && previous && previous.kind !== 'walk') continue
    merged.push(step)
  }

  // Arrival
  merged.push({
    kind: 'arrive',
    instruction: `Arrive at ${destinationName}`,
    distance: 0,
    landmark: destinationName,
  })

  return merged
}

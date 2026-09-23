/**
 * Wayfinding: a walking route from the kiosk to a destination, drawn on the
 * plan and described turn by turn.
 *
 * The route itself comes from `floorPlan.getPath({ start, end })`; the rest
 * of this file is what a kiosk adds on top: draggable pins at either end, a
 * smoothed path, a zoom that frames it, and directions a visitor can follow.
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type {
  BoundingBox2d,
  FloorPlanEngine,
  Vector2,
} from '@archilogic/floor-plan-sdk'
import { spaceAt, zoomToFit, zoomToFloor } from '#/floor-plan/engine'
import { DraggableMarker } from '#/floor-plan/markers'
import { KIOSK_COLORS, labelFor } from '#/kiosk-state'
import type { NavigableItem, PlacedPoint, Space } from '#/kiosk-state'

const PATH_LAYER_ID = 'wayfinding-path'
/** Metres of clearance left around a route when zooming to it. */
const ZOOM_PADDING_M = 8
/** How far a rounded corner may cut in, so the path stays off the walls. */
const CORNER_RADIUS_M = 0.6
const NO_PATH_MESSAGE = 'No walking path to this destination.'

export interface PathStyle {
  /** Points sampled per rounded corner; 0 leaves corners sharp. */
  smoothing: number
  thickness: number
  dashed: boolean
}

export interface Route {
  distance: number | null
  directions: DirectionStep[]
  /** Set when a path could not be produced, so the UI can say why. */
  pathError: string | null
  /** The space a dragged destination pin actually landed in, if any. */
  destinationSpace: Space | null
}

const NO_ROUTE: Route = {
  distance: null,
  directions: [],
  pathError: null,
  destinationSpace: null,
}

/**
 * Everything the kiosk draws while routing: a "you are here" pin at the
 * kiosk, a pin on the destination, the path between them, and the zoom.
 * Either pin can be dragged, and the route follows it.
 */
export function useRoute(
  floorPlan: FloorPlanEngine,
  {
    kioskPosition,
    kioskSpaceName,
    target,
    originOverride,
    destinationOverride,
    spaces,
    style,
    zoomOnNavigate,
    onOriginMoved,
    onDestinationMoved,
  }: {
    kioskPosition: Vector2 | null
    kioskSpaceName: string
    target: NavigableItem | null
    /** Where the visitor dragged either pin, if they did. */
    originOverride: PlacedPoint | null
    destinationOverride: PlacedPoint | null
    /** Named spaces, for landmarks in the directions. */
    spaces: Space[]
    style: PathStyle
    zoomOnNavigate: boolean
    onOriginMoved: (point: PlacedPoint) => void
    onDestinationMoved: (point: PlacedPoint) => void
  },
): Route {
  const origin = useRef<DraggableMarker | null>(null)
  const destination = useRef<DraggableMarker | null>(null)
  const moveOrigin = useEffectEvent(onOriginMoved)
  const moveDestination = useEffectEvent(onDestinationMoved)

  useEffect(() => {
    if (!kioskPosition) return
    const marker = new DraggableMarker(floorPlan, {
      position: kioskPosition,
      label: kioskSpaceName,
      prefix: 'You are here: ',
      pulse: true,
      onMove: (point) => moveOrigin(point),
    })
    origin.current = marker
    return () => {
      marker.destroy()
      origin.current = null
    }
  }, [floorPlan, kioskPosition, kioskSpaceName])

  // Put the origin pin where the state says, as after a reset. During a drag
  // the pin has already moved itself, and moving it again would fight the
  // gesture.
  useEffect(() => {
    if (!kioskPosition || origin.current?.isDragging) return
    origin.current?.moveTo(
      originOverride?.position ?? kioskPosition,
      originOverride?.name ?? kioskSpaceName,
    )
  }, [originOverride, kioskPosition, kioskSpaceName])

  useEffect(() => {
    if (!target) return
    const marker = new DraggableMarker(floorPlan, {
      position: target.data.position,
      label: labelFor(target),
      dotColor: KIOSK_COLORS.path,
      onMove: (point) => moveDestination(point),
    })
    destination.current = marker
    return () => {
      marker.destroy()
      destination.current = null
    }
  }, [floorPlan, target])

  const [route, setRoute] = useState<
    (Route & { target: NavigableItem }) | null
  >(null)
  const hadRoute = useRef(false)

  useEffect(() => {
    if (!target || !kioskPosition) {
      // Back out to the whole floor, if there was a route to back out of.
      if (zoomOnNavigate && hadRoute.current) zoomToFloor(floorPlan)
      hadRoute.current = false
      return
    }
    hadRoute.current = true

    const start = originOverride?.position ?? kioskPosition
    const end = destinationOverride?.position ?? target.data.position
    // A dragged destination lands in whatever space is under it, not the one
    // originally chosen.
    const destinationSpace = destinationOverride
      ? spaceAt(floorPlan, destinationOverride.position)
      : null
    const show = (result: Omit<Route, 'destinationSpace'>) =>
      setRoute({ ...result, destinationSpace, target })

    let stale = false
    let layer: ReturnType<FloorPlanEngine['addLayer']> | null = null

    floorPlan.getPath({ start, end }).then(
      (result) => {
        // The input moved on while the path was computing.
        if (stale) return
        // An empty path means the two points are not connected; null means
        // no layout is loaded. Neither leaves anything to draw.
        if (!result || result.path.length === 0) {
          show({ ...NO_ROUTE, pathError: NO_PATH_MESSAGE })
          return
        }

        layer = floorPlan.addLayer({ id: PATH_LAYER_ID })
        layer.addGraphic({
          shapes: [
            {
              type: 'curve:polyline',
              points: roundCorners(
                result.path,
                CORNER_RADIUS_M,
                style.smoothing,
              ),
              style: {
                stroke: KIOSK_COLORS.path,
                strokeWidth: style.thickness,
                dash: style.dashed,
              },
            },
          ],
        })

        // Zooming mid-drag would pull the plan out from under the pointer.
        const dragging =
          origin.current?.isDragging || destination.current?.isDragging
        if (zoomOnNavigate && !dragging) {
          zoomToFit(floorPlan, boundingBox([start, end], ZOOM_PADDING_M))
        }

        show({
          distance: result.distance,
          directions: generateDirections(
            result.path,
            spaces,
            destinationOverride?.name ?? labelFor(target),
            floorPlan,
          ),
          pathError: null,
        })
      },
      (error: unknown) => {
        if (stale) return
        // A query failure rather than a missing route: say something rather
        // than leave an empty panel.
        show({
          ...NO_ROUTE,
          pathError:
            error instanceof Error && error.message
              ? error.message
              : NO_PATH_MESSAGE,
        })
      },
    )

    return () => {
      stale = true
      layer?.destroy()
    }
  }, [
    floorPlan,
    kioskPosition,
    target,
    originOverride,
    destinationOverride,
    spaces,
    zoomOnNavigate,
    style.smoothing,
    style.thickness,
    style.dashed,
  ])

  return route?.target === target ? route : NO_ROUTE
}

// ── Turn-by-turn directions ─────────────────────────────────────────────

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

/** A space within this many metres of a turn names it. */
const LANDMARK_RADIUS_M = 4
/** Changes of heading below ~30° are wobbles in the path graph, not turns. */
const STRAIGHT_THRESHOLD = Math.PI / 6
/** Turns below 60° are slight. */
const SLIGHT_THRESHOLD = Math.PI / 3
/** Walks shorter than this are folded into the turns around them. */
const MIN_WALK_M = 2

/** How directions refer to a space by `category/subCategory`. */
const SPACE_DESCRIPTIONS: Record<string, string> = {
  'circulate/corridor': 'the corridor',
  'circulate/foyer': 'the foyer',
  'circulate/staircase': 'the staircase',
  'circulate/elevator': 'the elevator area',
  'socialize/cafe': 'the cafe',
  'socialize/reception': 'reception',
  'work/openWorkspace': 'the open workspace',
}

const TURN_VERBS = {
  'slight-left': 'Slight left',
  'slight-right': 'Slight right',
  'turn-left': 'Turn left',
  'turn-right': 'Turn right',
}

const distanceBetween = (a: Vector2, b: Vector2) =>
  Math.hypot(b[0] - a[0], b[1] - a[1])

/**
 * The change of heading at `b` on the way from `a` to `c`, in (-π, π].
 * Plan coordinates have y growing downwards, so positive turns right.
 */
function turnAngle(a: Vector2, b: Vector2, c: Vector2): number {
  let delta =
    Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  return delta
}

function turnKind(angle: number): keyof typeof TURN_VERBS {
  const slight = Math.abs(angle) < SLIGHT_THRESHOLD
  if (angle > 0) return slight ? 'slight-right' : 'turn-right'
  return slight ? 'slight-left' : 'turn-left'
}

/** Drop the points where the path barely changes direction. */
function simplifyPath(path: Vector2[]): Vector2[] {
  if (path.length <= 2) return path
  const kept = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    const angle = turnAngle(kept[kept.length - 1], path[i], path[i + 1])
    if (Math.abs(angle) >= STRAIGHT_THRESHOLD) kept.push(path[i])
  }
  kept.push(path[path.length - 1])
  return kept
}

function nearestLandmark(point: Vector2, spaces: Space[]): string | null {
  let nearest: string | null = null
  let nearestDistance = LANDMARK_RADIUS_M
  for (const space of spaces) {
    const d = distanceBetween(point, space.position)
    if (d < nearestDistance) {
      nearestDistance = d
      nearest = space.name
    }
  }
  return nearest
}

/** "the corridor", "reception", or the space's own name, if it has one. */
function describeSpaceAt(
  floorPlan: FloorPlanEngine,
  point: Vector2,
): string | null {
  const [space] = floorPlan.getSpaces({
    where: { at: point },
    select: { name: true, category: true, subCategory: true },
  })
  if (!space) return null
  return (
    SPACE_DESCRIPTIONS[`${space.category}/${space.subCategory}`] ??
    (space.name?.trim() || null)
  )
}

/**
 * Turn a walking path into steps: walk, turn, walk, …, arrive.
 *
 * The path is first stripped of the near-straight noise the path graph leaves
 * in it. Each walk names the space it passes through, and each turn the
 * nearest named space. Back-to-back turns, with no walk between them, are the
 * path working its way around a corner, so only the first is kept.
 */
export function generateDirections(
  rawPath: Vector2[],
  spaces: Space[],
  destinationName: string,
  floorPlan: FloorPlanEngine,
): DirectionStep[] {
  const path = simplifyPath(rawPath)
  if (path.length < 2) return []

  const steps: DirectionStep[] = []
  let walked = distanceBetween(path[0], path[1])
  let walkFrom = path[0]
  let walkTo = path[1]

  const pushWalk = () => {
    if (walked < MIN_WALK_M) return
    const through = describeSpaceAt(floorPlan, [
      (walkFrom[0] + walkTo[0]) / 2,
      (walkFrom[1] + walkTo[1]) / 2,
    ])
    const verb = steps.length === 0 ? 'Walk' : 'Continue for'
    steps.push({
      kind: 'walk',
      instruction: `${verb} ${Math.round(walked)}m${through ? ` through ${through}` : ''}`,
      distance: walked,
      landmark: null,
    })
  }

  for (let i = 1; i < path.length - 1; i++) {
    const angle = turnAngle(path[i - 1], path[i], path[i + 1])
    const next = distanceBetween(path[i], path[i + 1])
    if (Math.abs(angle) < STRAIGHT_THRESHOLD) {
      walked += next
      walkTo = path[i + 1]
      continue
    }

    pushWalk()
    const previous = steps.at(-1)
    if (!previous || previous.kind === 'walk') {
      const kind = turnKind(angle)
      const landmark = nearestLandmark(path[i], spaces)
      steps.push({
        kind,
        instruction: `${TURN_VERBS[kind]}${landmark ? ` at ${landmark}` : ''}`,
        distance: 0,
        landmark,
      })
    }

    walked = next
    walkFrom = path[i]
    walkTo = path[i + 1]
  }

  pushWalk()
  steps.push({
    kind: 'arrive',
    instruction: `Arrive at ${destinationName}`,
    distance: 0,
    landmark: destinationName,
  })
  return steps
}

// ── Path geometry ───────────────────────────────────────────────────────

/**
 * Round the corners of a polyline: each interior vertex becomes a quadratic
 * bezier arc sampled as `steps` extra points. The arc stays within `radius`
 * metres of the corner, and within 40% of either segment, so the path does
 * not shortcut through walls.
 */
export function roundCorners(
  points: Vector2[],
  radius: number,
  steps: number,
): Vector2[] {
  if (points.length <= 2 || steps <= 0) return points

  const result: Vector2[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const [prev, curr, next] = [points[i - 1], points[i], points[i + 1]]
    const lenPrev = distanceBetween(curr, prev)
    const lenNext = distanceBetween(curr, next)
    if (lenPrev < 0.01 || lenNext < 0.01) {
      result.push(curr)
      continue
    }

    const r = Math.min(radius, lenPrev * 0.4, lenNext * 0.4)
    const before: Vector2 = [
      curr[0] + ((prev[0] - curr[0]) / lenPrev) * r,
      curr[1] + ((prev[1] - curr[1]) / lenPrev) * r,
    ]
    const after: Vector2 = [
      curr[0] + ((next[0] - curr[0]) / lenNext) * r,
      curr[1] + ((next[1] - curr[1]) / lenNext) * r,
    ]
    // before → curr (control point) → after
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

/** The box around `points`, grown by `padding` on every side. */
export function boundingBox(points: Vector2[], padding: number): BoundingBox2d {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return {
    min: [Math.min(...xs) - padding, Math.min(...ys) - padding],
    max: [Math.max(...xs) + padding, Math.max(...ys) + padding],
  }
}

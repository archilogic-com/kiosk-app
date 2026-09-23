import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { PlacedPoint } from '#/core/domain/state'
import type { NavigableItem, Space } from '#/core/domain/types'
import { KIOSK_COLORS } from '#/core/domain/types'
import type { NodeStyles } from '#/core/highlight/compute'
import { toNodeStyles } from '#/core/highlight/compute'
import type { DirectionStep } from '#/core/wayfinding/directions'
import { generateDirections } from '#/core/wayfinding/directions'
import { pathBoundingBox, roundCorners } from '#/core/wayfinding/path'
import { DraggableMarker } from '#/core/sdk/draggable-marker'
import type { ViewportInsets } from '#/core/sdk/zoom'
import { zoomToFit, zoomToFloor } from '#/core/sdk/zoom'

const PATH_LAYER_ID = 'wayfinding-path'
/** Metres of clearance left around a route when zooming to it. */
const ZOOM_PADDING_M = 8
const CORNER_RADIUS_M = 0.6
const NO_PATH_MESSAGE = 'No walking path to this destination.'

export interface PathStyle {
  smoothing: number
  thickness: number
  dashed: boolean
}

/** Everything the controller needs to know, handed over whole on each change. */
export interface WayfindingInput {
  /** Where the kiosk stands: the default origin. */
  kioskPosition: Vector2 | null
  kioskSpaceName: string | null
  /** The chosen destination, if any. */
  target: NavigableItem | null
  /** Where the visitor dragged either end, if they did. */
  originOverride: PlacedPoint | null
  destinationOverride: PlacedPoint | null
  /** Named spaces, for landmarks in the directions. */
  spaces: Space[]
  style: PathStyle
  zoomOnNavigate: boolean
  insets?: ViewportInsets
}

export interface RouteState {
  distance: number | null
  directions: DirectionStep[]
  /** Set when a path could not be produced, so the UI can say why. */
  pathError: string | null
  /** Styles for the destination and its contents, for the theme to apply. */
  nodeStyles: NodeStyles
  /** The space a dragged destination actually landed in, if any. */
  destinationSpaceId: string | null
}

export const NO_ROUTE: RouteState = {
  distance: null,
  directions: [],
  pathError: null,
  nodeStyles: {},
  destinationSpaceId: null,
}

export interface WayfindingCallbacks {
  onOriginMoved?: (point: PlacedPoint) => void
  onDestinationMoved?: (point: PlacedPoint) => void
}

export function labelFor(item: NavigableItem): string {
  return item.type === 'workstation'
    ? (item.data.occupantName ?? item.data.id)
    : item.data.name
}

/**
 * Owns everything the kiosk draws while routing: the two draggable markers,
 * the path layer, and the zoom.
 *
 * A UI hands it the whole input on every change and subscribes to the
 * resulting route; the controller works out what actually changed. It never
 * writes the theme itself: the destination highlight comes back as data, so
 * the theme keeps its single writer.
 */
export class WayfindingController {
  private origin: DraggableMarker | null = null
  private destination: DraggableMarker | null = null
  private pathLayer: ReturnType<FloorPlanEngine['addLayer']> | null = null
  private dragging = false
  private previous: WayfindingInput | null = null
  /** Bumped whenever a route becomes moot, so a late `getPath` is ignored. */
  private generation = 0
  private route: RouteState = NO_ROUTE
  private readonly listeners = new Set<(route: RouteState) => void>()

  constructor(
    private readonly floorPlan: FloorPlanEngine,
    private readonly callbacks: WayfindingCallbacks = {},
  ) {}

  /** True while either marker is being dragged; zooming then would fight it. */
  get isDragging(): boolean {
    return this.dragging
  }

  /** Receive the current route now, and every route after it. */
  subscribe(listener: (route: RouteState) => void): () => void {
    this.listeners.add(listener)
    listener(this.route)
    return () => this.listeners.delete(listener)
  }

  update(input: WayfindingInput): void {
    const prev = this.previous
    this.previous = input

    if (input.kioskPosition) {
      const position = input.originOverride?.position ?? input.kioskPosition
      const name =
        input.originOverride?.name ?? input.kioskSpaceName ?? 'Entrance'
      if (
        input.kioskPosition !== prev?.kioskPosition ||
        input.kioskSpaceName !== prev?.kioskSpaceName
      ) {
        // The kiosk itself moved: a new floor, or the first one. Rebuild.
        this.showOrigin(position, name)
      } else if (
        input.originOverride !== prev?.originOverride &&
        !this.origin?.isDragging
      ) {
        // The override changed from outside a drag (a reset, typically), so
        // put the marker where the state says. During a drag the marker
        // already moved itself, and repositioning it would fight the gesture.
        this.origin?.moveTo(position, name)
      }
    }

    if (input.target !== prev?.target) {
      if (input.target) {
        this.showDestination(input.target.data.position, labelFor(input.target))
      } else {
        this.hideDestination()
      }
    }

    if (!prev || routeInputsChanged(prev, input)) {
      void this.reroute(input, prev)
    }
  }

  /** The space actually under a point, for when a marker has been dragged. */
  spaceIdAt(position: Vector2): string | null {
    const [space] = this.floorPlan.getSpaces({
      where: { at: position },
      select: { id: true },
    })
    return space?.id ?? null
  }

  clearPath(): void {
    this.generation++
    this.pathLayer?.destroy()
    this.pathLayer = null
  }

  destroy(): void {
    this.clearPath()
    this.origin?.destroy()
    this.destination?.destroy()
    this.origin = null
    this.destination = null
    this.listeners.clear()
  }

  private async reroute(
    input: WayfindingInput,
    prev: WayfindingInput | null,
  ): Promise<void> {
    this.clearPath()
    const generation = this.generation

    if (!input.target || !input.kioskPosition) {
      this.emit(NO_ROUTE)
      // Back out to the whole floor only if there was a route to back out of.
      if (input.zoomOnNavigate && prev?.target) {
        zoomToFloor(this.floorPlan, input.insets)
      }
      return
    }

    const origin = input.originOverride?.position ?? input.kioskPosition
    const destination =
      input.destinationOverride?.position ?? input.target.data.position
    // A dragged destination lands in whatever space is under it, not the one
    // originally chosen.
    const draggedId = input.destinationOverride
      ? this.spaceIdAt(input.destinationOverride.position)
      : null
    const destinationId = draggedId ?? input.target.data.id
    const destinationName =
      input.destinationOverride?.name ?? labelFor(input.target)

    try {
      const result = await this.floorPlan.getPath({
        start: origin,
        end: destination,
      })
      // The input moved on while the path was computing: someone else's
      // route, or no route at all, is what should be on screen now.
      if (generation !== this.generation) return

      // An empty path means the two points are not connected; null means no
      // layout is loaded. Neither is an error, but both leave nothing to draw.
      if (!result || result.path.length === 0) {
        this.emit({ ...NO_ROUTE, pathError: NO_PATH_MESSAGE })
        return
      }

      const { path: points, distance } = result
      this.drawPath(points, input.style)
      if (input.zoomOnNavigate && !this.dragging) {
        zoomToFit(
          this.floorPlan,
          pathBoundingBox([origin, destination], ZOOM_PADDING_M),
          input.insets,
        )
      }
      this.emit({
        distance,
        directions: generateDirections(
          points,
          input.spaces,
          destinationName,
          this.floorPlan,
        ),
        pathError: null,
        nodeStyles: toNodeStyles(this.floorPlan, [
          {
            id: destinationId,
            fill: KIOSK_COLORS.path,
            fillOpacity: KIOSK_COLORS.pathHighlightOpacity,
          },
        ]),
        destinationSpaceId: draggedId,
      })
    } catch (error: unknown) {
      if (generation !== this.generation) return
      // A query failure, as opposed to a missing route. Say something rather
      // than leaving an empty panel.
      this.emit({
        ...NO_ROUTE,
        pathError:
          error instanceof Error && error.message
            ? error.message
            : NO_PATH_MESSAGE,
      })
    }
  }

  private drawPath(points: Vector2[], style: PathStyle): void {
    const layer = this.floorPlan.addLayer({ id: PATH_LAYER_ID })
    this.pathLayer = layer
    layer.addGraphic({
      shapes: [
        {
          type: 'curve:polyline',
          points: roundCorners(points, CORNER_RADIUS_M, style.smoothing),
          style: {
            stroke: KIOSK_COLORS.path,
            strokeWidth: style.thickness,
            dash: style.dashed,
          },
        },
      ],
    })
  }

  private emit(route: RouteState): void {
    this.route = route
    for (const listener of this.listeners) listener(route)
  }

  private showOrigin(position: Vector2, name: string): void {
    this.origin?.destroy()
    this.origin = new DraggableMarker(this.floorPlan, {
      position,
      label: name,
      prefix: 'You are here: ',
      pulse: true,
      onMove: (point) => this.callbacks.onOriginMoved?.(point),
      onDragStateChange: this.setDragging,
    })
  }

  private showDestination(position: Vector2, name: string): void {
    this.destination?.destroy()
    this.destination = new DraggableMarker(this.floorPlan, {
      position,
      label: name,
      dotColor: KIOSK_COLORS.markerOuter,
      onMove: (point) => this.callbacks.onDestinationMoved?.(point),
      onDragStateChange: this.setDragging,
    })
  }

  private hideDestination(): void {
    this.destination?.destroy()
    this.destination = null
  }

  private setDragging = (dragging: boolean): void => {
    this.dragging = dragging
  }
}

/** Whether anything that feeds the route computation differs. */
function routeInputsChanged(a: WayfindingInput, b: WayfindingInput): boolean {
  return (
    a.kioskPosition !== b.kioskPosition ||
    a.target !== b.target ||
    a.originOverride !== b.originOverride ||
    a.destinationOverride !== b.destinationOverride ||
    a.spaces !== b.spaces ||
    a.zoomOnNavigate !== b.zoomOnNavigate ||
    a.style.smoothing !== b.style.smoothing ||
    a.style.thickness !== b.style.thickness ||
    a.style.dashed !== b.style.dashed
  )
}

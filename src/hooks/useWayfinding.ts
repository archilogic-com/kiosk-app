import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { PlacedPoint } from '#/core/domain/state'
import type {
  RouteState,
  WayfindingCallbacks,
  WayfindingInput,
} from '#/core/sdk/wayfinding-controller'
import {
  NO_ROUTE,
  WayfindingController,
} from '#/core/sdk/wayfinding-controller'

/**
 * Binds the wayfinding controller to React: forwards the input whenever any
 * part of it changes, and mirrors the route it reports into state.
 */
export function useWayfinding(
  floorPlan: FloorPlanEngine | null,
  input: WayfindingInput,
  callbacks: WayfindingCallbacks = {},
): RouteState {
  const [route, setRoute] = useState<RouteState>(NO_ROUTE)
  const controllerRef = useRef<WayfindingController | null>(null)

  // Marker drags install long-lived pointer handlers, so the controller gets
  // effect events that always reach the current callbacks rather than being
  // rebuilt whenever one changes.
  const onOriginMoved = useEffectEvent((point: PlacedPoint) =>
    callbacks.onOriginMoved?.(point),
  )
  const onDestinationMoved = useEffectEvent((point: PlacedPoint) =>
    callbacks.onDestinationMoved?.(point),
  )

  useEffect(() => {
    if (!floorPlan) return
    const controller = new WayfindingController(floorPlan, {
      onOriginMoved,
      onDestinationMoved,
    })
    controllerRef.current = controller
    const unsubscribe = controller.subscribe(setRoute)
    return () => {
      unsubscribe()
      controller.destroy()
      controllerRef.current = null
    }
  }, [floorPlan])

  const {
    kioskPosition,
    kioskSpaceName,
    target,
    originOverride,
    destinationOverride,
    spaces,
    style,
    zoomOnNavigate,
    insets,
  } = input
  useEffect(() => {
    controllerRef.current?.update({
      kioskPosition,
      kioskSpaceName,
      target,
      originOverride,
      destinationOverride,
      spaces,
      style,
      zoomOnNavigate,
      insets,
    })
    // The controller diffs `style` by field; `insets` changing alone is not
    // worth a reroute, it is read on the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    floorPlan,
    kioskPosition,
    kioskSpaceName,
    target,
    originOverride,
    destinationOverride,
    spaces,
    style.smoothing,
    style.thickness,
    style.dashed,
    zoomOnNavigate,
  ])

  return route
}

import type { BoundingBox2d, FloorPlanEngine } from '@archilogic/floor-plan-sdk'

export interface ViewportInsets {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

/** Extra scale applied around whatever is framed, as the engine expects it. */
const FRAME_PADDING = 1.5

/**
 * Frame a box within the part of the viewport the floating panels leave
 * visible, rather than the whole screen, so content never centres itself
 * underneath a panel.
 */
export function zoomToFit(
  floorPlan: FloorPlanEngine,
  box: BoundingBox2d,
  insets: ViewportInsets = {},
  animate = true,
): void {
  const vw = window.innerWidth
  const vh = window.innerHeight
  floorPlan.zoomExtents(
    undefined,
    animate,
    floorPlan.getZoomExtentsBoundingBox(
      box,
      insets.left ?? 0,
      insets.top ?? 0,
      vw - (insets.right ?? 0),
      vh - (insets.bottom ?? 0),
      vw,
      vh,
    ),
  )
}

/** Frame the whole floor. */
export function zoomToFloor(
  floorPlan: FloorPlanEngine,
  insets?: ViewportInsets,
  animate = true,
): void {
  zoomToFit(floorPlan, floorPlan.getBoundingBox(FRAME_PADDING), insets, animate)
}

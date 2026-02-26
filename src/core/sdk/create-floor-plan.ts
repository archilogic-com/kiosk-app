import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { FLOOR_PLAN_CONFIG } from '#/core/config'
import { buildFloorPlanTheme } from '#/core/theme/build-theme'

/**
 * Load whichever id is configured. `loadFloorById` renders a floor's default
 * layout and is the common case; `loadLayoutById` targets one specific layout.
 */
export function loadConfiguredFloor(
  floorPlan: FloorPlanEngine,
): Promise<boolean | Error> {
  const { floorId, layoutId, publishableAccessToken } = FLOOR_PLAN_CONFIG
  return floorId
    ? floorPlan.loadFloorById(floorId, { publishableAccessToken })
    : floorPlan.loadLayoutById(layoutId, { publishableAccessToken })
}

export interface FloorPlanHandle {
  floorPlan: FloorPlanEngine
  destroy: () => void
}

/**
 * Load the configured floor into `container`.
 *
 * The SDK and its stylesheet are imported dynamically so the WebGL bundle
 * stays out of the initial payload: a kiosk shows its shell immediately and
 * fills in the plan a moment later.
 */
export async function createFloorPlan(
  container: Element,
): Promise<FloorPlanHandle> {
  const [{ FloorPlanEngine: Engine }] = await Promise.all([
    import('@archilogic/floor-plan-sdk'),
    import('@archilogic/floor-plan-sdk/dist/style.css'),
  ])

  const floorPlan = new Engine({
    container,
    options: {
      theme: buildFloorPlanTheme({
        showCategories: false,
        showLabels: true,
        showAssets: true,
      }),
    },
  })

  const result = await loadConfiguredFloor(floorPlan)

  if (result instanceof Error) {
    floorPlan.destroy()
    throw result
  }

  return { floorPlan, destroy: () => floorPlan.destroy() }
}

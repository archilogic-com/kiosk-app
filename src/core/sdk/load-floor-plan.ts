import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { FLOOR_PLAN_CONFIG } from '#/core/config'
import { buildFloorPlanTheme } from '#/core/theme/build-theme'
import type { ViewportInsets } from '#/core/sdk/zoom'
import { zoomToFloor } from '#/core/sdk/zoom'

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

/** How far a load has got, for a UI that shows progress rather than a spinner. */
export type LoadStage = 'engine' | 'floor' | 'ready' | 'error'

export interface FloorPlanLoader {
  /** Resolves once the floor is drawn and framed; rejects if it cannot load. */
  ready: Promise<FloorPlanEngine>
  getStage(): LoadStage
  subscribe(listener: () => void): () => void
}

/**
 * Load the configured floor into `container`, reporting progress as it goes.
 *
 * Start this before the UI mounts: the container is plain HTML, so nothing
 * waits on a framework. The SDK and its stylesheet are imported dynamically
 * so the WebGL bundle stays out of the initial payload: a kiosk shows its
 * shell immediately and fills in the plan a moment later.
 */
export function loadFloorPlan(
  container: Element,
  insets?: ViewportInsets,
): FloorPlanLoader {
  let stage: LoadStage = 'engine'
  const listeners = new Set<() => void>()
  const setStage = (next: LoadStage) => {
    stage = next
    listeners.forEach((listener) => listener())
  }

  const ready = (async () => {
    const [{ FloorPlanEngine: Engine }] = await Promise.all([
      import('@archilogic/floor-plan-sdk'),
      import('@archilogic/floor-plan-sdk/dist/style.css'),
    ])
    setStage('floor')

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

    zoomToFloor(floorPlan, insets, false)
    setStage('ready')
    return floorPlan
  })()
  ready.catch(() => setStage('error'))

  return {
    ready,
    getStage: () => stage,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

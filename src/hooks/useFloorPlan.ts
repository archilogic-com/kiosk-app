import { use, useSyncExternalStore } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { FloorPlanLoader, LoadStage } from '#/core/sdk/load-floor-plan'

/**
 * The loaded engine. Suspends until the floor is drawn and throws to the
 * nearest error boundary if it cannot be, so everything below gets a plan
 * that exists.
 */
export function useFloorPlan(loader: FloorPlanLoader): FloorPlanEngine {
  return use(loader.ready)
}

export function useLoadStage(loader: FloorPlanLoader): LoadStage {
  return useSyncExternalStore(loader.subscribe, loader.getStage)
}

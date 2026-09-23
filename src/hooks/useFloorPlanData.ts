import { useMemo } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { FloorData } from '#/core/sdk/queries'
import { EMPTY_FLOOR_DATA, extractFloorData } from '#/core/sdk/queries'

export function useFloorPlanData(floorPlan: FloorPlanEngine | null): FloorData {
  return useMemo(
    () => (floorPlan ? extractFloorData(floorPlan) : EMPTY_FLOOR_DATA),
    [floorPlan],
  )
}

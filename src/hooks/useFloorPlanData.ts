import { useMemo } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { FloorData } from '#/core/sdk/queries'
import { extractFloorData } from '#/core/sdk/queries'

export function useFloorPlanData(floorPlan: FloorPlanEngine): FloorData {
  return useMemo(() => extractFloorData(floorPlan), [floorPlan])
}

import { useEffect, useState } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { FloorData } from '#/core/sdk/queries'
import { EMPTY_FLOOR_DATA, extractFloorData } from '#/core/sdk/queries'

export function useFloorPlanData(floorPlan: FloorPlanEngine | null): FloorData {
  const [data, setData] = useState<FloorData>(EMPTY_FLOOR_DATA)

  useEffect(() => {
    // Reading a freshly loaded engine is external-system synchronisation, which
    // is what an effect is for. The SDK exposes no subscription to read from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (floorPlan) setData(extractFloorData(floorPlan))
  }, [floorPlan])

  return data
}

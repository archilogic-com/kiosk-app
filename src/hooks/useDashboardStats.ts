import { useMemo } from 'react'
import type { Space, Workstation } from '#/core/domain/types'
import { computeFloorStats } from '#/core/domain/stats'

export function useDashboardStats(
  workstations: Workstation[],
  spaces: Space[],
  bookedSpaceIds?: Set<string>,
) {
  return useMemo(
    () => computeFloorStats(workstations, spaces, bookedSpaceIds),
    [workstations, spaces, bookedSpaceIds],
  )
}

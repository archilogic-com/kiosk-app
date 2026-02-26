import { useEffect } from 'react'
import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { SearchableItem, Space, Workstation } from '#/core/domain/types'
import { resolveClick } from '#/core/sdk/resolve-click'

export function useFloorPlanClick(
  floorPlan: FloorPlanEngine | null,
  workstations: Workstation[],
  spaces: Space[],
  onSelect: (item: SearchableItem | null) => void,
) {
  useEffect(() => {
    if (!floorPlan) return

    const handleClick = (event: { nodeId?: string; position: Vector2 }) => {
      const item = resolveClick(floorPlan, event, workstations, spaces)
      if (item) onSelect(item)
    }

    floorPlan.on('click', handleClick)
    return () => {
      floorPlan.off('click', handleClick)
    }
  }, [floorPlan, workstations, spaces, onSelect])
}

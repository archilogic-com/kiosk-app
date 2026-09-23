import { useEffect, useEffectEvent } from 'react'
import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { SearchableItem, Space, Workstation } from '#/core/domain/types'
import { resolveClick } from '#/core/sdk/resolve-click'

export function useFloorPlanClick(
  floorPlan: FloorPlanEngine,
  workstations: Workstation[],
  spaces: Space[],
  onSelect: (item: SearchableItem | null) => void,
) {
  const select = useEffectEvent(
    (
      engine: FloorPlanEngine,
      event: { nodeId?: string; position: Vector2 },
    ) => {
      const item = resolveClick(engine, event, workstations, spaces)
      if (item) onSelect(item)
    },
  )

  useEffect(() => {
    const handleClick = (event: { nodeId?: string; position: Vector2 }) =>
      select(floorPlan, event)
    floorPlan.on('click', handleClick)
    return () => {
      floorPlan.off('click', handleClick)
    }
  }, [floorPlan])
}

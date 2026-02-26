import { useMemo } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { HighlightState, NodeStyles } from '#/core/highlight/compute'
import { computeHighlights, toNodeStyles } from '#/core/highlight/compute'

export function useMapHighlights(
  floorPlan: FloorPlanEngine | null,
  state: HighlightState,
): NodeStyles {
  const {
    categoryFilter,
    results,
    selectedItem,
    hoveredItem,
    spaces,
    events,
    bookedSpaceIds,
    contextSpaceIds,
    focusSpaceId,
  } = state

  return useMemo(() => {
    if (!floorPlan) return {}
    return toNodeStyles(
      floorPlan,
      computeHighlights({
        categoryFilter,
        results,
        selectedItem,
        hoveredItem,
        spaces,
        events,
        bookedSpaceIds,
        contextSpaceIds,
        focusSpaceId,
      }),
    )
  }, [
    floorPlan,
    categoryFilter,
    results,
    selectedItem,
    hoveredItem,
    spaces,
    events,
    bookedSpaceIds,
    contextSpaceIds,
    focusSpaceId,
  ])
}

import { useEffect } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { LayerOptions } from '#/core/sdk/apply-theme'
import { applyTheme } from '#/core/sdk/apply-theme'

export function useFloorPlanLayers(
  floorPlan: FloorPlanEngine,
  options: LayerOptions,
) {
  const { showCategories, showLabels, showAssets, byId, themeOverrides } =
    options

  useEffect(() => {
    applyTheme(floorPlan, {
      showCategories,
      showLabels,
      showAssets,
      byId,
      themeOverrides,
    })
  }, [floorPlan, showCategories, showLabels, showAssets, byId, themeOverrides])
}

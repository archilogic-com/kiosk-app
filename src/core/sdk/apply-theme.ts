import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { ThemeOverrides } from '#/core/theme/defaults'
import { buildFloorPlanTheme } from '#/core/theme/build-theme'

export interface LayerOptions {
  showCategories: boolean
  showLabels: boolean
  showAssets: boolean
  byId?: Record<string, Record<string, unknown>>
  themeOverrides?: ThemeOverrides
}

/**
 * The single writer of `floorPlan.set({ theme })`. Always sets a complete
 * theme: a partial update would clobber the byType styles the engine is
 * currently rendering with.
 */
export function applyTheme(
  floorPlan: FloorPlanEngine,
  options: LayerOptions,
): void {
  floorPlan.set({ theme: buildFloorPlanTheme(options) })
}

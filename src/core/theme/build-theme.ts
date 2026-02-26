import type { FloorPlanTheme } from '@archilogic/floor-plan-sdk'
import type {
  CategoryColorOverride,
  RoomStampOverride,
  ThemeOverrides,
} from '#/core/theme/defaults'
import { FPE_DEFAULT_STYLES } from '#/core/theme/defaults'
import { CATEGORY_COLORS, hexToRgbTuple } from '#/core/theme/palette'

type RoomStampField =
  | 'id'
  | 'name'
  | 'usage'
  | 'area'
  | 'customId'
  | ['customAttribute', string]

/** Build a byFilter theme array for FPE to color spaces by category */
function buildCategoryTheme(
  showCategories: boolean,
  categoryOverrides?: Record<string, CategoryColorOverride>,
) {
  if (!showCategories) return []
  return Object.entries(CATEGORY_COLORS).map(([category, defaults]) => {
    const override = categoryOverrides?.[category]
    const fill = override?.fill ? hexToRgbTuple(override.fill) : defaults.fill
    const fillOpacity = override?.fillOpacity ?? defaults.fillOpacity
    return {
      where: { category },
      style: { fill, fillOpacity },
    }
  })
}

/** Build roomStamps config for FPE */
function buildRoomStampsConfig(
  showLabels: boolean,
  roomStampOverride?: RoomStampOverride,
): {
  roomStampDisplay: RoomStampField[]
  text?: [number, number, number]
  textOutline?: boolean
} {
  if (!showLabels) {
    return { roomStampDisplay: [] }
  }
  const textRgb = roomStampOverride?.text
    ? hexToRgbTuple(roomStampOverride.text)
    : ([58, 72, 96] as [number, number, number])
  return {
    roomStampDisplay: ['name'],
    text: textRgb,
    textOutline: roomStampOverride?.textOutline ?? true,
  }
}

/** Build the complete FPE theme object */
export function buildFloorPlanTheme(options: {
  showCategories: boolean
  showLabels: boolean
  showAssets?: boolean
  byId?: Record<string, Record<string, unknown>>
  themeOverrides?: ThemeOverrides
}): FloorPlanTheme {
  const showAssets = options.showAssets ?? true
  const overrides = options.themeOverrides

  // byType: start from FPE defaults, then apply theme editor overrides
  const byType: Record<string, Record<string, unknown>> = Object.fromEntries(
    Object.entries(FPE_DEFAULT_STYLES).map(([k, v]) => [
      k,
      { ...v, ...overrides?.byType?.[k] },
    ]),
  )

  // Hide element types toggled off in the theme editor
  if (overrides?.hiddenTypes) {
    for (const t of overrides.hiddenTypes) {
      byType[t] = {
        fill: '#ffffff',
        fillOpacity: 0,
        strokeWidth: 0,
        strokeOpacity: 0,
      }
    }
  }

  // Asset visibility toggle on top of defaults + overrides
  if (!showAssets) {
    byType['element:asset'] = {
      fill: [255, 255, 255],
      fillOpacity: 0,
      strokeWidth: 0,
    }
  } else {
    byType['element:asset'] = { ...byType['element:asset'], strokeWidth: 0 }
  }

  // Build byFilter array: category colors + optional overlays
  const byFilter: Array<{
    where: Record<string, unknown>
    style: Record<string, unknown>
  }> = buildCategoryTheme(options.showCategories, overrides?.categoryColors)

  // People highlighting is handled by avatar markers (usePeopleMarkers)

  // byId: navigation overrides (destination highlight, etc.).
  //
  // Each entry may carry a __type metadata property (set by
  // buildNavigationByIds) indicating the element's FPE type. We use it
  // to merge the element's full byType style underneath, preventing FPE
  // from resolving unspecified properties against engine defaults (e.g.
  // white fill for assets on a dark theme).
  const byId: Record<string, Record<string, unknown>> = {}
  if (options.byId) {
    for (const [id, rawEntry] of Object.entries(options.byId)) {
      const { __type, ...style } = rawEntry as Record<string, unknown> & {
        __type?: string
      }

      // Merge the element's byType style underneath so every property
      // is specified and FPE never falls through to engine defaults.
      const base = __type && byType[__type] ? { ...byType[__type] } : {}
      byId[id] = { ...base, ...style }
    }
  }

  return {
    background: { color: overrides?.background ?? '#ffffff', showGrid: false },
    // Merging wall contours collapses wall, column and boundaryWall into one
    // style-less shape, so per-type colours and byId dimming stop applying to
    // them. Rendering walls individually is what makes theming work here.
    wallContours: false,
    showAssetTextures: false,
    fontFamily: 'Inter, system-ui, sans-serif',
    byFilter,
    byId,
    roomStamps: buildRoomStampsConfig(options.showLabels, overrides?.roomStamp),
    byType,
  }
}

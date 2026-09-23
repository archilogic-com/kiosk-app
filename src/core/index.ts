/**
 * The public surface of the framework-free half of the kiosk.
 *
 * A UI binds these in seven places, each a few lines in any framework with
 * reactive state and lifecycle hooks (the React versions live in src/hooks):
 *
 *   Engine      loadFloorPlan(container, insets), once, before the UI mounts
 *   Floor data  extractFloorData(floorPlan), once the engine exists
 *   State       reduce(state, action) from initialKioskState, read via selectors
 *   Theme       applyTheme(floorPlan, options) whenever layers or highlights change
 *   Highlights  computeHighlights(state) -> toNodeStyles(floorPlan, ...) into the theme
 *   Wayfinding  new WayfindingController(floorPlan, callbacks); update() and subscribe()
 *   Markers     new PeopleMarkerLayer(floorPlan, callbacks); setWorkstations() and highlight()
 *
 * plus createIdleTimer, parseDeepLink / clearDeepLink and generateThemePreviews,
 * which are plain calls with a cleanup. Everything else in `src/core` is an
 * implementation detail of one of these.
 */

// Domain model and the kiosk's state machine
export type {
  EventCategory,
  NavigableItem,
  ScheduledEvent,
  SearchableItem,
  Space,
  Workstation,
} from '#/core/domain/types'
export {
  CATEGORY_LABELS,
  KIOSK_COLORS,
  SEARCH_CATEGORIES,
} from '#/core/domain/types'
export type {
  KioskAction,
  KioskMode,
  KioskState,
  PlacedPoint,
} from '#/core/domain/state'
export { initialKioskState, reduce } from '#/core/domain/state'
export * from '#/core/domain/selectors'
export { searchItems } from '#/core/domain/search'
export { computeFloorStats } from '#/core/domain/stats'
export type { FloorStats } from '#/core/domain/stats'
export type { DeepLink } from '#/core/domain/deep-link'
export {
  buildDeepLink,
  clearDeepLink,
  parseDeepLink,
} from '#/core/domain/deep-link'
export { formatDateTime } from '#/core/domain/clock'
export type { DisplayTime } from '#/core/domain/clock'
export { formatSpaceType, formatWalkingTime } from '#/core/domain/format'
export { avatarColor, getInitials } from '#/core/domain/avatar'
export { EXIT_ANIMATION_MS, PANEL, VIEWPORT_INSETS } from '#/core/domain/layout'
export { FLOOR_PLAN_CONFIG, WORKSTATION_ATTRIBUTES } from '#/core/config'

// Highlighting: state in, node styles out
export type {
  HighlightState,
  NodeStyles,
  SpaceHighlight,
} from '#/core/highlight/compute'
export { computeHighlights, toNodeStyles } from '#/core/highlight/compute'

// Theme
export type {
  ElementStyleOverride,
  ThemeOverrides,
} from '#/core/theme/defaults'
export { ELEMENT_GROUPS, FPE_DEFAULT_STYLES } from '#/core/theme/defaults'
export { buildFloorPlanTheme } from '#/core/theme/build-theme'
export type { ThemePreset } from '#/core/theme/presets'
export { THEME_PRESETS } from '#/core/theme/presets'
export type { ThemePalette } from '#/core/theme/palette'
export {
  CATEGORY_COLOR_DEFAULTS_HEX,
  CATEGORY_ROLES,
  PALETTE_ROLES,
  extractPalette,
  paletteToByType,
} from '#/core/theme/palette'
export * from '#/core/theme/overrides'

// Wayfinding geometry and text
export type { DirectionStep, StepKind } from '#/core/wayfinding/directions'
export { generateDirections } from '#/core/wayfinding/directions'
export { pathBoundingBox, roundCorners } from '#/core/wayfinding/path'

// Everything that touches the Floor Plan SDK. Framework-free, not pure.
export type { FloorPlanLoader, LoadStage } from '#/core/sdk/load-floor-plan'
export { loadFloorPlan } from '#/core/sdk/load-floor-plan'
export type { FloorData } from '#/core/sdk/queries'
export { extractFloorData } from '#/core/sdk/queries'
export type { LayerOptions } from '#/core/sdk/apply-theme'
export { applyTheme } from '#/core/sdk/apply-theme'
export { resolveClick } from '#/core/sdk/resolve-click'
export type {
  PathStyle,
  RouteState,
  WayfindingCallbacks,
  WayfindingInput,
} from '#/core/sdk/wayfinding-controller'
export {
  NO_ROUTE,
  WayfindingController,
} from '#/core/sdk/wayfinding-controller'
export type { PeopleMarkerCallbacks } from '#/core/sdk/people-marker-layer'
export { PeopleMarkerLayer } from '#/core/sdk/people-marker-layer'
export { createIdleTimer } from '#/core/sdk/idle-timer'
export type { PreviewSettings } from '#/core/sdk/theme-previews'
export { generateThemePreviews } from '#/core/sdk/theme-previews'
export type { ViewportInsets } from '#/core/sdk/zoom'
export { zoomToFit, zoomToFloor } from '#/core/sdk/zoom'

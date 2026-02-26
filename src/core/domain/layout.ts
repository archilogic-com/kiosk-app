/**
 * Layout constants shared between the CSS, the panels and the zoom maths.
 *
 * The plan fills the viewport and the panels float above it, so every zoom
 * has to be told which part of the screen is actually visible, otherwise
 * content centres itself underneath a panel.
 */
export const PANEL = {
  /** Width of the dashboard column, matched by `w-[400px]`. */
  dashboardWidth: 400,
  /** Width of the search column, matched by `w-[360px]`. */
  searchWidth: 360,
  /** Width of the collapsed map-controls button on the right. */
  controlsWidth: 56,
  /** `top-4 left-4 right-4`: the gutter panels sit in. */
  gutter: 16,
} as const

/** Left inset to keep clear: the widest left-hand panel plus its gutters. */
export const VIEWPORT_INSETS = {
  left: Math.max(PANEL.dashboardWidth, PANEL.searchWidth) + PANEL.gutter * 2,
  right: PANEL.controlsWidth + PANEL.gutter,
} as const

/**
 * How long a panel takes to leave. Must cover the slowest exit, which is the
 * last staggered dashboard panel: `.dashboard-exit` runs 250ms after a
 * `stagger-index * 40ms` delay, and there are 5 panels (indices 0-4).
 */
export const DASHBOARD_PANEL_COUNT = 5
export const EXIT_ANIMATION_MS = 250 + (DASHBOARD_PANEL_COUNT - 1) * 40

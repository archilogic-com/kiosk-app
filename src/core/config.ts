/**
 * The floor this kiosk displays.
 *
 * Both values are safe to ship in source: a publishable access token is
 * designed for the browser and is restricted to the domains you allow when
 * you create it. Point these at your own floor by setting the matching
 * environment variables (see `.env.example`).
 *
 * Create a token at
 * https://app.archilogic.com/organization/settings/access-tokens
 */
export const FLOOR_PLAN_CONFIG = {
  publishableAccessToken:
    import.meta.env.VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN ??
    '1e1f7eef-938e-42a6-bb77-b9de57269ef2',
  /**
   * A floor holds one or more layouts, and loading a floor renders its default
   * layout. Set whichever id you have; a floor id is the common case, a
   * layout id addresses one specific layout. The demo model is a layout.
   */
  floorId: import.meta.env.VITE_ARCHILOGIC_FLOOR_ID,
  layoutId:
    import.meta.env.VITE_ARCHILOGIC_LAYOUT_ID ??
    'bbe08f8e-ce75-44ac-8ddf-03b1df37e358',
} as const

/** Average walking speed in m/s, used to turn path length into a duration. */
export const WALKING_SPEED_MS = 1.4

/**
 * Custom attributes this example reads from workstation assets, keyed by the
 * `apiFieldName` you gave them. The defaults match the demo floor; change them
 * to match your own (Dashboard → Settings → Custom attributes). Occupants are
 * optional: without these the kiosk still renders, searches and navigates.
 *
 * https://developers.archilogic.com/space-graph/custom-attributes.html
 */
export const WORKSTATION_ATTRIBUTES = {
  occupantName: 'Occupant-Name',
  employeeId: 'Employee-ID',
} as const

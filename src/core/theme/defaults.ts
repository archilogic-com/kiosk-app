/**
 * Per-element-type default styles, surfaced here so every value the kiosk
 * renders is visible and editable in one place rather than inherited silently.
 */
// prettier-ignore
export const FPE_DEFAULT_STYLES: Record<string, Record<string, unknown>> = {
  // ── Walls ──────────────────────────────────────────────────────
  'element:wall':         { fill: '#939fc0', stroke: '#7785a6', strokeWidth: 'native', fillOpacity: 0.9 },
  'element:boundaryWall': { fill: '#3a4868', stroke: '#3a4868', strokeWidth: 'native', fillOpacity: 0.95 },
  'element:curtainWall':  { fill: '#b8c4d4', stroke: '#5a6a88', strokeWidth: 'native', fillOpacity: 0.3 },

  // ── Structure ──────────────────────────────────────────────────
  'element:column':       { fill: '#4a5878', stroke: '#4a5878', strokeWidth: 'native', fillOpacity: 0.9 },
  'element:beam':         { fill: '#d8dce8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.25 },

  // ── Openings ───────────────────────────────────────────────────
  'element:door':         { fill: '#ffffff', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 1 },
  'element:window':       { fill: '#ffffff', stroke: '#4868a0', strokeWidth: 'native', fillOpacity: 1 },
  'element:opening':      { fill: '#ffffff', stroke: '#e1e5ee', strokeWidth: 'native', fillOpacity: 1 },

  // ── Fixtures ───────────────────────────────────────────────────
  'element:asset':        { fill: '#b0b8cc', stroke: '#5a6888', strokeWidth: 0, fillOpacity: 0.4 },
  'element:casework':     { fill: '#c8ccd8', stroke: '#6878a0', strokeWidth: 0, fillOpacity: 0.3 },
  'element:kitchen':      { fill: '#c8ccd8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.3 },

  // ── Vertical circulation ───────────────────────────────────────
  'element:stairs':       { fill: '#d0d4e0', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.3 },
  'element:stairFlight':  { fill: '#d0d4e0', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.3 },
  'element:slab':         { fill: '#d0d4e0', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.25 },
  'element:ramp':         { fill: '#d8dce8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.25 },
  'element:railing':      { fill: '#c8ccd8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.22 },

  // ── Spaces & dividers ──────────────────────────────────────────
  'layout:space':         { fill: '#ffffff', stroke: '#e1e5ee', strokeWidth: 'native', fillOpacity: 0.55 },
  'element:spaceDivider': { fill: '#8898b4', stroke: '#3a4868', strokeOpacity: 0.8, strokeWidth: 0.5, fillOpacity: 0.35 },

  // ── Other ──────────────────────────────────────────────────────
  'element:generic':      { fill: '#d8dce8', stroke: '#6878a0', strokeWidth: 0, fillOpacity: 0.22 },
}

/** Element type groups for the theme editor UI */
// prettier-ignore
export const ELEMENT_GROUPS = [
  { label: 'Walls', keys: ['element:wall', 'element:boundaryWall', 'element:curtainWall'] },
  { label: 'Structure', keys: ['element:column', 'element:beam'] },
  { label: 'Openings', keys: ['element:door', 'element:window', 'element:opening'] },
  { label: 'Fixtures', keys: ['element:asset', 'element:casework', 'element:kitchen'] },
  { label: 'Circulation', keys: ['element:stairs', 'element:stairFlight', 'element:slab', 'element:ramp', 'element:railing'] },
  { label: 'Spaces', keys: ['layout:space', 'element:spaceDivider'] },
  { label: 'Other', keys: ['element:generic'] },
] as const

export interface ElementStyleOverride {
  fill?: string
  stroke?: string
  fillOpacity?: number
  strokeOpacity?: number
  strokeWidth?: number | 'native'
}

export interface CategoryColorOverride {
  fill?: string
  fillOpacity?: number
}

export interface RoomStampOverride {
  text?: string
  textOutline?: boolean
}

export interface ThemeOverrides {
  background?: string
  byType?: Record<string, ElementStyleOverride>
  hiddenTypes?: string[]
  categoryColors?: Record<string, CategoryColorOverride>
  roomStamp?: RoomStampOverride
}

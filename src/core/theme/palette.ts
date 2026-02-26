import type { ElementStyleOverride } from '#/core/theme/defaults'
import { FPE_DEFAULT_STYLES } from '#/core/theme/defaults'

export function hexToRgbTuple(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function rgbTupleToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

/** Category fill colors for the floor plan engine (RGB + opacity) */
export const CATEGORY_COLORS: Record<
  string,
  { fill: [number, number, number]; fillOpacity: number }
> = {
  meet: { fill: [212, 176, 96], fillOpacity: 0.45 },
  work: { fill: [80, 144, 208], fillOpacity: 0.45 },
  socialize: { fill: [72, 184, 128], fillOpacity: 0.45 },
  care: { fill: [208, 128, 96], fillOpacity: 0.45 },
  support: { fill: [136, 152, 168], fillOpacity: 0.25 },
}

/** CATEGORY_COLORS defaults as hex strings (for color picker UI) */
export const CATEGORY_COLOR_DEFAULTS_HEX: Record<
  string,
  { fill: string; fillOpacity: number }
> = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).map(([cat, { fill, fillOpacity }]) => [
    cat,
    { fill: rgbTupleToHex(fill), fillOpacity },
  ]),
)

export interface ThemePalette {
  wall: string // walls, columns
  wallDark: string // boundary wall stroke, divider stroke
  light: string // doors, windows, beam, casework, ramp, railing, generic
  medium: string // curtain walls, assets
  stroke: string // default stroke for most elements
  circ: string // stairs, slabs
  spaceFill: string // space fill
  spaceStroke: string // space stroke, divider fill
}

// prettier-ignore
export function paletteToByType(p: ThemePalette): Record<string, ElementStyleOverride> {
  return {
    'element:wall':         { fill: p.wall, stroke: p.wall, fillOpacity: 1 },
    'element:boundaryWall': { fill: p.wall, stroke: p.wallDark, fillOpacity: 1 },
    'element:curtainWall':  { fill: p.medium, stroke: p.stroke, fillOpacity: 1 },
    'element:column':       { fill: p.wall, stroke: p.wall, fillOpacity: 1 },
    'element:beam':         { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:door':         { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:window':       { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:opening':      { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:asset':        { fill: p.medium, stroke: p.stroke, fillOpacity: 1 },
    'element:casework':     { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:kitchen':      { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:stairs':       { fill: p.circ, stroke: p.stroke, fillOpacity: 1 },
    'element:stairFlight':  { fill: p.circ, stroke: p.stroke, fillOpacity: 1 },
    'element:slab':         { fill: p.circ, stroke: p.stroke, fillOpacity: 1 },
    'element:ramp':         { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'element:railing':      { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
    'layout:space':         { fill: p.spaceFill, stroke: p.spaceStroke, fillOpacity: 1 },
    'element:spaceDivider': { fill: p.spaceStroke, stroke: p.wallDark, fillOpacity: 1 },
    'element:generic':      { fill: p.light, stroke: p.stroke, fillOpacity: 1 },
  }
}

/** Representative element + property for reading each palette role from byType overrides */
// prettier-ignore
const PALETTE_REPRESENTATIVES: Record<
  keyof ThemePalette,
  { key: string; prop: 'fill' | 'stroke' }
> = {
  wall:       { key: 'element:wall',         prop: 'fill' },
  wallDark:   { key: 'element:boundaryWall',  prop: 'stroke' },
  light:      { key: 'element:door',          prop: 'fill' },
  medium:     { key: 'element:curtainWall',   prop: 'fill' },
  stroke:     { key: 'element:door',          prop: 'stroke' },
  circ:       { key: 'element:stairs',        prop: 'fill' },
  spaceFill:  { key: 'layout:space',          prop: 'fill' },
  spaceStroke:{ key: 'layout:space',          prop: 'stroke' },
}

/** Derive the current ThemePalette from byType overrides (inverse of paletteToByType) */
export function extractPalette(
  byType?: Record<string, ElementStyleOverride>,
): ThemePalette {
  const palette = {} as ThemePalette
  for (const [role, { key, prop }] of Object.entries(PALETTE_REPRESENTATIVES)) {
    palette[role as keyof ThemePalette] =
      (byType?.[key]?.[prop] as string | undefined) ??
      (FPE_DEFAULT_STYLES[key][prop] as string)
  }
  return palette
}

/** UI metadata for the palette color controls */
// prettier-ignore
export const PALETTE_ROLES: Array<{
  key: keyof ThemePalette
  label: string
  description: string
}> = [
  { key: 'wall',       label: 'Walls & Columns',   description: 'Walls, boundary walls, columns' },
  { key: 'wallDark',   label: 'Wall Accent',        description: 'Boundary wall & divider strokes' },
  { key: 'light',      label: 'Openings & Details', description: 'Doors, windows, beams, casework' },
  { key: 'medium',     label: 'Furniture',           description: 'Curtain walls, assets' },
  { key: 'stroke',     label: 'Outlines',            description: 'Shared stroke across elements' },
  { key: 'circ',       label: 'Circulation',          description: 'Stairs, slabs' },
  { key: 'spaceFill',  label: 'Space Fill',            description: 'Space background' },
  { key: 'spaceStroke', label: 'Space Borders',        description: 'Space strokes, divider fills' },
]

/** UI metadata for category (zone) color controls */
// prettier-ignore
export const CATEGORY_ROLES: Array<{ key: string; label: string }> = [
  { key: 'meet',      label: 'Meeting Rooms' },
  { key: 'work',      label: 'Workspaces' },
  { key: 'socialize', label: 'Social Spaces' },
  { key: 'care',      label: 'Amenities' },
  { key: 'support',   label: 'Facilities' },
]

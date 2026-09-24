/**
 * How the plan looks: the default style of every element type, the presets
 * and the edits the theme editor makes to them, and `floorPlanStyle`, which
 * turns all of that into the `theme` and `visibility` the engine takes.
 */
import type {
  FloorPlanEngine,
  FloorPlanTheme,
  FpeConfig,
} from '@archilogic/floor-plan-sdk'
import { loadConfiguredFloor } from '#/floor-plan/engine'

type ShapeStyle = NonNullable<FloorPlanTheme['byId']>[string]

/** An element style as the theme editor edits it: colours as hex, so they round-trip through a colour input. */
export interface ElementStyle {
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity?: number
  strokeWidth: number | 'native'
}

/** Every element type the kiosk styles, grouped as the theme editor lists them. */
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

export type StyledType = (typeof ELEMENT_GROUPS)[number]['keys'][number]

const STYLED_TYPES: StyledType[] = ELEMENT_GROUPS.flatMap((group) => group.keys)

/**
 * The style of every element type, written out so each value the kiosk
 * renders is visible and editable here rather than inherited silently.
 */
// prettier-ignore
export const DEFAULT_STYLES: Record<StyledType, ElementStyle> = {
  'element:wall':         { fill: '#939fc0', stroke: '#7785a6', strokeWidth: 'native', fillOpacity: 0.9 },
  'element:boundaryWall': { fill: '#3a4868', stroke: '#3a4868', strokeWidth: 'native', fillOpacity: 0.95 },
  'element:curtainWall':  { fill: '#b8c4d4', stroke: '#5a6a88', strokeWidth: 'native', fillOpacity: 0.3 },
  'element:column':       { fill: '#4a5878', stroke: '#4a5878', strokeWidth: 'native', fillOpacity: 0.9 },
  'element:beam':         { fill: '#d8dce8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.25 },
  'element:door':         { fill: '#ffffff', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 1 },
  'element:window':       { fill: '#ffffff', stroke: '#4868a0', strokeWidth: 'native', fillOpacity: 1 },
  'element:opening':      { fill: '#ffffff', stroke: '#e1e5ee', strokeWidth: 'native', fillOpacity: 1 },
  'element:asset':        { fill: '#b0b8cc', stroke: '#5a6888', strokeWidth: 0, fillOpacity: 0.4 },
  'element:casework':     { fill: '#c8ccd8', stroke: '#6878a0', strokeWidth: 0, fillOpacity: 0.3 },
  'element:kitchen':      { fill: '#c8ccd8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.3 },
  'element:stairs':       { fill: '#d0d4e0', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.3 },
  'element:stairFlight':  { fill: '#d0d4e0', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.3 },
  'element:slab':         { fill: '#d0d4e0', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.25 },
  'element:ramp':         { fill: '#d8dce8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.25 },
  'element:railing':      { fill: '#c8ccd8', stroke: '#6878a0', strokeWidth: 'native', fillOpacity: 0.22 },
  'layout:space':         { fill: '#ffffff', stroke: '#e1e5ee', strokeWidth: 'native', fillOpacity: 0.55 },
  'element:spaceDivider': { fill: '#8898b4', stroke: '#3a4868', strokeOpacity: 0.8, strokeWidth: 0.5, fillOpacity: 0.35 },
  'element:generic':      { fill: '#d8dce8', stroke: '#6878a0', strokeWidth: 0, fillOpacity: 0.22 },
}

/** Everything else a theme sets, before any preset or edit. */
export const THEME_DEFAULTS = {
  background: '#ffffff',
  labelText: '#3a4860',
  labelOutline: true,
}

export interface CategoryColor {
  fill: string
  fillOpacity: number
}

/** Fills for the Archilogic space categories, shown with the zone colours layer. */
export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  meet: { fill: '#d4b060', fillOpacity: 0.45 },
  work: { fill: '#5090d0', fillOpacity: 0.45 },
  socialize: { fill: '#48b880', fillOpacity: 0.45 },
  care: { fill: '#d08060', fillOpacity: 0.45 },
  support: { fill: '#8898a8', fillOpacity: 0.25 },
}

/** What a preset or the theme editor changes, on top of the defaults. */
export interface ThemeOverrides {
  background?: string
  byType?: Partial<Record<StyledType, Partial<ElementStyle>>>
  hiddenTypes?: StyledType[]
  categoryColors?: Record<string, Partial<CategoryColor>>
  roomStamp?: { text?: string; textOutline?: boolean }
}

// ── Building the engine's theme ─────────────────────────────────────────

/** The layers an operator can switch on and off. */
export interface LayerSettings {
  showCategories: boolean
  showLabels: boolean
  showAssets: boolean
}

/** A style for one node, laid over the style of its type. */
export interface NodeStyle {
  id: string
  type: StyledType
  style: ShapeStyle
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const channel = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

/**
 * The complete look of the plan, as `floorPlan.set()` takes it.
 *
 * Always complete: the engine merges a theme with its own defaults, not with
 * the theme it is currently rendering, so an update carrying only what
 * changed would drop everything else.
 */
export function floorPlanStyle({
  layers,
  overrides = {},
  nodeStyles = [],
}: {
  layers: LayerSettings
  overrides?: ThemeOverrides
  /** Highlights and the route's destination. */
  nodeStyles?: NodeStyle[]
}): Required<Pick<FpeConfig, 'theme' | 'visibility'>> {
  const byType: Partial<Record<StyledType, ShapeStyle>> = {}
  for (const type of STYLED_TYPES) {
    byType[type] = { ...DEFAULT_STYLES[type], ...overrides.byType?.[type] }
  }

  // A node matched by a filter or by id no longer falls back to its type's
  // style, so both start from it and override only the colour.
  const byFilter = layers.showCategories
    ? Object.entries(CATEGORY_COLORS).map(([category, color]) => ({
        where: { type: 'layout:space', category },
        style: {
          ...byType['layout:space'],
          ...color,
          ...overrides.categoryColors?.[category],
        },
      }))
    : []
  const byId = Object.fromEntries(
    nodeStyles.map(({ id, type, style }) => [
      id,
      { ...byType[type], ...style },
    ]),
  )

  const hidden: string[] = [...(overrides.hiddenTypes ?? [])]
  if (!layers.showAssets) hidden.push('element:asset')
  if (!layers.showLabels) hidden.push('roomStamp')

  return {
    theme: {
      background: {
        color: overrides.background ?? THEME_DEFAULTS.background,
        showGrid: false,
      },
      // Merging wall contours collapses wall, column and boundaryWall into one
      // style-less shape, so per-type colours and highlights stop applying.
      wallContours: false,
      showAssetTextures: false,
      fontFamily: 'Inter, system-ui, sans-serif',
      roomStamps: {
        roomStampDisplay: ['name'],
        text: hexToRgb(overrides.roomStamp?.text ?? THEME_DEFAULTS.labelText),
        textOutline:
          overrides.roomStamp?.textOutline ?? THEME_DEFAULTS.labelOutline,
      },
      byType,
      byFilter,
      byId,
    },
    visibility: {
      byType: Object.fromEntries(hidden.map((type) => [type, { show: false }])),
    },
  }
}

// ── Palettes ────────────────────────────────────────────────────────────

/** A handful of colours that together restyle every element type. */
export interface ThemePalette {
  /** Walls and columns. */
  wall: string
  /** Boundary wall and divider strokes. */
  wallDark: string
  /** Doors, windows, beams, casework, ramps, railings. */
  light: string
  /** Curtain walls and furniture. */
  medium: string
  /** The stroke most elements share. */
  stroke: string
  /** Stairs and slabs. */
  circ: string
  spaceFill: string
  /** Space strokes and divider fills. */
  spaceStroke: string
}

// prettier-ignore
export function paletteToByType(
  p: ThemePalette,
): Record<StyledType, Pick<ElementStyle, 'fill' | 'stroke' | 'fillOpacity'>> {
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

/** The palette a set of overrides currently amounts to: the inverse of `paletteToByType`. */
export function extractPalette(byType: ThemeOverrides['byType']): ThemePalette {
  const read = (type: StyledType, prop: 'fill' | 'stroke') =>
    byType?.[type]?.[prop] ?? DEFAULT_STYLES[type][prop]
  return {
    wall: read('element:wall', 'fill'),
    wallDark: read('element:boundaryWall', 'stroke'),
    light: read('element:door', 'fill'),
    medium: read('element:curtainWall', 'fill'),
    stroke: read('element:door', 'stroke'),
    circ: read('element:stairs', 'fill'),
    spaceFill: read('layout:space', 'fill'),
    spaceStroke: read('layout:space', 'stroke'),
  }
}

// ── Edits, as the theme editor makes them ───────────────────────────────

export function setElementStyle(
  overrides: ThemeOverrides,
  type: StyledType,
  change: Partial<ElementStyle>,
): ThemeOverrides {
  return {
    ...overrides,
    byType: {
      ...overrides.byType,
      [type]: { ...overrides.byType?.[type], ...change },
    },
  }
}

export function toggleElementHidden(
  overrides: ThemeOverrides,
  type: StyledType,
): ThemeOverrides {
  const hidden = overrides.hiddenTypes ?? []
  return {
    ...overrides,
    hiddenTypes: hidden.includes(type)
      ? hidden.filter((t) => t !== type)
      : [...hidden, type],
  }
}

/**
 * Apply a palette on top of the existing per-element overrides. The palette
 * sets fill and stroke only, so opacity and stroke-width edits survive.
 */
export function applyPalette(
  overrides: ThemeOverrides,
  palette: ThemePalette,
): ThemeOverrides {
  const colors = paletteToByType(palette)
  const byType = { ...overrides.byType }
  for (const type of STYLED_TYPES) {
    const { fill, stroke } = colors[type]
    byType[type] = { ...byType[type], fill, stroke }
  }
  return { ...overrides, byType }
}

export function setCategoryColor(
  overrides: ThemeOverrides,
  category: string,
  change: Partial<CategoryColor>,
): ThemeOverrides {
  return {
    ...overrides,
    categoryColors: {
      ...overrides.categoryColors,
      [category]: { ...overrides.categoryColors?.[category], ...change },
    },
  }
}

// ── Presets ─────────────────────────────────────────────────────────────

export interface ThemePreset {
  id: string
  name: string
  description: string
  overrides: ThemeOverrides
  /** Swatches shown in the picker until a thumbnail is ready: background, wall, border, accent. */
  swatches: [string, string, string, string]
}

export const THEME_PRESETS: ThemePreset[] = [
  // Baseline: the defaults above, doors hidden for a cleaner plan.
  {
    id: 'default',
    name: 'Default',
    description: 'Clean, translucent layout',
    overrides: { hiddenTypes: ['element:door'] },
    swatches: ['#ffffff', '#4a5878', '#8898b4', '#d4b060'],
  },
  // Category fills carry the information; structural detail is hidden.
  {
    id: 'zones',
    name: 'Zones Only',
    description: 'Decluttered zone view',
    overrides: {
      background: '#ffffff',
      byType: paletteToByType({
        wall: '#b0b4bc',
        wallDark: '#808690',
        light: '#ffffff',
        medium: '#f0f0f2',
        stroke: '#c8cad0',
        circ: '#f4f4f6',
        spaceFill: '#ffffff',
        spaceStroke: '#d8dade',
      }),
      hiddenTypes: [
        'element:door',
        'element:window',
        'element:opening',
        'element:beam',
        'element:stairs',
        'element:stairFlight',
        'element:slab',
        'element:ramp',
        'element:railing',
        'element:casework',
        'element:kitchen',
        'element:spaceDivider',
        'element:generic',
      ],
      categoryColors: {
        meet: { fill: '#e8b830', fillOpacity: 0.5 },
        work: { fill: '#4890d0', fillOpacity: 0.5 },
        socialize: { fill: '#40b870', fillOpacity: 0.5 },
        care: { fill: '#e07050', fillOpacity: 0.5 },
        support: { fill: '#a8aab0', fillOpacity: 0.25 },
      },
      roomStamp: { text: '#444444', textOutline: false },
    },
    swatches: ['#ffffff', '#b0b4bc', '#d8dade', '#e8b830'],
  },
  // Line work only, to show how far `byType` overrides can push the render.
  {
    id: 'wireframe',
    name: 'Wireframe',
    description: 'Ghost fills, crisp lines',
    overrides: {
      background: '#ffffff',
      byType: {
        ...paletteToByType({
          wall: '#3a3a3a',
          wallDark: '#1a1a1a',
          light: '#ffffff',
          medium: '#fafafa',
          stroke: '#888888',
          circ: '#fcfcfc',
          spaceFill: '#ffffff',
          spaceStroke: '#cccccc',
        }),
        'element:wall': {
          fill: '#3a3a3a',
          stroke: '#3a3a3a',
          fillOpacity: 0.12,
        },
        'element:boundaryWall': {
          fill: '#1a1a1a',
          stroke: '#1a1a1a',
          fillOpacity: 0.18,
        },
        'element:column': {
          fill: '#3a3a3a',
          stroke: '#3a3a3a',
          fillOpacity: 0.1,
        },
        'element:asset': {
          fill: '#e8e8e8',
          stroke: '#aaaaaa',
          fillOpacity: 0.15,
        },
        'element:casework': {
          fill: '#f0f0f0',
          stroke: '#999999',
          fillOpacity: 0.1,
        },
        'element:kitchen': {
          fill: '#f0f0f0',
          stroke: '#999999',
          fillOpacity: 0.1,
        },
        'layout:space': { fill: '#ffffff', stroke: '#cccccc', fillOpacity: 0 },
      },
      categoryColors: {
        meet: { fill: '#e8b830', fillOpacity: 0.2 },
        work: { fill: '#4890d0', fillOpacity: 0.18 },
        socialize: { fill: '#40b870', fillOpacity: 0.18 },
        care: { fill: '#e07050', fillOpacity: 0.2 },
        support: { fill: '#a0a0a0', fillOpacity: 0.08 },
      },
      roomStamp: { text: '#555555', textOutline: false },
    },
    swatches: ['#ffffff', '#3a3a3a', '#cccccc', '#4890d0'],
  },
  // Dark scheme, for kiosks in dim lobbies or after-hours displays.
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark, inverted scheme',
    overrides: {
      background: '#181c28',
      byType: paletteToByType({
        wall: '#8890a8',
        wallDark: '#606880',
        light: '#242838',
        medium: '#2a2e40',
        stroke: '#505870',
        circ: '#222638',
        spaceFill: '#1e2234',
        spaceStroke: '#3a4058',
      }),
      categoryColors: {
        meet: { fill: '#e8c060', fillOpacity: 0.3 },
        work: { fill: '#60a0e8', fillOpacity: 0.3 },
        socialize: { fill: '#50c880', fillOpacity: 0.3 },
        care: { fill: '#e87860', fillOpacity: 0.3 },
        support: { fill: '#707888', fillOpacity: 0.15 },
      },
      roomStamp: { text: '#a0a8c0', textOutline: true },
    },
    swatches: ['#181c28', '#8890a8', '#3a4058', '#e8c060'],
  },
]

// ── Preset thumbnails ───────────────────────────────────────────────────

/** Thumbnail size; the engine keeps the floor's aspect within it. */
const PREVIEW_WIDTH = 400
const PREVIEW_HEIGHT = 260

/**
 * Render a thumbnail of the floor under every preset, keyed by preset id.
 *
 * One hidden engine cycles through the presets, so only one extra WebGL
 * context exists, and it is destroyed before this resolves. Abort the signal
 * to stop early; the promise then resolves with what was captured.
 */
export async function generateThemePreviews(
  layers: LayerSettings,
  signal: AbortSignal,
): Promise<Record<string, string>> {
  // Off-screen rather than display:none, as the GPU still has to render it.
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${PREVIEW_WIDTH}px;height:${PREVIEW_HEIGHT}px;overflow:hidden;pointer-events:none;`
  document.body.appendChild(container)

  const withoutLabels = { ...layers, showLabels: false }
  const previews: Record<string, string> = {}
  let floorPlan: FloorPlanEngine | null = null

  try {
    const { FloorPlanEngine } = await import('@archilogic/floor-plan-sdk')
    if (signal.aborted) return previews

    floorPlan = new FloorPlanEngine({
      container,
      options: floorPlanStyle({ layers: withoutLabels }),
    })
    await loadConfiguredFloor(floorPlan)

    for (const preset of THEME_PRESETS) {
      if (signal.aborted) break
      floorPlan.set(
        floorPlanStyle({ layers: withoutLabels, overrides: preset.overrides }),
      )
      await afterRender()
      const image = await floorPlan.exportImage({
        format: 'png',
        output: 'base64',
        maxWidth: PREVIEW_WIDTH,
      })
      if (!(image instanceof Error)) previews[preset.id] = image
    }
    return previews
  } finally {
    floorPlan?.destroy()
    container.remove()
  }
}

/**
 * Wait for the engine's render loop to draw at least one full frame: the
 * next animation frame, then a short timer for the renderer to flush.
 * Exporting earlier captures the previous theme.
 */
function afterRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 50))
  })
}

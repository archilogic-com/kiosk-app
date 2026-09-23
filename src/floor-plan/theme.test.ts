import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STYLES,
  THEME_PRESETS,
  applyPalette,
  extractPalette,
  floorPlanStyle,
  hexToRgb,
  paletteToByType,
  setCategoryColor,
  setElementStyle,
  toggleElementHidden,
} from '#/floor-plan/theme'
import type { ThemeOverrides, ThemePalette } from '#/floor-plan/theme'

const layers = { showCategories: false, showLabels: true, showAssets: true }

describe('floorPlanStyle', () => {
  it('renders walls individually, so per-type colours and highlights apply', () => {
    // Merged wall contours collapse wall/column/boundaryWall into one
    // style-less shape. Every preset depends on styling them separately.
    expect(floorPlanStyle({ layers }).theme.wallContours).toBe(false)
  })

  it('hides furniture, labels and hidden types through visibility', () => {
    const { visibility } = floorPlanStyle({
      layers: { ...layers, showAssets: false, showLabels: false },
      overrides: { hiddenTypes: ['element:door'] },
    })
    expect(visibility.byType).toEqual({
      'element:door': { show: false },
      'element:asset': { show: false },
      roomStamp: { show: false },
    })
    expect(floorPlanStyle({ layers }).visibility.byType).toEqual({})
  })

  it('emits no category overlay until categories are shown', () => {
    expect(floorPlanStyle({ layers }).theme.byFilter).toEqual([])
    expect(
      floorPlanStyle({ layers: { ...layers, showCategories: true } }).theme
        .byFilter?.length,
    ).toBeGreaterThan(0)
  })

  it('keeps the space style under a category colour, so only the fill changes', () => {
    const [meet] =
      floorPlanStyle({ layers: { ...layers, showCategories: true } }).theme
        .byFilter ?? []
    expect(meet.style).toMatchObject({
      stroke: DEFAULT_STYLES['layout:space'].stroke,
      fillOpacity: 0.45,
    })
  })

  it('lays a node style over its type, so nothing falls back to engine defaults', () => {
    const { theme } = floorPlanStyle({
      layers,
      nodeStyles: [
        { id: 'node1', type: 'element:asset', style: { fill: '#ff0000' } },
      ],
    })
    expect(theme.byId?.node1).toEqual({
      ...DEFAULT_STYLES['element:asset'],
      fill: '#ff0000',
    })
  })

  it('applies a preset without losing unrelated element types', () => {
    const midnight = THEME_PRESETS.find((p) => p.id === 'midnight')!
    const { theme } = floorPlanStyle({ layers, overrides: midnight.overrides })
    expect(theme.background).toMatchObject({
      color: midnight.overrides.background,
    })
    expect(Object.keys(theme.byType ?? {})).toHaveLength(
      Object.keys(DEFAULT_STYLES).length,
    )
  })
})

describe('THEME_PRESETS', () => {
  it('has unique ids and four swatches each', () => {
    const ids = THEME_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const preset of THEME_PRESETS) {
      expect(preset.swatches).toHaveLength(4)
    }
  })
})

describe('palettes', () => {
  const palette: ThemePalette = {
    wall: '#112233',
    wallDark: '#001122',
    light: '#ffffff',
    medium: '#eeeeee',
    stroke: '#888888',
    circ: '#dddddd',
    spaceFill: '#fafafa',
    spaceStroke: '#cccccc',
  }

  it('round-trip through extractPalette', () => {
    expect(extractPalette(paletteToByType(palette))).toEqual(palette)
  })

  it('fall back to the default styles when nothing is overridden', () => {
    expect(extractPalette(undefined).wall).toBe(
      DEFAULT_STYLES['element:wall'].fill,
    )
  })
})

describe('theme override edits', () => {
  const base: ThemeOverrides = {
    byType: { 'element:wall': { fill: '#111111', fillOpacity: 0.5 } },
    hiddenTypes: ['element:door'],
  }

  it('set one field of one element and leave the rest alone', () => {
    const next = setElementStyle(base, 'element:wall', { stroke: '#222222' })
    expect(next.byType?.['element:wall']).toEqual({
      fill: '#111111',
      fillOpacity: 0.5,
      stroke: '#222222',
    })
    expect(base.byType?.['element:wall']).not.toHaveProperty('stroke')
  })

  it('toggle an element in and out of the hidden list', () => {
    expect(toggleElementHidden(base, 'element:door').hiddenTypes).toEqual([])
    expect(toggleElementHidden(base, 'element:beam').hiddenTypes).toEqual([
      'element:door',
      'element:beam',
    ])
  })

  it('apply a palette without losing opacity edits', () => {
    const palette = { ...extractPalette(base.byType), wall: '#abcdef' }
    const next = applyPalette(base, palette)
    expect(next.byType?.['element:wall']).toMatchObject({
      fill: '#abcdef',
      fillOpacity: 0.5,
    })
    expect(extractPalette(next.byType).wall).toBe('#abcdef')
  })

  it('merge category colour changes', () => {
    const withFill = setCategoryColor(base, 'meet', { fill: '#ff0000' })
    const withBoth = setCategoryColor(withFill, 'meet', { fillOpacity: 0.3 })
    expect(withBoth.categoryColors?.meet).toEqual({
      fill: '#ff0000',
      fillOpacity: 0.3,
    })
  })
})

describe('hexToRgb', () => {
  it('reads each channel', () => {
    expect(hexToRgb('#3b6de0')).toEqual([59, 109, 224])
  })
})

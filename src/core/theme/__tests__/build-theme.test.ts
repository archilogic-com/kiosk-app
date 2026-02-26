import { describe, expect, it } from 'vitest'
import { buildFloorPlanTheme } from '#/core/theme/build-theme'
import { THEME_PRESETS } from '#/core/theme/presets'

const base = { showCategories: false, showLabels: true, showAssets: true }

describe('buildFloorPlanTheme', () => {
  it('renders walls individually, so per-type colours and byId dimming apply', () => {
    // Merged wall contours collapse wall/column/boundaryWall into one
    // style-less shape. Every preset depends on styling them separately.
    expect(buildFloorPlanTheme(base).wallContours).toBe(false)
  })

  it('hides assets when the layer is switched off', () => {
    const theme = buildFloorPlanTheme({ ...base, showAssets: false })
    expect(theme.byType!['element:asset']).toMatchObject({ fillOpacity: 0 })
  })

  it('emits no category overlay until categories are shown', () => {
    expect(buildFloorPlanTheme(base).byFilter).toEqual([])
    expect(
      buildFloorPlanTheme({ ...base, showCategories: true }).byFilter!.length,
    ).toBeGreaterThan(0)
  })

  it('drops room stamps when labels are off', () => {
    expect(
      buildFloorPlanTheme({ ...base, showLabels: false }).roomStamps,
    ).toMatchObject({ roomStampDisplay: [] })
  })

  it('merges the byType style under a byId override so nothing falls back to engine defaults', () => {
    const theme = buildFloorPlanTheme({
      ...base,
      byId: { node1: { __type: 'element:asset', fill: '#ff0000' } },
    })
    expect(theme.byId!.node1).toMatchObject({ fill: '#ff0000' })
    expect(theme.byId!.node1).toHaveProperty('fillOpacity')
    expect(theme.byId!.node1).not.toHaveProperty('__type')
  })

  it('applies a preset without losing unrelated element types', () => {
    const preset = THEME_PRESETS.find((p) => p.id === 'midnight')!
    const theme = buildFloorPlanTheme({
      ...base,
      themeOverrides: preset.overrides,
    })
    expect(theme.background).toMatchObject({
      color: preset.overrides.background,
    })
    expect(Object.keys(theme.byType!).length).toBeGreaterThan(10)
  })
})

describe('THEME_PRESETS', () => {
  it('has unique ids and four preview swatches each', () => {
    const ids = THEME_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const preset of THEME_PRESETS) {
      expect(preset.palette).toHaveLength(4)
      expect(preset.name).toBeTruthy()
    }
  })
})

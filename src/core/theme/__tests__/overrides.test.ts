import { describe, expect, it } from 'vitest'
import type { ThemeOverrides } from '#/core/theme/defaults'
import {
  applyPalette,
  setCategoryColor,
  setElementStyle,
  toggleElementHidden,
} from '#/core/theme/overrides'
import { extractPalette } from '#/core/theme/palette'

const base: ThemeOverrides = {
  byType: { 'element:wall': { fill: '#111111', fillOpacity: 0.5 } },
  hiddenTypes: ['element:door'],
}

describe('theme override edits', () => {
  it('set one field of one element and leave the rest alone', () => {
    const next = setElementStyle(base, 'element:wall', 'stroke', '#222222')
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

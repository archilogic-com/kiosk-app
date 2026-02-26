import { describe, expect, it } from 'vitest'
import type { ThemePalette } from '#/core/theme/palette'
import {
  extractPalette,
  hexToRgbTuple,
  paletteToByType,
  rgbTupleToHex,
} from '#/core/theme/palette'

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

describe('hex / rgb conversion', () => {
  it('round-trips a colour', () => {
    expect(rgbTupleToHex(hexToRgbTuple('#3b6de0'))).toBe('#3b6de0')
  })

  it('pads single-digit channels', () => {
    expect(rgbTupleToHex([0, 5, 16])).toBe('#000510')
  })
})

describe('palette <-> byType', () => {
  it('round-trips through extractPalette', () => {
    expect(extractPalette(paletteToByType(palette))).toEqual(palette)
  })

  it('falls back to engine defaults when overrides are absent', () => {
    const extracted = extractPalette(undefined)
    expect(extracted.wall).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('assigns every element type a fill and a stroke', () => {
    for (const style of Object.values(paletteToByType(palette))) {
      expect(style.fill).toBeDefined()
      expect(style.stroke).toBeDefined()
    }
  })
})

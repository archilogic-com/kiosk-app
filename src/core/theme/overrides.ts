import type {
  ElementStyleOverride,
  ThemeOverrides,
} from '#/core/theme/defaults'
import type { ThemePalette } from '#/core/theme/palette'
import { paletteToByType } from '#/core/theme/palette'

/**
 * Immutable edits to a theme's overrides, as a theme editor makes them.
 * Each returns a new object and leaves the input untouched.
 */

export function setElementStyle(
  overrides: ThemeOverrides,
  elementType: string,
  field: keyof ElementStyleOverride,
  value: string | number | 'native',
): ThemeOverrides {
  return {
    ...overrides,
    byType: {
      ...overrides.byType,
      [elementType]: { ...overrides.byType?.[elementType], [field]: value },
    },
  }
}

export function toggleElementHidden(
  overrides: ThemeOverrides,
  elementType: string,
): ThemeOverrides {
  const hidden = overrides.hiddenTypes ?? []
  return {
    ...overrides,
    hiddenTypes: hidden.includes(elementType)
      ? hidden.filter((t) => t !== elementType)
      : [...hidden, elementType],
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
  const byType: Record<string, ElementStyleOverride> = { ...overrides.byType }
  for (const [key, style] of Object.entries(paletteToByType(palette))) {
    byType[key] = { ...byType[key], fill: style.fill, stroke: style.stroke }
  }
  return { ...overrides, byType }
}

export function setCategoryColor(
  overrides: ThemeOverrides,
  category: string,
  change: { fill?: string; fillOpacity?: number },
): ThemeOverrides {
  return {
    ...overrides,
    categoryColors: {
      ...overrides.categoryColors,
      [category]: { ...overrides.categoryColors?.[category], ...change },
    },
  }
}

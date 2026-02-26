import type { ThemeOverrides } from '#/core/theme/defaults'
import { paletteToByType } from '#/core/theme/palette'

export interface ThemePreset {
  id: string
  name: string
  description: string
  overrides: ThemeOverrides
  /** Swatches shown in the picker: [background, wall, spaceStroke, accent] */
  palette: [string, string, string, string]
}

export const THEME_PRESETS: ThemePreset[] = [
  // Baseline: engine defaults, doors hidden for a cleaner plan.
  {
    id: 'default',
    name: 'Default',
    description: 'Clean, translucent layout',
    overrides: {
      hiddenTypes: ['element:door'],
      byType: {},
    },
    palette: ['#ffffff', '#4a5878', '#8898b4', '#d4b060'],
  },
  // Category fills carry the information, structural detail is hidden.
  // Demonstrates `hiddenTypes` combined with `categoryColors`.
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
    palette: ['#ffffff', '#b0b4bc', '#d8dade', '#e8b830'],
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
        // Override walls/columns to near-transparent fills with visible strokes
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
        // Near-invisible assets, just a hint
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
        // Transparent space fills: outlines only
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
    palette: ['#ffffff', '#3a3a3a', '#cccccc', '#4890d0'],
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
    palette: ['#181c28', '#8890a8', '#3a4058', '#e8c060'],
  },
]

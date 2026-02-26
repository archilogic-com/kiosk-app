import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { loadConfiguredFloor } from '#/core/sdk/create-floor-plan'
import { buildFloorPlanTheme } from '#/core/theme/build-theme'
import { THEME_PRESETS } from '#/core/theme/presets'

export interface PreviewSettings {
  showCategories: boolean
  showLabels: boolean
  showAssets: boolean
}

/** Thumbnail size; the engine keeps the floor's aspect within it. */
const PREVIEW_WIDTH = 400
const PREVIEW_HEIGHT = 260

/**
 * Render a thumbnail of the floor under every theme preset, keyed by preset id.
 *
 * One hidden engine instance cycles through the presets, so only one extra
 * WebGL context exists, and it is destroyed before this resolves. Abort the
 * signal to stop early; the promise then resolves with what was captured.
 */
export async function generateThemePreviews(
  settings: PreviewSettings,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Record<string, string>> {
  // Off-screen rather than display:none, as the GPU still has to render it.
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${PREVIEW_WIDTH}px;height:${PREVIEW_HEIGHT}px;overflow:hidden;pointer-events:none;`
  document.body.appendChild(container)

  let engine: FloorPlanEngine | null = null
  const previews: Record<string, string> = {}

  try {
    const { FloorPlanEngine } = await import('@archilogic/floor-plan-sdk')
    if (signal?.aborted) return previews

    engine = new FloorPlanEngine({
      container,
      options: {
        theme: buildFloorPlanTheme({ ...settings, showLabels: false }),
      },
    })

    const result = await loadConfiguredFloor(engine)
    if (result instanceof Error) throw result
    // The engine's render loop draws asynchronously; give it a frame.
    await settle()

    for (const preset of THEME_PRESETS) {
      if (signal?.aborted) break
      engine.set({
        theme: buildFloorPlanTheme({
          ...settings,
          showLabels: false,
          themeOverrides: preset.overrides,
        }),
      })
      await settle()
      const dataUrl = await engine.exportImage({
        format: 'png',
        output: 'base64',
        maxWidth: PREVIEW_WIDTH,
      })
      if (typeof dataUrl === 'string') previews[preset.id] = dataUrl
    }
    return previews
  } finally {
    engine?.destroy()
    container.remove()
  }
}

/**
 * Wait for the engine's render loop to complete at least one full frame:
 * the next animation frame, then a short timer for the renderer to flush.
 * Exporting earlier captures the previous theme.
 */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 50))
  })
}

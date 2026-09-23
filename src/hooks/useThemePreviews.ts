import { useEffect, useEffectEvent, useState } from 'react'
import type { PreviewSettings } from '#/core/sdk/theme-previews'
import { generateThemePreviews } from '#/core/sdk/theme-previews'

/**
 * Theme preview thumbnails, generated once the floor has loaded.
 *
 * The settings in force when generation starts are the ones used throughout,
 * so toggling a layer mid-run cannot produce thumbnails from two different
 * views.
 */
export function useThemePreviews(
  floorPlanReady: boolean,
  settings: PreviewSettings,
): Record<string, string> {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const generate = useEffectEvent((signal: AbortSignal) =>
    generateThemePreviews(settings, { signal }),
  )

  useEffect(() => {
    if (!floorPlanReady) return
    const controller = new AbortController()
    generate(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPreviews(result)
      })
      .catch((error: unknown) => {
        console.warn('Theme previews could not be generated', error)
      })
    return () => controller.abort()
  }, [floorPlanReady])

  return previews
}

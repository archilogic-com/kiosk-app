import { useEffect, useState } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import { createFloorPlan } from '#/core/sdk/create-floor-plan'

export function useFloorPlan(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [floorPlan, setFloorPlan] = useState<FloorPlanEngine | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Loading is async and StrictMode mounts twice, so a handle can arrive
    // after this effect was torn down: drop it rather than leak the context.
    let cancelled = false
    let handle: { destroy: () => void } | null = null

    createFloorPlan(container)
      .then((created) => {
        if (cancelled) return created.destroy()
        handle = created
        setFloorPlan(created.floorPlan)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Failed to load floor plan',
        )
        setIsLoading(false)
      })

    return () => {
      cancelled = true
      handle?.destroy()
    }
  }, [containerRef])

  return { floorPlan, isLoading, error }
}

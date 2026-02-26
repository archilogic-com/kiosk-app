import { useEffect, useRef } from 'react'
import type { FloorPlanEngine } from '@archilogic/floor-plan-sdk'
import type { Workstation } from '#/core/domain/types'
import type { PeopleMarkerCallbacks } from '#/core/sdk/people-marker-layer'
import { PeopleMarkerLayer } from '#/core/sdk/people-marker-layer'

export function usePeopleMarkers(
  floorPlan: FloorPlanEngine | null,
  workstations: Workstation[],
  highlightedId: string | null,
  callbacks: PeopleMarkerCallbacks = {},
) {
  const layerRef = useRef<PeopleMarkerLayer | null>(null)
  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  })

  useEffect(() => {
    if (!floorPlan) return
    const layer = new PeopleMarkerLayer(floorPlan, {
      onHover: (w) => callbacksRef.current.onHover?.(w),
      onClick: (w) => callbacksRef.current.onClick?.(w),
    })
    layerRef.current = layer
    return () => {
      layer.destroy()
      layerRef.current = null
    }
  }, [floorPlan])

  useEffect(() => {
    layerRef.current?.setWorkstations(workstations)
  }, [workstations])

  useEffect(() => {
    layerRef.current?.highlight(highlightedId)
  }, [highlightedId])
}

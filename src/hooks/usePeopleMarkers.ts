import { useEffect, useEffectEvent, useRef } from 'react'
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
  const onHover = useEffectEvent((workstation: Workstation | null) =>
    callbacks.onHover?.(workstation),
  )
  const onClick = useEffectEvent((workstation: Workstation) =>
    callbacks.onClick?.(workstation),
  )

  useEffect(() => {
    if (!floorPlan) return
    const layer = new PeopleMarkerLayer(floorPlan, { onHover, onClick })
    layerRef.current = layer
    return () => {
      layer.destroy()
      layerRef.current = null
    }
  }, [floorPlan])

  useEffect(() => {
    layerRef.current?.setWorkstations(workstations)
  }, [floorPlan, workstations])

  useEffect(() => {
    layerRef.current?.highlight(highlightedId)
  }, [floorPlan, highlightedId])
}

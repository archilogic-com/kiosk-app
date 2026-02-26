import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { SearchableItem, Space, Workstation } from '#/core/domain/types'
import { formatSpaceType } from '#/core/domain/format'

/** A click within this many metres of a workstation selects it. */
const WORKSTATION_CLICK_RADIUS_M = 1.5

const SPACE_SELECT = {
  id: true,
  name: true,
  labelPoint: true,
  category: true,
  subCategory: true,
  customAttributes: true,
} as const

type QueriedSpace = {
  id: string
  name?: string | null
  labelPoint?: unknown
  category?: string | null
  subCategory?: string | null
  customAttributes?: Record<string, unknown> | null
}

/** Spaces are often unnamed, so fall back through the taxonomy for a label. */
function toSpace(space: QueriedSpace): Space {
  return {
    id: space.id,
    name:
      space.name?.trim() ||
      formatSpaceType(space.subCategory) ||
      formatSpaceType(space.category) ||
      'Space',
    position: space.labelPoint as Vector2,
    category: space.category ?? 'unknown',
    subCategory: space.subCategory ?? '',
    isBookable: (space.customAttributes?.isBookable as boolean) ?? true,
  }
}

function nearestWorkstation(
  position: Vector2,
  workstations: Workstation[],
): Workstation | null {
  const thresholdSq = WORKSTATION_CLICK_RADIUS_M ** 2
  let best: Workstation | null = null
  let bestSq = Infinity
  for (const workstation of workstations) {
    const dSq =
      (position[0] - workstation.position[0]) ** 2 +
      (position[1] - workstation.position[1]) ** 2
    if (dSq < thresholdSq && dSq < bestSq) {
      bestSq = dSq
      best = workstation
    }
  }
  return best
}

/**
 * Turn a click into something the kiosk can navigate to.
 *
 * A click reports the node under the cursor, which may be a space, a piece of
 * furniture, or nothing at all. We work outwards: known entities first, then
 * ask the engine what the node is, then fall back to position.
 */
export function resolveClick(
  floorPlan: FloorPlanEngine,
  event: { nodeId?: string; position: Vector2 },
  workstations: Workstation[],
  spaces: Space[],
): SearchableItem | null {
  if (event.nodeId) {
    const known = spaces.find((s) => s.id === event.nodeId)
    if (known) return { type: 'space', data: known }

    const workstation = workstations.find((w) => w.id === event.nodeId)
    if (workstation) return { type: 'workstation', data: workstation }

    // getSpacesById / getElementsById throw when the id is of the other kind,
    // so a miss here is expected control flow rather than a failure.
    try {
      const space = floorPlan.getSpacesById({
        id: event.nodeId,
        select: SPACE_SELECT,
      })
      if (space?.id) return { type: 'space', data: toSpace(space) }
    } catch {
      /* not a space */
    }

    try {
      const element = floorPlan.getElementsById({
        id: event.nodeId,
        select: { id: true, transform: true },
      })
      if (element?.id) {
        const at: Vector2 = [
          element.transform.position[0],
          element.transform.position[2],
        ]
        const [containing] = floorPlan.getSpaces({
          where: { at },
          select: SPACE_SELECT,
        })
        if (containing) return { type: 'space', data: toSpace(containing) }
      }
    } catch {
      /* not an element */
    }
  }

  // Workstations are small and often unnamed nodes, so allow a near miss.
  const nearby = nearestWorkstation(event.position, workstations)
  if (nearby) return { type: 'workstation', data: nearby }

  const [hit] = floorPlan.getSpaces({
    where: { at: event.position },
    select: SPACE_SELECT,
  })
  return hit ? { type: 'space', data: toSpace(hit) } : null
}

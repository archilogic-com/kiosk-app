import type { FloorPlanEngine, Vector2 } from '@archilogic/floor-plan-sdk'
import type { Space, Workstation } from '#/core/domain/types'
import { EXCLUDED_CATEGORIES } from '#/core/domain/types'
import { FLOOR_PLAN_CONFIG } from '#/core/config'
import { formatSpaceType } from '#/core/domain/format'

export interface FloorData {
  workstations: Workstation[]
  spaces: Space[]
  /** Where the kiosk itself stands: the origin for every route. */
  kioskPosition: Vector2 | null
  kioskSpaceName: string | null
  categoryCounts: Record<string, number>
}

/** Where the kiosk is assumed to stand, best match first. */
const KIOSK_SUBCATEGORIES = ['foyer', 'entrance', 'reception', 'lobby']

/** Unnamed spaces still worth listing, labelled by subCategory. */
const UNNAMED_SUBCATEGORY_LABELS: Record<string, string> = {
  restroom: 'Restroom',
  wc: 'WC',
  toilet: 'Restroom',
  bathroom: 'Bathroom',
  shower: 'Shower Room',
}

function attr(attrs: Record<string, unknown>, key: string): string | null {
  const value = attrs[key]
  return typeof value === 'string' && value.trim() ? value : null
}

/** Read the loaded floor into the kiosk's own domain objects. */
export function extractFloorData(
  floorPlan: FloorPlanEngine,
  attributes = FLOOR_PLAN_CONFIG.workstationAttributes,
): FloorData {
  const workstationAssets = floorPlan.getElements({
    select: { id: true, type: true, transform: true, customAttributes: true },
    where: { type: 'element:asset', subCategory: 'workstation' },
  })

  const workstations: Workstation[] = workstationAssets.map((asset) => {
    const attrs = asset.customAttributes ?? {}
    const occupantName = attr(attrs, attributes.occupantName)
    return {
      id: asset.id,
      // transform.position is 3D; the plan is the X/Z plane.
      position: [asset.transform.position[0], asset.transform.position[2]],
      occupantName,
      employeeId: attr(attrs, attributes.employeeId),
      available: !occupantName,
    }
  })

  const allSpaces = floorPlan.getSpaces({
    select: {
      id: true,
      name: true,
      labelPoint: true,
      category: true,
      subCategory: true,
      area: true,
      seatCapacity: true,
      customAttributes: true,
    },
  })

  const spaces: Space[] = allSpaces
    .filter((space) => {
      if (EXCLUDED_CATEGORIES.includes(space.category ?? '')) return false
      const named = Boolean(space.name?.trim())
      return (
        named ||
        (space.subCategory ?? '').toLowerCase() in UNNAMED_SUBCATEGORY_LABELS
      )
    })
    .map((space) => {
      const sub = (space.subCategory ?? '').toLowerCase()
      return {
        id: space.id,
        name:
          space.name?.trim() ||
          UNNAMED_SUBCATEGORY_LABELS[sub] ||
          'Unnamed Space',
        position: space.labelPoint as Vector2,
        category: space.category ?? 'unknown',
        subCategory: space.subCategory ?? '',
        area: space.area ?? undefined,
        seatCapacity: space.seatCapacity ?? undefined,
        isBookable: (space.customAttributes?.isBookable as boolean) ?? true,
      }
    })

  const kioskSpace =
    KIOSK_SUBCATEGORIES.reduce<(typeof allSpaces)[number] | undefined>(
      (found, sub) =>
        found ??
        allSpaces.find(
          (space) =>
            (space.subCategory ?? '').toLowerCase() === sub ||
            (space.name ?? '').toLowerCase().includes(sub),
        ),
      undefined,
    ) ?? allSpaces[0]

  const categoryCounts: Record<string, number> = {}
  for (const space of spaces) {
    categoryCounts[space.category] = (categoryCounts[space.category] ?? 0) + 1
  }
  categoryCounts.people = workstations.filter((w) => w.occupantName).length

  return {
    workstations,
    spaces,
    kioskPosition: (kioskSpace?.labelPoint as Vector2) ?? null,
    // Entrance spaces are usually unnamed, so fall back to the taxonomy:
    // a foyer reads as "Foyer" rather than a generic label.
    kioskSpaceName:
      kioskSpace?.name?.trim() ||
      formatSpaceType(kioskSpace?.subCategory) ||
      'Entrance',
    categoryCounts,
  }
}

/** Human-readable name for whatever space sits at a plan position. */
export function spaceNameAt(floorPlan: FloorPlanEngine, at: Vector2): string {
  const [space] = floorPlan.getSpaces({
    where: { at },
    select: { name: true, category: true, subCategory: true },
  })
  return (
    space?.name?.trim() ||
    formatSpaceType(space?.subCategory) ||
    formatSpaceType(space?.category) ||
    'Space'
  )
}

/**
 * The Floor Plan engine itself: create it, load the configured floor, frame
 * it, and read the floor's spaces and workstations into the kiosk's own
 * objects.
 */
import type {
  BoundingBox2d,
  FloorPlanEngine,
  FpeConfig,
  FpePointerEvent,
  QueryPick,
  SpaceData,
  Vector2,
} from '@archilogic/floor-plan-sdk'
import { FLOOR_PLAN_CONFIG, VIEWPORT_INSETS } from '#/config'
import { findItem, formatSpaceType } from '#/kiosk-state'
import type { NavigableItem, Space, Workstation } from '#/kiosk-state'

// ── Loading ─────────────────────────────────────────────────────────────

/**
 * Load the configured floor into an engine. A floor id renders that floor's
 * default layout; a layout id renders one specific layout.
 */
export async function loadConfiguredFloor(
  floorPlan: FloorPlanEngine,
): Promise<void> {
  const { target, publishableAccessToken, spaceApiUrl } = FLOOR_PLAN_CONFIG
  if (spaceApiUrl) {
    // The API URL is global to the SDK, so it is set before every load.
    const { setApiUrls } = await import('@archilogic/floor-plan-sdk')
    setApiUrls({ spaceApiUrl })
  }
  const result =
    target.kind === 'floor'
      ? await floorPlan.loadFloorById(target.id, { publishableAccessToken })
      : await floorPlan.loadLayoutById(target.id, { publishableAccessToken })
  if (result instanceof Error) throw result
}

/** How far a load has got, for a UI that shows progress rather than a spinner. */
export type LoadStage = 'engine' | 'floor' | 'ready' | 'error'

export interface FloorPlanLoader {
  /** Resolves once the floor is drawn, framed and read; rejects if it cannot load. */
  ready: Promise<{ floorPlan: FloorPlanEngine; floor: FloorData }>
  getStage(): LoadStage
  subscribe(listener: () => void): () => void
}

/**
 * Load the configured floor into `container`, reporting progress as it goes.
 *
 * Start this before the UI mounts: the container is plain HTML, so nothing
 * waits on a framework. The SDK is imported dynamically so its WebGL bundle
 * stays out of the initial payload: a kiosk shows its shell immediately and
 * fills in the plan a moment later.
 */
export function loadFloorPlan(
  container: HTMLElement,
  options: FpeConfig,
): FloorPlanLoader {
  let stage: LoadStage = 'engine'
  const listeners = new Set<() => void>()
  const setStage = (next: LoadStage) => {
    stage = next
    listeners.forEach((listener) => listener())
  }

  const ready = (async () => {
    const { FloorPlanEngine } = await import('@archilogic/floor-plan-sdk')
    setStage('floor')

    const floorPlan = new FloorPlanEngine({ container, options })
    try {
      await loadConfiguredFloor(floorPlan)
    } catch (error) {
      floorPlan.destroy()
      throw error
    }

    zoomToFloor(floorPlan, false)
    const floor = readFloor(floorPlan)
    setStage('ready')
    return { floorPlan, floor }
  })()
  ready.catch(() => setStage('error'))

  return {
    ready,
    getStage: () => stage,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

// ── Framing ─────────────────────────────────────────────────────────────

/** Margin around the floor when framing all of it. */
const FLOOR_MARGIN = 1.5

/**
 * Frame a box within the part of the viewport the floating panels leave
 * visible, rather than the whole screen, so content never centres itself
 * underneath a panel.
 */
export function zoomToFit(
  floorPlan: FloorPlanEngine,
  box: BoundingBox2d,
  animate = true,
): void {
  const { innerWidth: width, innerHeight: height } = window
  floorPlan.zoomExtents(
    undefined,
    animate,
    floorPlan.getZoomExtentsBoundingBox(
      box,
      VIEWPORT_INSETS.left,
      0,
      width - VIEWPORT_INSETS.right,
      height,
      width,
      height,
    ),
  )
}

export function zoomToFloor(floorPlan: FloorPlanEngine, animate = true): void {
  zoomToFit(floorPlan, floorPlan.getBoundingBox(FLOOR_MARGIN), animate)
}

// ── Reading the floor ───────────────────────────────────────────────────

/** Everything the kiosk reads from the floor once it has loaded. */
export interface FloorData {
  workstations: Workstation[]
  spaces: Space[]
  /** Where the kiosk itself stands: the origin for every route. */
  kioskPosition: Vector2 | null
  kioskSpaceName: string
  /** Spaces per category, plus `people` for occupied workstations. */
  categoryCounts: Record<string, number>
}

/** The space fields the kiosk reads, wherever it queries spaces. */
const SPACE_SELECT = {
  id: true,
  name: true,
  labelPoint: true,
  category: true,
  subCategory: true,
  area: true,
  seatCapacity: true,
  customAttributes: true,
} as const

type QueriedSpace = QueryPick<SpaceData, typeof SPACE_SELECT>

/** Corridors and undefined spaces are not destinations. */
const EXCLUDED_CATEGORIES = ['circulate', 'none']

/** Unnamed spaces still worth listing, labelled by subCategory. */
const UNNAMED_SPACE_LABELS: Record<string, string> = {
  restroom: 'Restroom',
  wc: 'WC',
  toilet: 'Restroom',
  bathroom: 'Bathroom',
  shower: 'Shower Room',
}

/** Where the kiosk is assumed to stand, best match first. */
const KIOSK_SUBCATEGORIES = ['foyer', 'entrance', 'reception', 'lobby']

/** A click within this many metres of a workstation selects it. */
const WORKSTATION_CLICK_RADIUS_M = 1.5

/** Spaces are often unnamed, so fall back through the taxonomy for a label. */
function spaceName(space: QueriedSpace): string {
  return (
    space.name?.trim() ||
    UNNAMED_SPACE_LABELS[(space.subCategory ?? '').toLowerCase()] ||
    formatSpaceType(space.subCategory) ||
    formatSpaceType(space.category) ||
    'Space'
  )
}

function toSpace(space: QueriedSpace): Space {
  return {
    id: space.id,
    name: spaceName(space),
    position: space.labelPoint,
    category: space.category ?? 'unknown',
    subCategory: space.subCategory ?? '',
    area: space.area ?? undefined,
    seatCapacity: space.seatCapacity ?? undefined,
    isBookable: space.customAttributes?.isBookable !== false,
  }
}

/** The space under a point on the plan, if any. */
export function spaceAt(floorPlan: FloorPlanEngine, at: Vector2): Space | null {
  const [space] = floorPlan.getSpaces({ where: { at }, select: SPACE_SELECT })
  return space ? toSpace(space) : null
}

function textAttribute(
  attributes: Record<string, string | boolean | number> | undefined,
  key: string,
): string | null {
  const value = attributes?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

/** Read the loaded floor into the kiosk's own domain objects. */
export function readFloor(
  floorPlan: FloorPlanEngine,
  attributes = FLOOR_PLAN_CONFIG.workstationAttributes,
): FloorData {
  const workstations: Workstation[] = floorPlan
    .getElements({
      select: { id: true, transform: true, customAttributes: true },
      where: { type: 'element:asset', subCategory: 'workstation' },
    })
    .map((asset) => ({
      id: asset.id,
      // transform.position is 3D; the plan is the X/Z plane.
      position: [asset.transform.position[0], asset.transform.position[2]],
      occupantName: textAttribute(
        asset.customAttributes,
        attributes.occupantName,
      ),
      employeeId: textAttribute(asset.customAttributes, attributes.employeeId),
    }))

  const allSpaces = floorPlan.getSpaces({ select: SPACE_SELECT })
  const spaces = allSpaces
    .filter(
      (space) =>
        !EXCLUDED_CATEGORIES.includes(space.category ?? '') &&
        (space.name?.trim() ||
          (space.subCategory ?? '').toLowerCase() in UNNAMED_SPACE_LABELS),
    )
    .map(toSpace)

  const categoryCounts: Record<string, number> = {
    people: workstations.filter((w) => w.occupantName).length,
  }
  for (const space of spaces) {
    categoryCounts[space.category] = (categoryCounts[space.category] ?? 0) + 1
  }

  const kioskSpace = findKioskSpace(allSpaces)
  return {
    workstations,
    spaces,
    kioskPosition: kioskSpace?.labelPoint ?? null,
    kioskSpaceName: kioskSpace ? spaceName(kioskSpace) : 'Entrance',
    categoryCounts,
  }
}

function findKioskSpace(spaces: QueriedSpace[]): QueriedSpace | undefined {
  for (const sub of KIOSK_SUBCATEGORIES) {
    const match = spaces.find(
      (space) =>
        (space.subCategory ?? '').toLowerCase() === sub ||
        (space.name ?? '').toLowerCase().includes(sub),
    )
    if (match) return match
  }
  return spaces[0]
}

/**
 * Turn a click on the plan into something the kiosk can navigate to: the
 * space or workstation that was clicked, a workstation near the click
 * (they are small, so a near miss counts), or the space underneath it.
 */
export function resolveClick(
  floorPlan: FloorPlanEngine,
  event: FpePointerEvent,
  floor: Pick<FloorData, 'spaces' | 'workstations'>,
): NavigableItem | null {
  const known = event.nodeId ? findItem(floor, event.nodeId) : null
  if (known) return known

  const nearby = nearestWorkstation(event.position, floor.workstations)
  if (nearby) return { type: 'workstation', data: nearby }

  const space = spaceAt(floorPlan, event.position)
  return space ? { type: 'space', data: space } : null
}

function nearestWorkstation(
  position: Vector2,
  workstations: Workstation[],
): Workstation | null {
  let nearest: Workstation | null = null
  let nearestDistance = WORKSTATION_CLICK_RADIUS_M
  for (const workstation of workstations) {
    const distance = Math.hypot(
      position[0] - workstation.position[0],
      position[1] - workstation.position[1],
    )
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = workstation
    }
  }
  return nearest
}

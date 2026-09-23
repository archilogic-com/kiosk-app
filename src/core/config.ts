/**
 * The floor this kiosk displays, and how to read occupants from it.
 *
 * Every value resolves in the same order: URL query parameter, then
 * environment variable (see `.env.example`), then the public demo floor. So
 * `?floor=<id>&token=<publishable token>` points a running kiosk at another
 * floor without a rebuild, and a deployment can bake its own defaults in.
 *
 * A publishable access token is designed for the browser: it is read-only and
 * restricted to the domains you allow when you create it, so it is safe in
 * source and in a URL. The token must allow the domain the kiosk is served
 * from. Create one at
 * https://app.archilogic.com/organization/settings/access-tokens
 */

/**
 * A floor holds one or more layouts, and loading a floor renders its default
 * layout. A floor id is the common case; a layout id addresses one specific
 * layout. The demo model is a layout.
 */
export type FloorPlanTarget =
  { kind: 'floor'; id: string } | { kind: 'layout'; id: string }

export interface FloorPlanConfig {
  publishableAccessToken: string
  target: FloorPlanTarget
  /** Space API origin for another tenant; unset uses the SDK's default. */
  spaceApiUrl?: string
  /**
   * Custom attributes read from workstation assets, keyed by the
   * `apiFieldName` you gave them (Dashboard → Settings → Custom attributes).
   * Occupants are optional: without them the kiosk still renders, searches
   * and navigates; the people finder is simply empty.
   *
   * https://developers.archilogic.com/space-graph/custom-attributes.html
   */
  workstationAttributes: {
    occupantName: string
    employeeId: string
  }
}

/** The query parameters that configure the kiosk, as opposed to deep links. */
export const CONFIG_PARAMS = {
  publishableAccessToken: 'token',
  floorId: 'floor',
  layoutId: 'layout',
  spaceApiUrl: 'spaceApiUrl',
  occupantName: 'occupantAttribute',
  employeeId: 'employeeIdAttribute',
} as const

const DEMO_CONFIG: FloorPlanConfig = {
  publishableAccessToken: '1e1f7eef-938e-42a6-bb77-b9de57269ef2',
  target: { kind: 'layout', id: 'bbe08f8e-ce75-44ac-8ddf-03b1df37e358' },
  workstationAttributes: {
    occupantName: 'Occupant-Name',
    employeeId: 'Employee-ID',
  },
}

type ConfigEnv = Pick<
  ImportMetaEnv,
  | 'VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN'
  | 'VITE_ARCHILOGIC_FLOOR_ID'
  | 'VITE_ARCHILOGIC_LAYOUT_ID'
  | 'VITE_ARCHILOGIC_SPACE_API_URL'
  | 'VITE_ARCHILOGIC_OCCUPANT_ATTRIBUTE'
  | 'VITE_ARCHILOGIC_EMPLOYEE_ID_ATTRIBUTE'
>

/** Blank values count as unset, so a copied `.env.example` changes nothing. */
function firstSet(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean)
}

/**
 * A floor and a layout id from the same source are a pair: a URL that names a
 * layout must not be overridden by a floor id from the environment.
 */
function targetFrom(
  floorId: string | null | undefined,
  layoutId: string | null | undefined,
): FloorPlanTarget | undefined {
  const floor = firstSet(floorId)
  if (floor) return { kind: 'floor', id: floor }
  const layout = firstSet(layoutId)
  if (layout) return { kind: 'layout', id: layout }
  return undefined
}

/**
 * Anyone can hand out a link to a public kiosk, so a Space API URL from the
 * query string must be an Archilogic host, otherwise a crafted link could
 * render a floor served from anywhere under this kiosk's domain. The
 * environment is set by whoever deploys, so it is trusted as is.
 */
function isArchilogicUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value)
    return (
      protocol === 'https:' &&
      (hostname === 'archilogic.com' || hostname.endsWith('.archilogic.com'))
    )
  } catch {
    return false
  }
}

function spaceApiUrlFrom(
  param: string | null,
  env: string | undefined,
): string | undefined {
  const fromParam = firstSet(param)
  if (fromParam && !isArchilogicUrl(fromParam)) {
    console.warn(`Ignoring spaceApiUrl ${fromParam}: not an Archilogic host`)
  }
  return firstSet(
    fromParam && isArchilogicUrl(fromParam) ? fromParam : undefined,
    env,
  )
}

export function resolveFloorPlanConfig(
  search: string = window.location.search,
  env: ConfigEnv = import.meta.env,
): FloorPlanConfig {
  const params = new URLSearchParams(search)
  const param = (key: keyof typeof CONFIG_PARAMS) =>
    params.get(CONFIG_PARAMS[key])

  return {
    publishableAccessToken:
      firstSet(
        param('publishableAccessToken'),
        env.VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN,
      ) ?? DEMO_CONFIG.publishableAccessToken,
    target:
      targetFrom(param('floorId'), param('layoutId')) ??
      targetFrom(env.VITE_ARCHILOGIC_FLOOR_ID, env.VITE_ARCHILOGIC_LAYOUT_ID) ??
      DEMO_CONFIG.target,
    spaceApiUrl: spaceApiUrlFrom(
      param('spaceApiUrl'),
      env.VITE_ARCHILOGIC_SPACE_API_URL,
    ),
    workstationAttributes: {
      occupantName:
        firstSet(
          param('occupantName'),
          env.VITE_ARCHILOGIC_OCCUPANT_ATTRIBUTE,
        ) ?? DEMO_CONFIG.workstationAttributes.occupantName,
      employeeId:
        firstSet(
          param('employeeId'),
          env.VITE_ARCHILOGIC_EMPLOYEE_ID_ATTRIBUTE,
        ) ?? DEMO_CONFIG.workstationAttributes.employeeId,
    },
  }
}

/** Read once at startup: the kiosk shows one floor for its whole lifetime. */
export const FLOOR_PLAN_CONFIG = resolveFloorPlanConfig()

/** Average walking speed in m/s, used to turn path length into a duration. */
export const WALKING_SPEED_MS = 1.4

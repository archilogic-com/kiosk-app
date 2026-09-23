import { CONFIG_PARAMS } from '#/core/config'
import type { NavigableItem } from '#/core/domain/types'

/**
 * Deep link: `?to=<id>&type=space|workstation&directions=1`
 * Lets a QR code or a link in an invite open the kiosk straight on a target.
 */
export interface DeepLink {
  id: string
  type: 'space' | 'workstation'
  directionsOpen: boolean
}

const VALID_TYPES = new Set(['space', 'workstation'])

export function parseDeepLink(
  search: string = window.location.search,
): DeepLink | null {
  const params = new URLSearchParams(search)
  const id = params.get('to')
  const type = params.get('type')
  if (!id || !type || !VALID_TYPES.has(type)) return null
  return {
    id,
    type: type as DeepLink['type'],
    directionsOpen: params.get('directions') === '1',
  }
}

/** Strip the deep-link params so a reload doesn't re-trigger navigation. */
export function clearDeepLink(): void {
  const url = new URL(window.location.href)
  for (const key of ['to', 'type', 'directions']) url.searchParams.delete(key)
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

/**
 * The inverse of `parseDeepLink`: a URL that opens the kiosk on `item`. Keeps
 * the params that chose the floor, so the link opens on the same one.
 */
export function buildDeepLink(
  item: NavigableItem,
  directionsOpen: boolean,
  base: string = window.location.href,
): string {
  const url = new URL(base)
  const kept = new Set<string>(Object.values(CONFIG_PARAMS))
  for (const key of [...url.searchParams.keys()]) {
    if (!kept.has(key)) url.searchParams.delete(key)
  }
  url.searchParams.set('to', item.data.id)
  url.searchParams.set('type', item.type)
  if (directionsOpen) url.searchParams.set('directions', '1')
  return url.toString()
}

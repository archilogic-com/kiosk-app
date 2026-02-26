import { WALKING_SPEED_MS } from '#/core/config'

/** `openWorkspace` / `open_office` → `Open Workspace`, for taxonomy values shown in the UI. */
export function formatSpaceType(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** `36` metres → `<1 min walk`, `250` → `~3 min walk`. */
export function formatWalkingTime(distanceM: number): string {
  const seconds = distanceM / WALKING_SPEED_MS
  if (seconds < 60) return '<1 min walk'
  return `~${Math.round(seconds / 60)} min walk`
}

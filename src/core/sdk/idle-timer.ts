const DEFAULT_IDLE_MS = 60_000
const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
] as const

/**
 * Calls `onIdle` once the display has gone untouched, so an abandoned session
 * returns to the dashboard. Polls rather than debouncing per event, because
 * pointermove on a touch display fires continuously while someone is using it.
 */
export function createIdleTimer(
  onIdle: () => void,
  { idleMs = DEFAULT_IDLE_MS, pollMs = 5_000 } = {},
): { destroy: () => void } {
  let lastActivity = Date.now()
  const markActive = () => {
    lastActivity = Date.now()
  }

  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, markActive, { passive: true })
  }

  const interval = window.setInterval(() => {
    if (Date.now() - lastActivity >= idleMs) {
      markActive()
      onIdle()
    }
  }, pollMs)

  return {
    destroy() {
      window.clearInterval(interval)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive)
      }
    },
  }
}

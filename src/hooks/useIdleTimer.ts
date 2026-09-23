import { useEffect, useEffectEvent } from 'react'
import { createIdleTimer } from '#/core/sdk/idle-timer'

export function useIdleTimer(onIdle: () => void) {
  const fireIdle = useEffectEvent(onIdle)

  useEffect(() => {
    const timer = createIdleTimer(fireIdle)
    return () => timer.destroy()
  }, [])
}

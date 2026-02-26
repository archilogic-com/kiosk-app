import { useEffect, useRef } from 'react'
import { createIdleTimer } from '#/core/sdk/idle-timer'

export function useIdleTimer(onIdle: () => void) {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    const timer = createIdleTimer(() => onIdleRef.current())
    return () => timer.destroy()
  }, [])
}

import { useEffect, useState } from 'react'
import { formatDateTime } from '#/core/domain/clock'

export function useCurrentTime() {
  const [now, setNow] = useState(() => formatDateTime(new Date()))

  useEffect(() => {
    const interval = setInterval(
      () => setNow(formatDateTime(new Date())),
      60_000,
    )
    return () => clearInterval(interval)
  }, [])

  return now
}

export interface DisplayTime {
  date: string
  time: string
}

export function formatDateTime(date: Date, locale = 'en-US'): DisplayTime {
  return {
    date: date.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

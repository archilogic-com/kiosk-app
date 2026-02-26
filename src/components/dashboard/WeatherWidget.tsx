import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react'
import type { WeatherData, HourlyForecast } from '#/core/demo-data'

const CONDITION_ICONS: Record<HourlyForecast['condition'], typeof Sun> = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rainy: CloudRain,
}

function ConditionIcon({
  condition,
  className,
}: {
  condition: HourlyForecast['condition']
  className?: string
}) {
  const Icon = CONDITION_ICONS[condition]
  return <Icon className={className} aria-hidden="true" />
}

interface WeatherWidgetProps {
  weather: WeatherData
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  return (
    <div className="floating-panel bg-sky-50/60 px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {weather.location}
          </p>
          <p className="text-3xl font-bold">{weather.currentTempF}°F</p>
        </div>
        <ConditionIcon
          condition={weather.condition}
          className="size-10 text-sky-500"
        />
      </div>
      <div className="flex gap-4">
        {weather.hourly.map((hour) => (
          <div
            key={hour.hour}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span className="text-xs text-muted-foreground">{hour.hour}</span>
            <ConditionIcon
              condition={hour.condition}
              className="size-5 text-sky-400"
            />
            <span className="text-sm font-medium">{hour.tempF}°</span>
          </div>
        ))}
      </div>
    </div>
  )
}

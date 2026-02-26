import { useState } from 'react'
import { MOCK_WEATHER, DASHBOARD_CONFIG } from '#/core/demo-data'
import { PANEL } from '#/core/domain/layout'
import { useCurrentTime } from '#/hooks/useCurrentTime'
import { useDashboardStats } from '#/hooks/useDashboardStats'
import { WelcomeHeader } from './WelcomeHeader'
import { StatsCards } from './StatsCards'
import { EventsPanel } from './EventsPanel'
import { EventsDetailPanel } from './EventsDetailPanel'
import { WeatherWidget } from './WeatherWidget'
import { PeopleFinderCompact } from './PeopleFinderCompact'
import type { ScheduledEvent, Space, Workstation } from '#/core/domain/types'

interface DashboardOverlayProps {
  workstations: Workstation[]
  spaces: Space[]
  events: ScheduledEvent[]
  onActivateWayfinding: () => void
  onViewAttendance?: () => void
  onViewFreeRooms?: () => void
  onNavigateToSpace?: (spaceId: string) => void
  onHighlightSpaces?: (spaceIds: string[]) => void
  onHighlightSpace?: (spaceId: string | null) => void
  bookedSpaceIds?: Set<string>
  onBook?: (spaceId: string) => void
  className?: string
}

export function DashboardOverlay({
  workstations,
  spaces,
  events,
  onActivateWayfinding,
  onViewAttendance,
  onViewFreeRooms,
  onNavigateToSpace,
  onHighlightSpaces,
  onHighlightSpace,
  bookedSpaceIds,
  onBook,
  className = '',
}: DashboardOverlayProps) {
  const { date, time } = useCurrentTime()
  const stats = useDashboardStats(workstations, spaces, bookedSpaceIds)
  const [expandedPanel, setExpandedPanel] = useState<'events' | null>(null)

  if (expandedPanel === 'events') {
    return (
      <EventsDetailPanel
        events={events}
        onBack={() => setExpandedPanel(null)}
        onNavigateToSpace={onNavigateToSpace}
        onHighlightSpaces={onHighlightSpaces}
        onHighlightSpace={onHighlightSpace}
        bookedSpaceIds={bookedSpaceIds}
        onBook={onBook}
      />
    )
  }

  const panels = [
    <WelcomeHeader
      key="welcome"
      companyName={DASHBOARD_CONFIG.companyName}
      date={date}
      time={time}
    />,
    <StatsCards
      key="stats"
      attendance={stats.attendance}
      totalWorkstations={stats.totalWorkstations}
      freeRooms={stats.freeRooms}
      totalMeetingRooms={stats.totalMeetingRooms}
      onAttendanceClick={onViewAttendance}
      onFreeRoomsClick={onViewFreeRooms}
    />,
    <EventsPanel
      key="events"
      events={events}
      onExpand={() => setExpandedPanel('events')}
    />,
    <WeatherWidget key="weather" weather={MOCK_WEATHER} />,
    <PeopleFinderCompact key="people" onActivate={onActivateWayfinding} />,
  ]

  return (
    <div
      style={{ width: PANEL.dashboardWidth }}
      className={`flex flex-col gap-3 ${className}`}
    >
      {panels.map((panel, i) => (
        <div
          key={i}
          className="dashboard-stagger"
          style={{ '--stagger-index': i } as React.CSSProperties}
        >
          {panel}
        </div>
      ))}
    </div>
  )
}

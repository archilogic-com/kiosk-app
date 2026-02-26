import { Users, DoorOpen } from 'lucide-react'

interface StatsCardsProps {
  attendance: number
  totalWorkstations: number
  freeRooms: number
  totalMeetingRooms: number
  onAttendanceClick?: () => void
  onFreeRoomsClick?: () => void
}

export function StatsCards({
  attendance,
  totalWorkstations,
  freeRooms,
  totalMeetingRooms,
  onAttendanceClick,
  onFreeRoomsClick,
}: StatsCardsProps) {
  return (
    <div className="floating-panel grid grid-cols-2 gap-3 p-3">
      {/* Attendance card */}
      <button
        onClick={onAttendanceClick}
        className="rounded-xl bg-emerald-50 px-4 py-4 text-left transition-all hover:bg-emerald-100/70 hover:shadow-sm active:scale-[0.97]"
      >
        <div className="mb-2 flex items-center gap-2">
          <Users className="size-4 text-emerald-600" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-700/70">
            In Office
          </span>
        </div>
        <p className="text-3xl font-bold text-emerald-800">{attendance}</p>
        <p className="mt-1 text-xs text-emerald-600/70">
          of {totalWorkstations} workstations
        </p>
      </button>

      {/* Free rooms card */}
      <button
        onClick={onFreeRoomsClick}
        className="rounded-xl bg-amber-50 px-4 py-4 text-left transition-all hover:bg-amber-100/70 hover:shadow-sm active:scale-[0.97]"
      >
        <div className="mb-2 flex items-center gap-2">
          <DoorOpen className="size-4 text-amber-600" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wider text-amber-700/70">
            Free Rooms
          </span>
        </div>
        <p className="text-3xl font-bold text-amber-800">{freeRooms}</p>
        <p className="mt-1 text-xs text-amber-600/70">
          of {totalMeetingRooms} meeting rooms
        </p>
      </button>
    </div>
  )
}

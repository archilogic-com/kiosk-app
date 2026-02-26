import type { Space, Workstation } from '#/core/domain/types'
import { isDestination } from '#/core/domain/types'

export interface FloorStats {
  attendance: number
  totalWorkstations: number
  freeRooms: number
  totalMeetingRooms: number
}

export function computeFloorStats(
  workstations: Workstation[],
  spaces: Space[],
  bookedSpaceIds?: Set<string>,
): FloorStats {
  const meetingRooms = spaces.filter(
    (s) => s.category === 'meet' && isDestination(s),
  )
  const booked = bookedSpaceIds
    ? meetingRooms.filter((s) => bookedSpaceIds.has(s.id)).length
    : 0

  return {
    attendance: workstations.filter((w) => !w.available).length,
    totalWorkstations: workstations.length,
    freeRooms: Math.max(0, meetingRooms.length - booked),
    totalMeetingRooms: meetingRooms.length,
  }
}

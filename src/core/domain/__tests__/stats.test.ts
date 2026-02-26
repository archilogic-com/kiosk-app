import { describe, expect, it } from 'vitest'
import type { Space, Workstation } from '#/core/domain/types'
import { computeFloorStats } from '#/core/domain/stats'

const w = (id: string, available: boolean): Workstation => ({
  id,
  position: [0, 0],
  occupantName: available ? null : 'Someone',
  employeeId: null,
  available,
})
const s = (
  id: string,
  category: string,
  subCategory = 'meetingRoom',
): Space => ({
  id,
  name: id,
  position: [0, 0],
  category,
  subCategory,
})

describe('computeFloorStats', () => {
  const workstations = [w('a', false), w('b', false), w('c', true)]
  const spaces = [
    s('m1', 'meet'),
    s('m2', 'meet'),
    s('w1', 'work', 'openWorkspace'),
  ]

  it('counts attendance as occupied workstations', () => {
    const stats = computeFloorStats(workstations, spaces)
    expect(stats.attendance).toBe(2)
    expect(stats.totalWorkstations).toBe(3)
  })

  it('counts only meeting rooms, excluding hubs', () => {
    const withHub = [...spaces, s('h1', 'meet', 'hub')]
    expect(computeFloorStats(workstations, withHub).totalMeetingRooms).toBe(2)
  })

  it('subtracts booked rooms from the free count', () => {
    const stats = computeFloorStats(workstations, spaces, new Set(['m1']))
    expect(stats.freeRooms).toBe(1)
  })

  it('never reports negative free rooms', () => {
    const stats = computeFloorStats(
      workstations,
      spaces,
      new Set(['m1', 'm2', 'w1']),
    )
    expect(stats.freeRooms).toBe(0)
  })
})

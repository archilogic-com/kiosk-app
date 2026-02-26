import { describe, expect, it } from 'vitest'
import { formatSpaceType, formatWalkingTime } from '#/core/domain/format'

describe('formatSpaceType', () => {
  it.each([
    ['openWorkspace', 'Open Workspace'],
    ['privateOffice', 'Private Office'],
    ['open_office', 'Open Office'],
    ['meeting-room', 'Meeting Room'],
    ['lobby', 'Lobby'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatSpaceType(input)).toBe(expected)
  })

  it.each([null, undefined, ''])('returns an empty string for %s', (input) => {
    expect(formatSpaceType(input)).toBe('')
  })
})

describe('formatWalkingTime', () => {
  it('rounds to minutes at 1.4 m/s and floors short walks', () => {
    expect(formatWalkingTime(36)).toBe('<1 min walk')
    expect(formatWalkingTime(84)).toBe('~1 min walk')
    expect(formatWalkingTime(250)).toBe('~3 min walk')
  })
})

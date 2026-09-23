import { describe, expect, it } from 'vitest'
import { buildDeepLink, parseDeepLink } from '#/core/domain/deep-link'

describe('parseDeepLink', () => {
  it('reads a space target', () => {
    expect(parseDeepLink('?to=abc&type=space')).toEqual({
      id: 'abc',
      type: 'space',
      directionsOpen: false,
    })
  })

  it('opens directions when asked', () => {
    expect(
      parseDeepLink('?to=abc&type=workstation&directions=1')?.directionsOpen,
    ).toBe(true)
  })

  it.each([
    ['no params', ''],
    ['missing id', '?type=space'],
    ['missing type', '?to=abc'],
    ['unknown type', '?to=abc&type=building'],
    ['legacy type', '?to=abc&type=room'],
  ])('returns null for %s', (_label, search) => {
    expect(parseDeepLink(search)).toBeNull()
  })
})

describe('buildDeepLink', () => {
  it('round-trips through parseDeepLink and drops unrelated params', () => {
    const url = buildDeepLink(
      {
        type: 'space',
        data: {
          id: 'abc',
          name: 'Oslo',
          position: [0, 0],
          category: 'meet',
          subCategory: 'meetingRoom',
        },
      },
      true,
      'https://kiosk.example/?utm=x&to=old#top',
    )
    expect(new URL(url).searchParams.get('utm')).toBeNull()
    expect(parseDeepLink(new URL(url).search)).toEqual({
      id: 'abc',
      type: 'space',
      directionsOpen: true,
    })
  })

  it('keeps the params that chose the floor', () => {
    const url = new URL(
      buildDeepLink(
        {
          type: 'workstation',
          data: {
            id: 'ws',
            position: [0, 0],
            occupantName: null,
            employeeId: null,
            available: true,
          },
        },
        false,
        'https://kiosk.example/?floor=f1&token=t1&utm=x',
      ),
    )
    expect(url.searchParams.get('floor')).toBe('f1')
    expect(url.searchParams.get('token')).toBe('t1')
    expect(url.searchParams.get('utm')).toBeNull()
  })
})

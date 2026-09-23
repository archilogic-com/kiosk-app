import { describe, expect, it } from 'vitest'
import { resolveFloorPlanConfig } from '#/core/config'

const NO_ENV = {}

describe('resolveFloorPlanConfig', () => {
  it('falls back to the demo layout with no params or env', () => {
    const config = resolveFloorPlanConfig('', NO_ENV)
    expect(config.target.kind).toBe('layout')
    expect(config.publishableAccessToken).toBeTruthy()
    expect(config.workstationAttributes.occupantName).toBe('Occupant-Name')
  })

  it('reads the floor, token and attributes from the URL', () => {
    expect(
      resolveFloorPlanConfig(
        '?floor=f1&token=t1&occupantAttribute=owner&employeeIdAttribute=badge',
        NO_ENV,
      ),
    ).toEqual({
      publishableAccessToken: 't1',
      target: { kind: 'floor', id: 'f1' },
      workstationAttributes: { occupantName: 'owner', employeeId: 'badge' },
    })
  })

  it('prefers a floor over a layout from the same source', () => {
    expect(
      resolveFloorPlanConfig('?floor=f1&layout=l1', NO_ENV).target,
    ).toEqual({ kind: 'floor', id: 'f1' })
  })

  it('lets a URL layout override an environment floor', () => {
    const env = { VITE_ARCHILOGIC_FLOOR_ID: 'env-floor' }
    expect(resolveFloorPlanConfig('?layout=l1', env).target).toEqual({
      kind: 'layout',
      id: 'l1',
    })
    expect(resolveFloorPlanConfig('', env).target).toEqual({
      kind: 'floor',
      id: 'env-floor',
    })
  })

  it('prefers the URL token over the environment', () => {
    const env = { VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN: 'env-token' }
    expect(
      resolveFloorPlanConfig('?token=t1', env).publishableAccessToken,
    ).toBe('t1')
    expect(resolveFloorPlanConfig('', env).publishableAccessToken).toBe(
      'env-token',
    )
  })

  it('treats blank values as unset', () => {
    const env = {
      VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN: '',
      VITE_ARCHILOGIC_FLOOR_ID: ' ',
    }
    expect(resolveFloorPlanConfig('?floor=&token=', env)).toEqual(
      resolveFloorPlanConfig('', NO_ENV),
    )
  })
})

describe('resolveFloorPlanConfig spaceApiUrl', () => {
  it('uses the SDK default when unset', () => {
    expect(resolveFloorPlanConfig('', NO_ENV).spaceApiUrl).toBeUndefined()
  })

  it('accepts an Archilogic host from the URL', () => {
    expect(
      resolveFloorPlanConfig('?spaceApiUrl=https://api.eu.archilogic.com', {
        VITE_ARCHILOGIC_SPACE_API_URL: 'https://env.example',
      }).spaceApiUrl,
    ).toBe('https://api.eu.archilogic.com')
  })

  it.each([
    ['another host', 'https://evil.example'],
    ['a lookalike host', 'https://archilogic.com.evil.example'],
    ['plain http', 'http://api.archilogic.com'],
    ['not a URL', 'api.archilogic.com'],
  ])('ignores %s from the URL', (_label, value) => {
    const search = `?spaceApiUrl=${encodeURIComponent(value)}`
    expect(resolveFloorPlanConfig(search, NO_ENV).spaceApiUrl).toBeUndefined()
    expect(
      resolveFloorPlanConfig(search, {
        VITE_ARCHILOGIC_SPACE_API_URL: 'https://env.example',
      }).spaceApiUrl,
    ).toBe('https://env.example')
  })
})

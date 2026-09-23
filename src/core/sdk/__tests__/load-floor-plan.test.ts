import { describe, expect, it, vi } from 'vitest'
import { loadFloorPlan } from '#/core/sdk/load-floor-plan'
import { zoomToFloor } from '#/core/sdk/zoom'

const { engines, control } = vi.hoisted(() => ({
  engines: [] as Array<{ destroyed: boolean }>,
  control: { result: Promise.resolve<boolean | Error>(true) },
}))

vi.mock('@archilogic/floor-plan-sdk', () => ({
  FloorPlanEngine: class {
    destroyed = false
    constructor() {
      engines.push(this)
    }
    loadFloorById() {
      return control.result
    }
    loadLayoutById() {
      return control.result
    }
    destroy() {
      this.destroyed = true
    }
  },
}))
vi.mock('@archilogic/floor-plan-sdk/dist/style.css', () => ({}))
vi.mock('#/core/sdk/zoom', () => ({ zoomToFloor: vi.fn() }))

function deferred() {
  let resolve!: (value: boolean | Error) => void
  const promise = new Promise<boolean | Error>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('loadFloorPlan', () => {
  it('report each stage and resolve with the framed engine', async () => {
    const load = deferred()
    control.result = load.promise
    const stages: string[] = []
    const loader = loadFloorPlan(document.createElement('div'), { left: 10 })
    loader.subscribe(() => stages.push(loader.getStage()))

    expect(loader.getStage()).toBe('engine')
    await vi.waitFor(() => expect(loader.getStage()).toBe('floor'))

    load.resolve(true)
    const engine = await loader.ready
    expect(engine).toBe(engines.at(-1))
    expect(zoomToFloor).toHaveBeenCalledWith(engine, { left: 10 }, false)
    expect(stages).toEqual(['floor', 'ready'])
  })

  it('reject, destroy the engine and report an error when the floor fails', async () => {
    control.result = Promise.resolve(new Error('no such floor'))
    const loader = loadFloorPlan(document.createElement('div'))

    await expect(loader.ready).rejects.toThrow('no such floor')
    await vi.waitFor(() => expect(loader.getStage()).toBe('error'))
    expect(engines.at(-1)?.destroyed).toBe(true)
  })

  it('stop notifying an unsubscribed listener', async () => {
    control.result = Promise.resolve(true)
    const loader = loadFloorPlan(document.createElement('div'))
    const listener = vi.fn()
    loader.subscribe(listener)()

    await loader.ready
    expect(listener).not.toHaveBeenCalled()
  })
})

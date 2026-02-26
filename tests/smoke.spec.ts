import { expect, test } from '@playwright/test'
import { diffRatio, Kiosk, OSLO } from './kiosk'

test.describe('kiosk', () => {
  test('loads the floor and opens on the dashboard', async ({ page }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()

    await expect(page.getByRole('heading', { name: 'Acme Corp' })).toBeVisible()
    await expect(page.getByRole('button', { name: /in office/i })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /free rooms/i }),
    ).toBeVisible()
  })

  test('finds spaces, people and events', async ({ page }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()

    await kiosk.search('Oslo')
    await expect(kiosk.results()).toHaveCount(1)
    await expect(kiosk.result('Oslo')).toContainText('Meeting Room')

    await kiosk.search('Marketing')
    await expect(kiosk.result('Marketing All-Hands')).toBeVisible()

    // Occupants come from custom attributes on workstation assets.
    await kiosk.search('a')
    await expect(kiosk.results().first()).toBeVisible()
  })

  test('a category filter colours every space in it', async ({ page }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()

    await page.getByRole('button', { name: /^Rooms/ }).click()
    await expect(kiosk.results().first()).toBeVisible()
    await kiosk.settle()
  })

  test('typing with a category chip active keeps the first keystroke', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()
    await page.getByRole('button', { name: /^Rooms/ }).click()
    await expect(kiosk.results().first()).toBeVisible()

    // Typing replaces the chip with free text; the text must survive the swap.
    await kiosk.searchInput.pressSequentially('Os', { delay: 80 })
    await expect(kiosk.searchInput).toHaveValue('Os')
    await expect(kiosk.result('Oslo')).toBeVisible()
  })

  test('selecting a destination draws a path with distance and directions', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()
    await kiosk.search('Oslo')
    await kiosk.result('Oslo').click()

    const panel = page.getByRole('region', { name: /directions to Oslo/i })
    await expect(panel).toBeVisible()
    // A distance and a walking time, not an empty panel.
    await expect(panel).toContainText(/\d+\s*m/)
    await expect(panel).toContainText(/min walk/)
    // Steps are collapsed until asked for.
    await panel
      .getByRole('button', { name: /directions \(\d+ steps\)/i })
      .click()
    await expect(panel).toContainText(/Arrive at Oslo/)
    await expect(panel).toContainText(/through the corridor/)

    await kiosk.settle()
  })

  test('changing destination leaves no orphaned markers or layers', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()

    const walks: string[] = []
    for (const name of ['Oslo', 'Lagos', 'Madrid']) {
      await kiosk.backToSearch()
      await kiosk.search(name)
      await kiosk.result(name).click()
      const panel = page.getByRole('region', {
        name: new RegExp(`directions to ${name}`, 'i'),
      })
      await expect(panel).toBeVisible()
      await expect(panel).toContainText(/\d+\s*m/)
      await kiosk.settle(900)

      // Origin + destination, and nothing left behind by the previous route.
      expect(await kiosk.markerCount()).toBe(2)
      expect(await page.locator('canvas').count()).toBe(1)
      walks.push(await panel.innerText())
    }
    // Each destination produced its own route rather than reusing the last.
    expect(new Set(walks).size).toBe(3)
  })

  test('hover previews a space and releasing restores it exactly', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()
    await page.getByRole('button', { name: /^Rooms/ }).click()
    await expect(kiosk.results().first()).toBeVisible()
    await kiosk.settle()

    // Two captures of an unchanged plan still differ a little: WebGL
    // antialiasing is not bit-identical between frames. Measure that noise
    // here rather than hard-coding a threshold that depends on the GPU.
    const base = await kiosk.plan.screenshot()
    await kiosk.settle()
    const noise = diffRatio(base, await kiosk.plan.screenshot())

    await kiosk.result('Marrakesh').hover()
    await kiosk.settle()
    const hovered = await kiosk.plan.screenshot()
    expect(diffRatio(base, hovered)).toBeGreaterThan(noise * 2)

    // Moving away must restore the plan. Resolving hover through the theme
    // rather than painting it imperatively is what makes this exact: there is
    // no previous colour to reconstruct, only state to remove.
    await page.mouse.move(1200, 500, { steps: 10 })
    await kiosk.settle()
    const released = await kiosk.plan.screenshot()
    expect(diffRatio(base, released)).toBeLessThanOrEqual(noise * 2)
  })

  test('dragging the origin marker re-routes from the new position', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()
    await kiosk.search('Oslo')
    await kiosk.result('Oslo').click()

    const panel = page.getByRole('region', { name: /directions to Oslo/i })
    await expect(panel).toBeVisible()
    const before = await panel.innerText()
    const origin = await kiosk.marker.textContent()

    // Pick the marker up and drop it in the middle of the floor. Handlers are
    // on the window, so the drag has to survive leaving the marker's bounds.
    const box = (await kiosk.marker.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(700, 620, { steps: 15 })
    await page.mouse.up()
    await kiosk.settle(1200)

    // The marker reports the space it landed in, and the route recomputes.
    await expect(kiosk.marker).not.toHaveText(origin ?? '')
    expect(await panel.innerText()).not.toBe(before)
    expect(await kiosk.markerCount()).toBe(2)
  })

  test('a deep link opens on the destination and clears its own parameters', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open(`?to=${OSLO}&type=space&directions=1`)

    // Straight into wayfinding: the dashboard must never appear.
    await expect(page.getByRole('heading', { name: 'Acme Corp' })).toHaveCount(
      0,
    )
    await expect(
      page.getByRole('region', { name: /directions to Oslo/i }),
    ).toBeVisible()
    await expect(page.getByText('Arrive at Oslo')).toBeVisible()
    // Reloading must not re-trigger navigation.
    expect(new URL(page.url()).search).toBe('')
  })

  test('returns to the dashboard when left alone', async ({ page }) => {
    // Let real time run while the engine loads, then jump past the idle timeout.
    await page.clock.install()
    await page.clock.resume()
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()
    await kiosk.search('Oslo')
    await kiosk.result('Oslo').click()
    await expect(
      page.getByRole('region', { name: /directions to Oslo/i }),
    ).toBeVisible()

    // Move the origin first: the next visitor must find it back at the kiosk.
    const origin = await kiosk.marker.textContent()
    const box = (await kiosk.marker.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(700, 620, { steps: 15 })
    await page.mouse.up()
    await expect(kiosk.marker).not.toHaveText(origin ?? '')

    await page.clock.fastForward('01:10')
    await expect(page.getByRole('heading', { name: 'Acme Corp' })).toBeVisible()
    await expect(page.getByRole('region', { name: /directions/i })).toHaveCount(
      0,
    )
    await expect(kiosk.marker).toHaveText(origin ?? '')
  })

  test('every theme preset renders, and renders differently', async ({
    page,
  }) => {
    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.openLayers()
    await kiosk.showThemes()

    const presets = ['Default', 'Zones Only', 'Wireframe', 'Midnight']
    const shots: Buffer[] = []
    for (const preset of presets) {
      await kiosk.applyTheme(preset)
      shots.push(await kiosk.plan.screenshot())
    }

    // Every preset must look different from every other one. A preset whose
    // element styles silently fail to apply would otherwise pass unnoticed,
    // which is exactly what merged wall contours used to do.
    for (let i = 0; i < presets.length; i++) {
      for (let j = i + 1; j < presets.length; j++) {
        expect(
          diffRatio(shots[i], shots[j]),
          `${presets[i]} and ${presets[j]} render identically`,
        ).toBeGreaterThan(0.01)
      }
    }
  })

  test('reports no console errors during a full session', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))

    const kiosk = new Kiosk(page)
    await kiosk.open()
    await kiosk.enterSearch()
    await kiosk.search('Oslo')
    await kiosk.result('Oslo').click()
    await kiosk.settle(900)

    expect(errors).toEqual([])
  })
})

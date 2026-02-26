import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

/** A meeting room on the demo floor, used as a stable navigation target. */
export const OSLO = '7aea3091-4041-47db-95bf-8c91950dd5c3'

/**
 * Helpers for driving the kiosk.
 *
 * The floor plan is a WebGL canvas, so assertions about what is drawn are
 * made against screenshots of it. Everything else is asserted through the
 * accessibility tree.
 */
export class Kiosk {
  constructor(private readonly page: Page) {}

  /** The canvas alone: screenshots of it ignore the floating panels. */
  get plan(): Locator {
    return this.page.locator('canvas').first()
  }

  get marker(): Locator {
    return this.page.getByText('You are here')
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/${query}`)
    await this.waitForPlan()
  }

  /** Resolves once the engine has drawn and the kiosk knows where it stands. */
  async waitForPlan(): Promise<void> {
    await expect(this.plan).toBeVisible({ timeout: 30_000 })
    await expect(this.marker).toBeVisible({ timeout: 30_000 })
    await this.settle()
  }

  /** Give the engine's render loop a frame to paint before capturing. */
  async settle(ms = 600): Promise<void> {
    await this.page.waitForTimeout(ms)
  }

  async enterSearch(): Promise<void> {
    await this.page.getByRole('button', { name: /search people/i }).click()
    await expect(this.searchInput).toBeVisible()
  }

  get searchInput(): Locator {
    return this.page.getByRole('combobox')
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text)
  }

  results(): Locator {
    return this.page.locator('[cmdk-item]')
  }

  result(name: string): Locator {
    return this.results().filter({ hasText: name }).first()
  }

  /** HTML markers the SDK has placed: origin, destination, avatars. */
  markerCount(): Promise<number> {
    return this.page.locator('.fpe-marker').count()
  }

  async openLayers(): Promise<void> {
    await this.page.getByRole('button', { name: /open layers/i }).click()
  }

  /** Expands the themes section; safe to call once per panel opening. */
  async showThemes(): Promise<void> {
    const toggle = this.page.getByRole('button', { name: /toggle themes/i })
    if ((await toggle.getAttribute('aria-expanded')) !== 'true')
      await toggle.click()
    await expect(
      this.page.getByRole('button', { name: /^Default:/i }),
    ).toBeVisible()
  }

  async applyTheme(name: string): Promise<void> {
    await this.page
      .getByRole('button', { name: new RegExp(`^${name}:`, 'i') })
      .click()
    await this.settle(900)
  }

  /** Returns to the search list from a destination panel, if one is open. */
  async backToSearch(): Promise<void> {
    const back = this.page.getByRole('button', { name: /back to search/i })
    if (await back.isVisible()) await back.click()
  }
}

/** Share of pixels that differ between two PNG captures of the same element. */
export function diffRatio(a: Buffer, b: Buffer): number {
  const left = PNG.sync.read(a)
  const right = PNG.sync.read(b)
  const changed = pixelmatch(
    left.data,
    right.data,
    undefined,
    left.width,
    left.height,
    {
      threshold: 0.05,
    },
  )
  return changed / (left.width * left.height)
}

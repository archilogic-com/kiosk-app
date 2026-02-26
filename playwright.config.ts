import { defineConfig, devices } from '@playwright/test'

const PORT = 5175
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  // The plan is WebGL and the kiosk animates on entry.
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    // A wall-mounted display, not a laptop.
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Test the production build: no HMR, no dependency pre-bundling, and the
  // same bundle a kiosk would actually run.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

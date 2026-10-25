import { defineConfig, devices } from '@playwright/test';

// End-to-end test: boots the dev server on port 5175 and plays whole games in Chromium.
// The page clock is faked (page.clock), so a 16-quarter game takes seconds, not minutes.
const PORT = 5175;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/takeoff-middle-power/`,
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/takeoff-middle-power/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

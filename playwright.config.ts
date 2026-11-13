import { defineConfig, devices } from '@playwright/test';
import { basePathFromSiteUrl } from './src/config/siteUrl.ts';
import { readSiteUrl } from './tooling/siteUrl.node.ts';

const PORT = 4173;
const baseURL = `http://localhost:${PORT}${basePathFromSiteUrl(readSiteUrl())}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    {
      name: 'desktop',
      testIgnore: /phone\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      testIgnore: /phone\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    // phone: read-only timetable cards (iteration 7) – the editing specs above target desktop and tablet
    {
      name: 'phone',
      testMatch: /(phone|app)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    // Tests run against the production build, served like on GitHub Pages
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // Each page renders WebGL in software (SwiftShader); more parallel pages starve the CPU and make clicks time out.
  workers: 2,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:5199', screenshot: 'only-on-failure' },
  // e2e always uses our own MIT example set, even if .env.local switches the dev example to local fixtures.
  webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199', reuseExistingServer: false, env: { VITE_EXAMPLE: 'school' } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } } }],
});

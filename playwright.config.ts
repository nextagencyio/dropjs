import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx tsx src/cli/commands/dev.ts',
    url: 'http://localhost:3000/api/entity-types',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: '3000',
      DROP_DATA_DIR: './e2e-data',
      DROP_DISABLE_RATE_LIMIT: '1',
      DROP_CLEAN_DB: '1',
    },
  },
});

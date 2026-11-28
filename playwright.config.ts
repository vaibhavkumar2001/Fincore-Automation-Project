import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/features/**/*.feature',
  steps: [
    'step-definitions/**/*.ts',
    'fixtures/index.ts'
  ]
});

export default defineConfig({
  testDir,
  timeout: 30000,

  webServer: [
    // Normal server: no artificial delay, used by all regular tests
    {
      command: 'npm run start:app',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
    },
    // Slow server: simulates database latency, used only by the race tests
    {
      command: 'npm run start:app',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3001',
        TRANSFER_DELAY_MS: '100',
      },
    },
    // Short-lived tokens server: used only by the token expiry test
    {
      command: 'npm run start:app',
      url: 'http://localhost:3002/health',
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3002',
        TOKEN_TTL_MS: '1000',
      },
    },
  ],
});
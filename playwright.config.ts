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

  // Starts the FinCore API automatically before the tests run
  webServer: {
    command: 'npm run start:app',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
  },
});
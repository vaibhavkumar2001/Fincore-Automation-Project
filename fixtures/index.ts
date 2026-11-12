import { request } from '@playwright/test';
import { test as base } from 'playwright-bdd';
import { ApiClient } from '../api/apiClient';

type Ctx = {
  idempotencyKey?: string;
  paymentId?: string;
  requestBody?: Record<string, unknown>;
};

type MyFixtures = {
  apiClient: ApiClient;
  ctx: Ctx;
};

const apiBaseURL = process.env.API_BASE_URL ?? 'http://localhost:3000';

export const test = base.extend<MyFixtures>({
  apiClient: async ({}, use) => {
    const apiRequestContext = await request.newContext({
      baseURL: apiBaseURL,
      // Token is optional until the auth fixture is added on Day 3
      extraHTTPHeaders: process.env.API_TOKEN
        ? { Authorization: `Bearer ${process.env.API_TOKEN}` }
        : {},
    });
    await use(new ApiClient(apiRequestContext));
    await apiRequestContext.dispose();
  },

  // Fresh scratchpad per scenario for sharing values between steps
  ctx: async ({}, use) => {
    await use({});
  },
});

export { expect } from '@playwright/test';
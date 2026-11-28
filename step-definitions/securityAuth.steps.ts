import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';
import type { Ctx } from '../fixtures';
import type { ApiClient } from '../api/apiClient';
import { buildUser } from '../data/userFactory';

const { When, Then } = createBdd(test);

// Sends a request with an empty body: auth must reject it before any validation runs
async function sendRequest(apiClient: ApiClient, method: string, path: string) {
  if (method === 'GET') {
    await apiClient.get(path);
  } else if (method === 'POST') {
    await apiClient.post(path, {});
  } else {
    throw new Error(`Unsupported method in feature file: ${method}`);
  }
}

function requireUsername(ctx: Ctx): string {
  if (!ctx.username) {
    throw new Error('No registered user in ctx. Add the step "a registered user exists" first.');
  }
  return ctx.username;
}

// ---------- When: protected endpoints ----------

When('I call {string} {string} without credentials', async ({ apiClient }, method: string, path: string) => {
  await sendRequest(apiClient, method, path);
});

When(
  'I call {string} {string} with the Authorization header {string}',
  async ({ apiClient }, method: string, path: string, headerValue: string) => {
    await apiClient.setHeader('Authorization', headerValue);
    await sendRequest(apiClient, method, path);
  },
);

// Registers and logs in a real user, then changes the last character of the token
When('I call {string} {string} with a tampered valid token', async ({ apiClient }, method: string, path: string) => {
  const user = buildUser();
  const credentials = { username: user.username, password: user.password };

  await apiClient.post('/auth/register', credentials);
  await apiClient.expectStatus(201);
  await apiClient.post('/auth/login', credentials);
  await apiClient.expectStatus(200);

  const { token } = apiClient.bodyAs<{ token: string }>();
  const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');

  await apiClient.setHeader('Authorization', `Bearer ${tampered}`);
  await sendRequest(apiClient, method, path);
});

// ---------- When: login abuse ----------

When('I log in as an unregistered user without a password', async ({ apiClient }) => {
  await apiClient.post('/auth/login', { username: buildUser().username });
});

When('I log in as an unregistered user with a password', async ({ apiClient }) => {
  const user = buildUser();
  await apiClient.post('/auth/login', { username: user.username, password: user.password });
});

When('I log in as the registered user without a password', async ({ apiClient, ctx }) => {
  await apiClient.post('/auth/login', { username: requireUsername(ctx) });
});

When('I log in as the registered user with a non-string password', async ({ apiClient, ctx }) => {
  await apiClient.post('/auth/login', { username: requireUsername(ctx), password: 12345678 });
});

// ---------- Then ----------

Then('the response should not contain a token', async ({ apiClient }) => {
  const body = apiClient.body as Record<string, unknown> | undefined;
  expect(body?.token, 'A token must not be issued for this login').toBeUndefined();
});
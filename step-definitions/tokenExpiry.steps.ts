import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';
import { buildUser } from '../data/userFactory';

const { Given, When, Then } = createBdd(test);

// Token expiry tests use the short-TTL server (port 3002)
const expiryBase = process.env.EXPIRY_API_BASE_URL ?? 'http://localhost:3002';

let lastStatus = 0;

async function getAccountsStatus(token: string): Promise<number> {
  const res = await fetch(`${expiryBase}/accounts/00000000-0000-0000-0000-000000000000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.status;
}

Given('I hold a fresh token from the short-lived token server', async ({ ctx }) => {
  const user = buildUser();
  const credentials = { username: user.username, password: user.password };
  const jsonHeaders = { 'Content-Type': 'application/json' };

  const registerRes = await fetch(`${expiryBase}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  if (registerRes.status !== 201) {
    throw new Error(`Registration failed with status ${registerRes.status}`);
  }

  const loginRes = await fetch(`${expiryBase}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  const { token } = (await loginRes.json()) as { token: string };
  ctx.raceToken = token;
});

When('I use the token immediately', async ({ ctx }) => {
  lastStatus = await getAccountsStatus(ctx.raceToken!);
});

When('I wait {int} milliseconds', async ({}, ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
});

When('I use the token again', async ({ ctx }) => {
  lastStatus = await getAccountsStatus(ctx.raceToken!);
});

Then('the token request status should be {int}', async ({}, expected: number) => {
  expect(lastStatus).toBe(expected);
});
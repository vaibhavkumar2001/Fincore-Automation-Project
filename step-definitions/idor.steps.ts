import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';
import type { Ctx } from '../fixtures';
import { buildUser } from '../data/userFactory';
import { errorSchema } from '../contracts/payment.contract';

const { Given, When, Then } = createBdd(test);

const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000';

// Sends a request as the attacker and stores the result in ctx
async function asAttacker(ctx: Ctx, method: 'GET' | 'POST', path: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ctx.otherToken}`,
  };
  if (method === 'POST') headers['Idempotency-Key'] = randomUUID();

  const res = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify({}) : undefined,
  });

  let body: any = undefined;
  try {
    body = await res.json();
  } catch {
    // Empty or non-JSON body: leave undefined
  }
  ctx.otherResult = { status: res.status, body };
}

// ---------- Given ----------

Given('an attacker user is logged in', async ({ ctx }) => {
  const user = buildUser();
  const credentials = { username: user.username, password: user.password };
  const jsonHeaders = { 'Content-Type': 'application/json' };

  const registerRes = await fetch(`${baseURL}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  if (registerRes.status !== 201) {
    throw new Error(`Attacker registration failed with status ${registerRes.status}`);
  }

  const loginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  const { token } = (await loginRes.json()) as { token: string };
  ctx.otherToken = token;
});

// ---------- When ----------

When('the attacker fetches the victim payment', async ({ ctx }) => {
  await asAttacker(ctx, 'GET', `/payments/${ctx.paymentId}`);
});

When('the attacker captures the victim payment', async ({ ctx }) => {
  await asAttacker(ctx, 'POST', `/payments/${ctx.paymentId}/capture`);
});

When('the attacker refunds the victim payment', async ({ ctx }) => {
  await asAttacker(ctx, 'POST', `/payments/${ctx.paymentId}/refund`);
});

When('the attacker fetches the victim transfer', async ({ ctx }) => {
  await asAttacker(ctx, 'GET', `/transfers/${ctx.transferId}`);
});

When('the attacker fetches the victim account', async ({ ctx }) => {
  await asAttacker(ctx, 'GET', `/accounts/${ctx.fromAccountId}`);
});

When('the attacker fetches the victim account ledger', async ({ ctx }) => {
  await asAttacker(ctx, 'GET', `/accounts/${ctx.fromAccountId}/ledger`);
});

// ---------- Then ----------

Then('the attacker request should be rejected with status {int}', async ({ ctx }, expected: number) => {
  expect(ctx.otherResult?.status, 'Attacker was able to access another user\'s resource').toBe(expected);
  const result = errorSchema.safeParse(ctx.otherResult?.body);
  expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
});
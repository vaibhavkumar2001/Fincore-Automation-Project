import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'node:crypto';
import { test } from '../fixtures/index';
import { buildUser } from '../data/userFactory';
import { accountSchema } from '../contracts/account.contract';

const { Given, When, Then } = createBdd(test);

const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000';

// Creates a second user and an account for them using plain fetch,
// so the main apiClient (and its Authorization header) stays untouched.
async function createAccountForAnotherUser(currency: string, balance: number): Promise<string> {
  const user = buildUser();
  const credentials = { username: user.username, password: user.password };
  const jsonHeaders = { 'Content-Type': 'application/json' };

  const registerRes = await fetch(`${baseURL}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  if (registerRes.status !== 201) {
    throw new Error(`Other user registration failed with status ${registerRes.status}`);
  }

  const loginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  const { token } = (await loginRes.json()) as { token: string };

  const accountRes = await fetch(`${baseURL}/accounts`, {
    method: 'POST',
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currency, initialBalance: balance }),
  });
  if (accountRes.status !== 201) {
    throw new Error(`Other user account creation failed with status ${accountRes.status}`);
  }
  const account = (await accountRes.json()) as { id: string };
  return account.id;
}

// ---------- Given ----------

Given('an account exists with currency {string} and balance {int}', async ({ apiClient, ctx }, currency: string, balance: number) => {
  await apiClient.post('/accounts', { currency, initialBalance: balance });
  await apiClient.expectStatus(201);
  const body = await apiClient.bodyAs<{ id: string }>();
  ctx.accountId = body.id;
});

Given('another user owns an account with currency {string} and balance {int}', async ({ ctx }, currency: string, balance: number) => {
  ctx.otherAccountId = await createAccountForAnotherUser(currency, balance);
});

// ---------- When ----------

When('I create an account with currency {string} and balance {int}', async ({ apiClient, ctx }, currency: string, balance: number) => {
  await apiClient.post('/accounts', { currency, initialBalance: balance });
  const body = await apiClient.bodyAs<{ id?: string }>();
  if (body?.id) {
    ctx.accountId = body.id;
  }
});

When('I fetch the account', async ({ apiClient, ctx }) => {
  await apiClient.get(`/accounts/${ctx.accountId}`);
});

When('I fetch an account that does not exist', async ({ apiClient }) => {
  await apiClient.get(`/accounts/${randomUUID()}`);
});

When("I fetch another user's account", async ({ apiClient, ctx }) => {
  await apiClient.get(`/accounts/${ctx.otherAccountId}`);
});

When('I fetch the account ledger', async ({ apiClient, ctx }) => {
  await apiClient.get(`/accounts/${ctx.accountId}/ledger`);
});

// ---------- Then ----------

Then('the response should match the account contract', async ({ apiClient }) => {
  const body = await apiClient.bodyAs<unknown>();
  accountSchema.parse(body);
});

Then('the account balance should be {int}', async ({ apiClient }, expected: number) => {
  const body = await apiClient.bodyAs<{ balance: number }>();
  if (body.balance !== expected) {
    throw new Error(`Expected balance ${expected} but got ${body.balance}`);
  }
});
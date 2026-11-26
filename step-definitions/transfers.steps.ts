import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'node:crypto';
import { test } from '../fixtures/index';
import { transferSchema } from '../contracts/transfer.contract';

const { Given, When, Then } = createBdd(test);

// Every transfer request needs a fresh idempotency key
const newKey = () => ({ 'Idempotency-Key': randomUUID() });

// ---------- Given ----------

Given('a source account exists with currency {string} and balance {int}', async ({ apiClient, ctx }, currency: string, balance: number) => {
  await apiClient.post('/accounts', { currency, initialBalance: balance });
  await apiClient.expectStatus(201);
  const body = await apiClient.bodyAs<{ id: string }>();
  ctx.fromAccountId = body.id;
});

Given('a destination account exists with currency {string} and balance {int}', async ({ apiClient, ctx }, currency: string, balance: number) => {
  await apiClient.post('/accounts', { currency, initialBalance: balance });
  await apiClient.expectStatus(201);
  const body = await apiClient.bodyAs<{ id: string }>();
  ctx.toAccountId = body.id;
});

// ---------- When ----------

When('I transfer {float} from the source to the destination account', async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post(
    '/transfers',
    { fromAccountId: ctx.fromAccountId, toAccountId: ctx.toAccountId, amount },
    newKey(),
  );
  const body = await apiClient.bodyAs<{ id?: string }>();
  if (body?.id) {
    ctx.transferId = body.id;
  }
});

When('I transfer {float} from the source account to itself', async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post(
    '/transfers',
    { fromAccountId: ctx.fromAccountId, toAccountId: ctx.fromAccountId, amount },
    newKey(),
  );
});

When('I transfer {float} from the source account to an unknown account', async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post(
    '/transfers',
    { fromAccountId: ctx.fromAccountId, toAccountId: randomUUID(), amount },
    newKey(),
  );
});

When("I transfer {float} from another user's account to the destination account", async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post(
    '/transfers',
    { fromAccountId: ctx.otherAccountId, toAccountId: ctx.toAccountId, amount },
    newKey(),
  );
});

When('I send a transfer request without the required fields', async ({ apiClient }) => {
  await apiClient.post('/transfers', {}, newKey());
});

When('I fetch the transfer', async ({ apiClient, ctx }) => {
  await apiClient.get(`/transfers/${ctx.transferId}`);
});

When('I fetch the ledger of the source account', async ({ apiClient, ctx }) => {
  await apiClient.get(`/accounts/${ctx.fromAccountId}/ledger`);
});

When('I fetch the ledger of the destination account', async ({ apiClient, ctx }) => {
  await apiClient.get(`/accounts/${ctx.toAccountId}/ledger`);
});

// ---------- Then ----------

Then('the response should match the transfer contract', async ({ apiClient }) => {
  const body = await apiClient.bodyAs<unknown>();
  transferSchema.parse(body);
});

Then('the balance of the source account should be {int}', async ({ apiClient, ctx }, expected: number) => {
  await apiClient.get(`/accounts/${ctx.fromAccountId}`);
  const body = await apiClient.bodyAs<{ balance: number }>();
  if (body.balance !== expected) {
    throw new Error(`Expected source balance ${expected} but got ${body.balance}`);
  }
});

Then('the balance of the destination account should be {int}', async ({ apiClient, ctx }, expected: number) => {
  await apiClient.get(`/accounts/${ctx.toAccountId}`);
  const body = await apiClient.bodyAs<{ balance: number }>();
  if (body.balance !== expected) {
    throw new Error(`Expected destination balance ${expected} but got ${body.balance}`);
  }
});

Then('the ledger should contain at least one entry', async ({ apiClient }) => {
  const body = await apiClient.bodyAs<{ entries: unknown[] }>();
  if (!Array.isArray(body.entries) || body.entries.length < 1) {
    throw new Error('Expected the ledger to contain at least one entry');
  }
});
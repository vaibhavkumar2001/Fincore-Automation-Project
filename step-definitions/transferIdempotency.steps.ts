import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';

const { When, Then } = createBdd(test);

type TransferBody = { id: string };

// ---------- When ----------

// Remembers key and body in ctx, so the exact same request can be repeated later
When(
  'I transfer {float} from the source to the destination account with a new idempotency key',
  async ({ apiClient, ctx }, amount: number) => {
    ctx.idempotencyKey = randomUUID();
    ctx.requestBody = {
      fromAccountId: ctx.fromAccountId,
      toAccountId: ctx.toAccountId,
      amount,
    };
    await apiClient.post('/transfers', ctx.requestBody, { 'Idempotency-Key': ctx.idempotencyKey });

    // Remember the first transfer id, only if the request succeeded
    if (apiClient.response?.status() === 201) {
      ctx.transferId = apiClient.bodyAs<TransferBody>().id;
    }
  },
);

When('I repeat the transfer request with the same idempotency key and the same body', async ({ apiClient, ctx }) => {
  await apiClient.post('/transfers', ctx.requestBody, { 'Idempotency-Key': ctx.idempotencyKey! });
});

When('I repeat the transfer request with the same idempotency key and amount {float}', async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post('/transfers', { ...(ctx.requestBody as object), amount }, { 'Idempotency-Key': ctx.idempotencyKey! });
});

When('I send the same transfer again with a new idempotency key', async ({ apiClient, ctx }) => {
  await apiClient.post('/transfers', ctx.requestBody, { 'Idempotency-Key': randomUUID() });
});

When('I send a transfer of {float} without an idempotency key', async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post('/transfers', {
    fromAccountId: ctx.fromAccountId,
    toAccountId: ctx.toAccountId,
    amount,
  });
});

// ---------- Then ----------

Then('the transfer id should be the same as the first one', async ({ apiClient, ctx }) => {
  expect(apiClient.bodyAs<TransferBody>().id).toBe(ctx.transferId);
});

Then('the transfer id should differ from the first one', async ({ apiClient, ctx }) => {
  expect(apiClient.bodyAs<TransferBody>().id).not.toBe(ctx.transferId);
});
import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';
import type { Ctx } from '../fixtures';
import type { ApiClient } from '../api/apiClient';

const { Given, When, Then } = createBdd(test);

type PaymentBody = { id: string; status: string };

// Every POST needs a fresh idempotency key, otherwise the replay logic would kick in
const newKey = () => ({ 'Idempotency-Key': randomUUID() });

// Moves the existing payment (status "created") to the requested state via the real API
async function moveToState(apiClient: ApiClient, ctx: Ctx, state: string) {
  if (state === 'created') return;

  if (state === 'captured' || state === 'refunded') {
    await apiClient.post(`/payments/${ctx.paymentId}/capture`, undefined, newKey());
    await apiClient.expectStatus(200);
  }
  if (state === 'refunded') {
    await apiClient.post(`/payments/${ctx.paymentId}/refund`, undefined, newKey());
    await apiClient.expectStatus(200);
  }
  if (!['created', 'captured', 'refunded'].includes(state)) {
    throw new Error(`Unknown payment state in feature file: ${state}`);
  }
}

// ---------- Given ----------

Given('the payment is in the {string} state', async ({ apiClient, ctx }, state: string) => {
  await moveToState(apiClient, ctx, state);
});

// ---------- When ----------

When('I perform the {string} action on the payment', async ({ apiClient, ctx }, action: string) => {
  await apiClient.post(`/payments/${ctx.paymentId}/${action}`, undefined, newKey());
});

When('I perform the {string} action on an unknown payment', async ({ apiClient }, action: string) => {
  await apiClient.post(`/payments/${randomUUID()}/${action}`, undefined, newKey());
});

When('I fetch an unknown payment', async ({ apiClient }) => {
  await apiClient.get(`/payments/${randomUUID()}`);
});

// ---------- Then ----------

// Fetches the payment again from the server, so we verify the stored state
// and not just what the last response said.
Then('the stored payment status should be {string}', async ({ apiClient, ctx }, expected: string) => {
  await apiClient.get(`/payments/${ctx.paymentId}`);
  await apiClient.expectStatus(200);
  expect(apiClient.bodyAs<PaymentBody>().status).toBe(expected);
});
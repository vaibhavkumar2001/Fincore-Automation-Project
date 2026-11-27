import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';

const { When, Then } = createBdd(test);

type PaymentBody = { id: string; status: string; amount: number };

// ---------- When ----------

// Remembers the key in ctx so the same request can be repeated later
When('I capture the payment with a new idempotency key', async ({ apiClient, ctx }) => {
  ctx.idempotencyKey = randomUUID();
  await apiClient.post(`/payments/${ctx.paymentId}/capture`, undefined, { 'Idempotency-Key': ctx.idempotencyKey });
});

When('I repeat the capture request with the same idempotency key', async ({ apiClient, ctx }) => {
  await apiClient.post(`/payments/${ctx.paymentId}/capture`, undefined, { 'Idempotency-Key': ctx.idempotencyKey! });
});

// Same key, but a different endpoint path: must be treated as a separate request
When('I capture the payment using the idempotency key of the creation request', async ({ apiClient, ctx }) => {
  await apiClient.post(`/payments/${ctx.paymentId}/capture`, undefined, { 'Idempotency-Key': ctx.idempotencyKey! });
});

When('I repeat the create request with the same idempotency key and currency {string}', async ({ apiClient, ctx }, currency: string) => {
  await apiClient.post('/payments', { ...ctx.requestBody, currency }, { 'Idempotency-Key': ctx.idempotencyKey! });
});

// Does not overwrite ctx.paymentId, so we can still compare with the first payment
When('I create another payment with a new idempotency key and the same body', async ({ apiClient, ctx }) => {
  await apiClient.post('/payments', ctx.requestBody, { 'Idempotency-Key': randomUUID() });
});

// ---------- Then ----------

Then('the response should not be marked as replayed', async ({ apiClient }) => {
  // Playwright returns header names in lower case
  const headers = apiClient.response!.headers();
  expect(headers['idempotent-replayed']).toBeUndefined();
});

Then('the payment id should differ from the first one', async ({ apiClient, ctx }) => {
  expect(apiClient.bodyAs<PaymentBody>().id).not.toBe(ctx.paymentId);
});

// Fetches the payment again, so we verify the stored data and not the last response
Then('the stored payment amount should be {int}', async ({ apiClient, ctx }, expected: number) => {
  await apiClient.get(`/payments/${ctx.paymentId}`);
  await apiClient.expectStatus(200);
  expect(apiClient.bodyAs<PaymentBody>().amount).toBe(expected);
});
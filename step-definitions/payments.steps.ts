import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

type PaymentBody = { id: string; status: string };

// Reusable helper: creates a payment and remembers the key, body and id
async function createPayment(
  apiClient: InstanceType<typeof import('../api/apiClient').ApiClient>,
  ctx: { idempotencyKey?: string; paymentId?: string; requestBody?: Record<string, unknown> },
  amount: number,
  currency: string,
) {
  ctx.idempotencyKey = randomUUID();
  ctx.requestBody = { accountId: 'acc_1', amount, currency };

  await apiClient.post('/payments', ctx.requestBody, { 'Idempotency-Key': ctx.idempotencyKey });

  if (apiClient.response?.status() === 201) {
    ctx.paymentId = apiClient.bodyAs<PaymentBody>().id;
  }
}

Given('a payment exists with amount {float} and currency {string}', async ({ apiClient, ctx }, amount: number, currency: string) => {
  await createPayment(apiClient, ctx, amount, currency);
  await apiClient.expectStatus(201);
});

When('I create a payment with amount {float} and currency {string}', async ({ apiClient, ctx }, amount: number, currency: string) => {
  await createPayment(apiClient, ctx, amount, currency);
});

When('I create a payment without an idempotency key', async ({ apiClient }) => {
  await apiClient.post('/payments', { accountId: 'acc_1', amount: 5000, currency: 'INR' });
});

When('I capture the payment', async ({ apiClient, ctx }) => {
  await apiClient.post(`/payments/${ctx.paymentId}/capture`, undefined, { 'Idempotency-Key': randomUUID() });
});

When('I refund the payment', async ({ apiClient, ctx }) => {
  await apiClient.post(`/payments/${ctx.paymentId}/refund`, undefined, { 'Idempotency-Key': randomUUID() });
});

When('I repeat the create request with the same idempotency key and the same body', async ({ apiClient, ctx }) => {
  await apiClient.post('/payments', ctx.requestBody, { 'Idempotency-Key': ctx.idempotencyKey! });
});

When('I repeat the create request with the same idempotency key and amount {float}', async ({ apiClient, ctx }, amount: number) => {
  await apiClient.post('/payments', { ...ctx.requestBody, amount }, { 'Idempotency-Key': ctx.idempotencyKey! });
});

Then('the response header {string} should equal {string}', async ({ apiClient }, name: string, value: string) => {
  await apiClient.expectHeader(name, value);
});

Then('the replayed payment should be the same as the first one', async ({ apiClient, ctx }) => {
  expect(apiClient.bodyAs<PaymentBody>().id).toBe(ctx.paymentId);
});
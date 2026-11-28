import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';

const { When, Then } = createBdd(test);

const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000';

type PaymentBody = { id: string };

// ---------- When ----------

// The victim creates a payment with a known idempotency key
When('I create a payment with a known idempotency key', async ({ apiClient, ctx }) => {
  ctx.idempotencyKey = randomUUID();
  ctx.requestBody = { accountId: 'acc-shared-body', amount: 5000, currency: 'INR' };

  await apiClient.post('/payments', ctx.requestBody, { 'Idempotency-Key': ctx.idempotencyKey });
  await apiClient.expectStatus(201);
  ctx.paymentId = apiClient.bodyAs<PaymentBody>().id;
});

// The attacker sends the same body with the victim's idempotency key
When('the attacker replays the same payment request with the victim key', async ({ ctx }) => {
  const res = await fetch(`${baseURL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.otherToken}`,
      'Idempotency-Key': ctx.idempotencyKey!,
    },
    body: JSON.stringify(ctx.requestBody),
  });

  let body: any = undefined;
  try {
    body = await res.json();
  } catch {
    // Empty or non-JSON body: leave undefined
  }
  ctx.otherResult = {
    status: res.status,
    body: { ...body, __replayed: res.headers.get('idempotent-replayed') },
  };
});

// ---------- Then ----------

Then('the attacker should not receive the victim payment', async ({ ctx }) => {
  const body = ctx.otherResult?.body;
  expect(body?.id, 'Attacker received the victim payment through idempotency replay').not.toBe(ctx.paymentId);
});

Then('the attacker response should not be a replay', async ({ ctx }) => {
  expect(ctx.otherResult?.body?.__replayed, 'Attacker got a replayed response from another user').toBeNull();
});

Then('the attacker request should create their own payment', async ({ ctx }) => {
  expect(ctx.otherResult?.status).toBe(201);
});
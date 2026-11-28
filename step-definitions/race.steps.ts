import { createBdd } from 'playwright-bdd';
import { randomUUID } from 'crypto';
import { test, expect } from '../fixtures';
import { buildUser } from '../data/userFactory';

const { Given, When, Then } = createBdd(test);

// Race tests talk to the slow server (port 3001) using plain fetch,
// so the regular apiClient (port 3000) stays untouched.
const raceBase = process.env.RACE_API_BASE_URL ?? 'http://localhost:3001';

async function raceFetch(method: string, path: string, token: string, body?: unknown, key?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (key) headers['Idempotency-Key'] = key;

  const res = await fetch(`${raceBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function createRaceAccount(token: string, balance: number): Promise<string> {
  const res = await raceFetch('POST', '/accounts', token, { currency: 'USD', initialBalance: balance });
  if (res.status !== 201) {
    throw new Error(`Race account creation failed with status ${res.status}`);
  }
  return res.body.id as string;
}

// Fires all requests at the same moment and waits for every response
async function fireParallel(count: number, makeRequest: () => Promise<{ status: number; body: any }>) {
  return Promise.all(Array.from({ length: count }, () => makeRequest()));
}

// ---------- Given ----------

Given('a user is logged in on the race server', async ({ ctx }) => {
  const user = buildUser();
  const credentials = { username: user.username, password: user.password };
  const jsonHeaders = { 'Content-Type': 'application/json' };

  const registerRes = await fetch(`${raceBase}/auth/register`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  if (registerRes.status !== 201) {
    throw new Error(`Race user registration failed with status ${registerRes.status}`);
  }

  const loginRes = await fetch(`${raceBase}/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
  const { token } = (await loginRes.json()) as { token: string };
  ctx.raceToken = token;
});

Given('a race source account exists with balance {int}', async ({ ctx }, balance: number) => {
  ctx.fromAccountId = await createRaceAccount(ctx.raceToken!, balance);
});

Given('a race destination account exists with balance {int}', async ({ ctx }, balance: number) => {
  ctx.toAccountId = await createRaceAccount(ctx.raceToken!, balance);
});

// ---------- When ----------

When('I send {int} parallel transfers of {int} with different idempotency keys', async ({ ctx }, count: number, amount: number) => {
  ctx.raceResults = await fireParallel(count, () =>
    raceFetch(
      'POST',
      '/transfers',
      ctx.raceToken!,
      { fromAccountId: ctx.fromAccountId, toAccountId: ctx.toAccountId, amount },
      randomUUID(),
    ),
  );
});

When('I send {int} parallel transfers of {int} with the same idempotency key', async ({ ctx }, count: number, amount: number) => {
  const sharedKey = randomUUID();
  ctx.raceResults = await fireParallel(count, () =>
    raceFetch(
      'POST',
      '/transfers',
      ctx.raceToken!,
      { fromAccountId: ctx.fromAccountId, toAccountId: ctx.toAccountId, amount },
      sharedKey,
    ),
  );
});

// ---------- Then ----------

Then('exactly {int} of the parallel transfers should succeed', async ({ ctx }, expected: number) => {
  const statuses = ctx.raceResults!.map((r) => r.status);
  const successCount = statuses.filter((s) => s === 201).length;
  expect(successCount, `Statuses received: ${statuses.join(', ')}`).toBe(expected);
});

Then('all other parallel transfers should be rejected with insufficient funds', async ({ ctx }) => {
  const others = ctx.raceResults!.filter((r) => r.status !== 201);
  for (const r of others) {
    expect(r.status).toBe(422);
  }
});

Then('the race source balance should be {int}', async ({ ctx }, expected: number) => {
  const res = await raceFetch('GET', `/accounts/${ctx.fromAccountId}`, ctx.raceToken!);
  expect(res.body.balance).toBe(expected);
});

Then('the race source balance should never be negative', async ({ ctx }) => {
  const res = await raceFetch('GET', `/accounts/${ctx.fromAccountId}`, ctx.raceToken!);
  expect(res.body.balance, 'Source balance went below zero (double spend)').toBeGreaterThanOrEqual(0);
});

Then('the race source ledger debits should total {int}', async ({ ctx }, expected: number) => {
  const res = await raceFetch('GET', `/accounts/${ctx.fromAccountId}/ledger`, ctx.raceToken!);
  const entries = res.body.entries as { type: string; amount: number }[];
  const debitTotal = entries.filter((e) => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
  expect(debitTotal).toBe(expected);
});

Then('all successful parallel responses should return the same transfer id', async ({ ctx }) => {
  const ids = new Set(ctx.raceResults!.filter((r) => r.status === 201).map((r) => r.body.id));
  expect(ids.size, `Distinct transfer ids: ${[...ids].join(', ')}`).toBe(1);
});

// ---------- Ledger invariants (Step 6D) ----------

type LedgerEntry = { type: string; amount: number; transferId: string };

async function fetchLedger(ctx: { raceToken?: string }, accountId: string): Promise<LedgerEntry[]> {
  const res = await raceFetch('GET', `/accounts/${accountId}/ledger`, ctx.raceToken!);
  return res.body.entries as LedgerEntry[];
}

const sumByType = (entries: LedgerEntry[], type: string) =>
  entries.filter((e) => e.type === type).reduce((sum, e) => sum + e.amount, 0);

Given('I note the combined balance of both race accounts', async ({ ctx }) => {
  const from = await raceFetch('GET', `/accounts/${ctx.fromAccountId}`, ctx.raceToken!);
  const to = await raceFetch('GET', `/accounts/${ctx.toAccountId}`, ctx.raceToken!);
  ctx.raceStartTotal = from.body.balance + to.body.balance;
});

Then('the combined balance of both race accounts should be unchanged', async ({ ctx }) => {
  const from = await raceFetch('GET', `/accounts/${ctx.fromAccountId}`, ctx.raceToken!);
  const to = await raceFetch('GET', `/accounts/${ctx.toAccountId}`, ctx.raceToken!);
  expect(from.body.balance + to.body.balance, 'Money was created or destroyed').toBe(ctx.raceStartTotal);
});

Then('the source debits should equal the destination credits', async ({ ctx }) => {
  const debits = sumByType(await fetchLedger(ctx, ctx.fromAccountId!), 'debit');
  const credits = sumByType(await fetchLedger(ctx, ctx.toAccountId!), 'credit');
  expect(debits, 'Total debits and total credits must match').toBe(credits);
});

Then('every successful parallel transfer should have one debit and one credit', async ({ ctx }) => {
  const successIds = ctx.raceResults!.filter((r) => r.status === 201).map((r) => r.body.id as string);
  const sourceEntries = await fetchLedger(ctx, ctx.fromAccountId!);
  const destEntries = await fetchLedger(ctx, ctx.toAccountId!);

  for (const id of successIds) {
    const debitCount = sourceEntries.filter((e) => e.transferId === id && e.type === 'debit').length;
    const creditCount = destEntries.filter((e) => e.transferId === id && e.type === 'credit').length;
    expect(debitCount, `Transfer ${id} debit entries`).toBe(1);
    expect(creditCount, `Transfer ${id} credit entries`).toBe(1);
  }
});
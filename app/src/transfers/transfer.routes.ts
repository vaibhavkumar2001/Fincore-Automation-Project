import { Router } from 'express';
import { randomUUID } from 'crypto';
import { idempotency } from '../middleware/idempotency';
import { accounts, ledger } from '../accounts/account.store';
import { withAccountLocks } from '../accounts/account.lock';

interface Transfer {
  id: string;
  owner: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: 'completed';
  createdAt: string;
}

const router = Router();
const transfers = new Map<string, Transfer>();

// Simulates database latency. Controlled by the TRANSFER_DELAY_MS env variable.
// Default is 0, so normal tests run at full speed and without any extra await.
async function simulateLatency(): Promise<void> {
  const delayMs = Number(process.env.TRANSFER_DELAY_MS ?? 0);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

router.post('/', idempotency, async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body ?? {};

  if (typeof fromAccountId !== 'string' || typeof toAccountId !== 'string') {
    return res.status(400).json({ error: 'fromAccountId and toAccountId are required' });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive integer (minor units)' });
  }
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: 'Cannot transfer to the same account' });
  }

  const from = accounts.get(fromAccountId);
  const to = accounts.get(toAccountId);
  if (!from || !to) {
    return res.status(404).json({ error: 'Account not found' });
  }
  if (from.owner !== res.locals.username) {
    return res.status(403).json({ error: 'You do not own the source account' });
  }
  if (from.currency !== to.currency) {
    return res.status(400).json({ error: 'Currency mismatch between accounts' });
  }

  // FIX (Day 6): the balance check and the money movement now run inside one
  // lock, so parallel requests can no longer pass the check at the same time.
  const outcome = await withAccountLocks([fromAccountId, toAccountId], async () => {
    if (from.balance < amount) {
      return { ok: false as const };
    }

    // The latency is still simulated, but now it happens while holding the lock
    await simulateLatency();

    from.balance -= amount;
    to.balance += amount;

    const transfer: Transfer = {
      id: randomUUID(),
      owner: res.locals.username,
      fromAccountId,
      toAccountId,
      amount,
      currency: from.currency,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    transfers.set(transfer.id, transfer);

    // Double-entry ledger: every transfer writes one debit and one credit
    const createdAt = transfer.createdAt;
    ledger.push(
      { id: randomUUID(), accountId: fromAccountId, transferId: transfer.id, type: 'debit', amount, createdAt },
      { id: randomUUID(), accountId: toAccountId, transferId: transfer.id, type: 'credit', amount, createdAt },
    );

    return { ok: true as const, transfer };
  });

  if (!outcome.ok) {
    return res.status(422).json({ error: 'Insufficient funds' });
  }
  return res.status(201).json(outcome.transfer);
});

router.get('/:id', (req, res) => {
  const transfer = transfers.get(String(req.params.id));
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.owner !== res.locals.username) {
    return res.status(403).json({ error: 'You do not own this transfer' });
  }
  return res.status(200).json(transfer);
});

export default router;
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { accounts, ledger, Account } from './account.store';

const router = Router();

// Create an account for the logged-in user
// initialBalance is a test-only shortcut so tests can set up funded accounts quickly
router.post('/', (req, res) => {
  const { currency, initialBalance = 0 } = req.body ?? {};

  if (typeof currency !== 'string' || currency.length !== 3) {
    return res.status(400).json({ error: 'currency must be a 3-letter code' });
  }
  if (!Number.isInteger(initialBalance) || initialBalance < 0) {
    return res.status(400).json({ error: 'initialBalance must be a non-negative integer (minor units)' });
  }

  const account: Account = {
    id: randomUUID(),
    owner: res.locals.username,
    currency,
    balance: initialBalance,
    createdAt: new Date().toISOString(),
  };
  accounts.set(account.id, account);
  return res.status(201).json(account);
});

// Get an account (only its owner can see it)
router.get('/:id', (req, res) => {
  const account = accounts.get(String(req.params.id));
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.owner !== res.locals.username) {
    return res.status(403).json({ error: 'You do not own this account' });
  }
  return res.status(200).json(account);
});

// Ledger entries of an account (used later to verify debit = credit)
router.get('/:id/ledger', (req, res) => {
  const account = accounts.get(String(req.params.id));
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.owner !== res.locals.username) {
    return res.status(403).json({ error: 'You do not own this account' });
  }
  const entries = ledger.filter((entry) => entry.accountId === account.id);
  return res.status(200).json({ entries });
});

export default router;
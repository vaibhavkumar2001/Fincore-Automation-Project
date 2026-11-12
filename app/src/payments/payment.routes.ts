import { Router } from 'express';
import { randomUUID } from 'crypto';
import { idempotency } from '../middleware/idempotency';
import { Payment, PaymentStatus, ALLOWED_TRANSITIONS } from './payment.types';

const router = Router();
const payments = new Map<string, Payment>();

function transition(payment: Payment, next: PaymentStatus): boolean {
  if (!ALLOWED_TRANSITIONS[payment.status].includes(next)) return false;
  payment.status = next;
  return true;
}

// Create a payment
router.post('/', idempotency, (req, res) => {
  const { accountId, amount, currency } = req.body ?? {};

  if (!accountId || !currency) {
    return res.status(400).json({ error: 'accountId and currency are required' });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive integer (minor units)' });
  }

  const payment: Payment = {
    id: randomUUID(),
    accountId,
    amount,
    currency,
    status: 'created',
    createdAt: new Date().toISOString(),
  };
  payments.set(payment.id, payment);
  return res.status(201).json(payment);
});

// Capture a payment
router.post('/:id/capture', idempotency, (req, res) => {
  const payment = payments.get(String(req.params.id));
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  if (!transition(payment, 'captured')) {
    return res.status(409).json({ error: `Cannot capture a payment in '${payment.status}' state` });
  }
  return res.status(200).json(payment);
});

// Refund a payment
router.post('/:id/refund', idempotency, (req, res) => {
  const payment = payments.get(String(req.params.id));
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  if (!transition(payment, 'refunded')) {
    return res.status(409).json({ error: `Cannot refund a payment in '${payment.status}' state` });
  }
  return res.status(200).json(payment);
});

// Get a payment by id
router.get('/:id', (req, res) => {
  const payment = payments.get(String(req.params.id));
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  return res.status(200).json(payment);
});

export default router;
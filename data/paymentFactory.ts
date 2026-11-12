import { randomInt } from 'crypto';

export type PaymentInput = {
  accountId: string;
  amount: number;
  currency: string;
};

// Builds a unique valid payment body; any field can be overridden per test
export function buildPayment(overrides: Partial<PaymentInput> = {}): PaymentInput {
  return {
    accountId: `acc_${randomInt(1000, 9999)}`,
    amount: randomInt(100, 100000),
    currency: 'INR',
    ...overrides,
  };
}
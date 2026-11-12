// Amounts are always integers in minor units (e.g. paise) to avoid float errors
export type PaymentStatus = 'created' | 'captured' | 'refunded';

export interface Payment {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

// Single source of truth for which transitions are legal
export const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  created: ['captured'],
  captured: ['refunded'],
  refunded: [],
};
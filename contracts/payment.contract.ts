import { z } from 'zod';

// strict() makes the test fail if the API returns any unexpected extra field
export const paymentSchema = z
  .object({
    id: z.string().uuid(),
    accountId: z.string(),
    amount: z.number().int().positive(),
    currency: z.string().length(3),
    status: z.enum(['created', 'captured', 'refunded']),
    createdAt: z.string().datetime(),
  })
  .strict();

export const errorSchema = z
  .object({
    error: z.string().min(1),
  })
  .strict();
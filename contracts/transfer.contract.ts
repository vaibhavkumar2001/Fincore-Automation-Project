import { z } from 'zod';

// Strict contract for a completed transfer
export const transferSchema = z
  .object({
    id: z.string().min(1),
    owner: z.string().min(1),
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().length(3),
    status: z.literal('completed'),
    createdAt: z.string().datetime(),
  })
  .strict();

export type Transfer = z.infer<typeof transferSchema>;
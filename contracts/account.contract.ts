import { z } from 'zod';

// Strict contract: any unexpected field will fail the test
export const accountSchema = z
  .object({
    id: z.string().min(1),
    owner: z.string().min(1),
    currency: z.string().length(3),
    balance: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type Account = z.infer<typeof accountSchema>;
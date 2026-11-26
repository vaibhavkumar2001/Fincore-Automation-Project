import { randomUUID } from 'crypto';

export type UserInput = {
  username: string;
  password: string;
};

// Builds a unique user so tests never collide on username
export function buildUser(overrides: Partial<UserInput> = {}): UserInput {
  return {
    username: `qa_${randomUUID().slice(0, 8)}`,
    password: 'Passw0rd!123',
    ...overrides,
  };
}
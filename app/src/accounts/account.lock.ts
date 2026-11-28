// Simple in-memory mutex per account id.
// Each account has a promise "tail"; a new caller waits for the previous one to finish.
const tails = new Map<string, Promise<void>>();

async function acquire(accountId: string): Promise<() => void> {
  const previous = tails.get(accountId) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  // The next caller will wait for "current", which finishes when we release
  const tail = previous.then(() => current);
  tails.set(accountId, tail);

  await previous;

  return () => {
    release();
    // Cleanup: remove the entry if nobody queued behind us
    if (tails.get(accountId) === tail) {
      tails.delete(accountId);
    }
  };
}

// Runs "work" while holding locks on all given accounts.
// Locks are always taken in sorted order to avoid deadlocks.
export async function withAccountLocks<T>(accountIds: string[], work: () => Promise<T>): Promise<T> {
  const sortedIds = [...new Set(accountIds)].sort();
  const releases: (() => void)[] = [];

  try {
    for (const id of sortedIds) {
      releases.push(await acquire(id));
    }
    return await work();
  } finally {
    for (const release of releases.reverse()) {
      release();
    }
  }
}
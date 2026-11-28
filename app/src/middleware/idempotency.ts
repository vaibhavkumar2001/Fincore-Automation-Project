import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

interface StoredResponse {
  requestHash: string;
  statusCode: number;
  body: unknown;
}

// A reserved key: the first request is still running, others wait for it
interface InFlight {
  requestHash: string;
  done: Promise<StoredResponse | null>;
  finish: (result: StoredResponse | null) => void;
}

const store = new Map<string, StoredResponse>();
const inFlight = new Map<string, InFlight>();

const hashBody = (body: unknown): string =>
  createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');

function replay(res: Response, stored: StoredResponse) {
  res.setHeader('Idempotent-Replayed', 'true');
  return res.status(stored.statusCode).json(stored.body);
}

export async function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.header('Idempotency-Key');
  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  // Scope the key per route so the same key cannot collide across endpoints
  const storeKey = `${req.method}:${req.path}:${key}`;
  const requestHash = hashBody(req.body);

  // Case 1: a finished response exists for this key
  const existing = store.get(storeKey);
  if (existing) {
    // Same key but a different payload is a client bug, so reject it
    if (existing.requestHash !== requestHash) {
      return res.status(422).json({ error: 'Idempotency-Key reused with a different request body' });
    }
    return replay(res, existing);
  }

  // Case 2: the first request with this key is still running, so wait for it
  const running = inFlight.get(storeKey);
  if (running) {
    if (running.requestHash !== requestHash) {
      return res.status(422).json({ error: 'Idempotency-Key reused with a different request body' });
    }
    const result = await running.done;
    if (result) {
      return replay(res, result);
    }
    // The first request never produced a response, so tell the client to retry
    return res.status(409).json({ error: 'The original request with this Idempotency-Key did not complete, retry' });
  }

  // Case 3: first time we see this key, so reserve it before doing any work
  let finish!: (result: StoredResponse | null) => void;
  const done = new Promise<StoredResponse | null>((resolve) => {
    finish = resolve;
  });
  inFlight.set(storeKey, { requestHash, done, finish });

  // Capture the response so we can store it for future replays
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    // Store a deep copy (snapshot), so later changes to the live object
    // cannot alter the cached response
    const stored: StoredResponse = {
      requestHash,
      statusCode: res.statusCode,
      body: structuredClone(body),
    };
    store.set(storeKey, stored);
    inFlight.delete(storeKey);
    finish(stored);
    return originalJson(body);
  };

  // Safety net: if the connection closes without a response, release the waiters
  res.on('close', () => {
    if (inFlight.get(storeKey)?.done === done) {
      inFlight.delete(storeKey);
      finish(null);
    }
  });

  next();
}
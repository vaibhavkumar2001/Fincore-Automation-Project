import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

interface StoredResponse {
  requestHash: string;
  statusCode: number;
  body: unknown;
}

const store = new Map<string, StoredResponse>();

const hashBody = (body: unknown): string =>
  createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');

export function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.header('Idempotency-Key');
  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  // Scope the key per route so the same key cannot collide across endpoints
  const storeKey = `${req.method}:${req.path}:${key}`;
  const requestHash = hashBody(req.body);
  const existing = store.get(storeKey);

  if (existing) {
    // Same key but a different payload is a client bug, so reject it
    if (existing.requestHash !== requestHash) {
      return res.status(422).json({ error: 'Idempotency-Key reused with a different request body' });
    }
    // Same key and same payload: replay the original response
    res.setHeader('Idempotent-Replayed', 'true');
    return res.status(existing.statusCode).json(existing.body);
  }

  // Capture the response so we can store it for future replays
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    store.set(storeKey, { requestHash, statusCode: res.statusCode, body });
    return originalJson(body);
  };

  next();
}
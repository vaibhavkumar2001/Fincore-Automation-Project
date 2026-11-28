import { Request, Response, NextFunction } from 'express';

interface TokenRecord {
  username: string;
  expiresAt: number;
}

// token -> record with expiry (in-memory, demo only)
export const tokens = new Map<string, TokenRecord>();

// Token lifetime in milliseconds. Default: 1 hour. Overridable for tests.
export function tokenTtlMs(): number {
  const ttl = Number(process.env.TOKEN_TTL_MS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 60 * 60 * 1000;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice('Bearer '.length);
  const record = tokens.get(token);

  if (!record) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Expired tokens are removed and rejected
  if (Date.now() >= record.expiresAt) {
    tokens.delete(token);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.locals.username = record.username;
  next();
}
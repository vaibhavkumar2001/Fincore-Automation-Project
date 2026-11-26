import { Request, Response, NextFunction } from 'express';

// token -> username (in-memory, demo only)
export const tokens = new Map<string, string>();

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice('Bearer '.length);
  const username = tokens.get(token);

  if (!username) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.locals.username = username;
  next();
}
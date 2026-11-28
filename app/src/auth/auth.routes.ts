import { Router } from 'express';
import { randomUUID } from 'crypto';
import { tokens, tokenTtlMs } from '../middleware/auth';

const router = Router();

// username -> password (plain text is fine for a demo app under test)
const users = new Map<string, string>();

router.post('/register', (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || password.length < 8) {
    return res.status(400).json({ error: 'username and a password of at least 8 characters are required' });
  }
  if (users.has(username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  users.set(username, password);
  return res.status(201).json({ username });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  // Both fields must be strings. Otherwise "unknown user + missing password"
  // would compare undefined with undefined and wrongly succeed.
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const storedPassword = users.get(username);
  if (storedPassword === undefined || storedPassword !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = randomUUID();
    tokens.set(token, { username, expiresAt: Date.now() + tokenTtlMs() });
  return res.status(200).json({ token });
});

export default router;
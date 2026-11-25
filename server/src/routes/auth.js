import crypto from 'node:crypto';
import { Router } from 'express';
import { requireAuth, signToken } from '../middleware/auth.js';

function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function createAuthRouter() {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    const expectedUsername = process.env.AUTH_USERNAME;
    const expectedPassword = process.env.AUTH_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      return res.status(500).json({
        error: 'Server credentials (AUTH_USERNAME / AUTH_PASSWORD) are not configured in server/.env.',
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const validUser = safeEqual(username.trim(), expectedUsername);
    const validPass = safeEqual(password, expectedPassword);

    if (!validUser || !validPass) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = { username: expectedUsername };
    const token = signToken(user);

    return res.json({ token, user });
  });

  router.get('/me', requireAuth, (req, res) => {
    return res.json({ user: { username: req.user.username } });
  });

  return router;
}


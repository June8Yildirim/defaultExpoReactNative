import { Router } from 'express';
import { z } from 'zod';

import { refresh, signIn, signUp } from '../lib/firebase-auth-rest.js';
import { requireAuth } from '../middleware/auth.js';
import { createAuthRateLimit } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';

const credentials = z.object({
  email: z.email(),
  password: z.string().min(6).max(128),
});

/** A factory so each app (and each test) gets its own rate limiter. */
export function createAuthRouter() {
  const authRouter = Router();
  const rateLimit = createAuthRateLimit();

  authRouter.post('/register', rateLimit, validateBody(credentials), async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentials>;
    res.status(201).json(await signUp(email, password));
  });

  authRouter.post('/login', rateLimit, validateBody(credentials), async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentials>;
    res.json(await signIn(email, password));
  });

  // Contract used by the app's apiClient: POST { refreshToken } → { accessToken, refreshToken? }.
  authRouter.post(
    '/refresh',
    rateLimit,
    validateBody(z.object({ refreshToken: z.string().min(1) })),
    async (req, res) => {
      res.json(await refresh((req.body as { refreshToken: string }).refreshToken));
    },
  );

  authRouter.get('/me', requireAuth, (req, res) => {
    const { uid, email, email_verified: emailVerified, name, picture } = req.user!;
    res.json({ uid, email, emailVerified, name, picture });
  });

  return authRouter;
}

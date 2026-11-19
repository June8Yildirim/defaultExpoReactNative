import type { DecodedIdToken } from 'firebase-admin/auth';
import type { RequestHandler } from 'express';

import { firebaseAuth } from '../lib/firebase.js';
import { HttpError } from '../lib/http-error.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `requireAuth`: the verified Firebase ID token. */
      user?: DecodedIdToken;
    }
  }
}

/** Verifies `Authorization: Bearer <Firebase ID token>` and exposes the claims as `req.user`. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing bearer token'));
  }
  try {
    req.user = await firebaseAuth().verifyIdToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

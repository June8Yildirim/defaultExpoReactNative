import type { RequestHandler } from 'express';
import { z } from 'zod';

import { HttpError } from '../lib/http-error.js';

/** Validates and replaces `req.body` with the parsed value. */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new HttpError(400, 'Validation failed', z.flattenError(parsed.error)));
    }
    req.body = parsed.data;
    next();
  };
}

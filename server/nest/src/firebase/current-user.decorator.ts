import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';

import type { AuthenticatedRequest } from './firebase-auth.guard.js';

/** Injects the verified Firebase token claims. Use on routes behind `FirebaseAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DecodedIdToken =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

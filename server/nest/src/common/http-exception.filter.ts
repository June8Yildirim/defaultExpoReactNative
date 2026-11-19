import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import mongoose from 'mongoose';

/** Normalizes every error to `{ error, details? }`, the same shape the Express server returns. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        res.status(exception.getStatus()).json({ error: body });
        return;
      }
      const { error, message } = body as { error?: string; message?: string | string[] };
      // ValidationPipe puts the list of problems in `message`.
      const validation = Array.isArray(message);
      res.status(exception.getStatus()).json({
        error: validation ? 'Validation failed' : (message ?? error ?? exception.message),
        details: validation ? message : undefined,
      });
      return;
    }
    if (exception instanceof mongoose.Error.ValidationError) {
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Validation failed', details: exception.errors });
      return;
    }

    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
}

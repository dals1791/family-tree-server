import type { Context } from 'hono';
import { AppError } from '../lib/errors.js';

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as 400 | 401 | 403 | 404 | 409);
  }

  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
};

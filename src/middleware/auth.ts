import { createMiddleware } from 'hono/factory';
import { supabaseAdmin } from '../lib/supabase.js';
import { UnauthorizedError } from '../lib/errors.js';

export const authMiddleware = createMiddleware<{
  Variables: { userId: string; userEmail: string };
}>(async (c, next) => {
  // Dev escape hatch — only honoured outside production
  const devUserId = c.req.header('X-Dev-User-Id');
  if (devUserId && process.env['NODE_ENV'] !== 'production') {
    c.set('userId', devUserId);
    c.set('userEmail', `dev-${devUserId}@local`);
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  c.set('userId', data.user.id);
  c.set('userEmail', data.user.email ?? '');
  await next();
});

import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import treesRouter from './routes/trees.js';
import membersRouter from './routes/members.js';
import relationshipsRouter from './routes/relationships.js';
import invitationsRouter from './routes/invitations.js';
import claimsRouter from './routes/claims.js';
import traversalRouter from './routes/traversal.js';
import type { AccessRole } from './types/tree.js';

type Variables = { userId: string; userRole: AccessRole };

const app = new Hono<{ Variables: Variables }>();

const CLIENT_URL = process.env['CLIENT_URL'] ?? 'http://localhost:3000';
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

app.use(
  '*',
  cors({
    origin: CLIENT_URL,
    allowHeaders: ['Authorization', 'Content-Type', 'X-Dev-User-Id'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use('/api/*', authMiddleware);

app.route('/api/trees', treesRouter);
app.route('/api/trees/:treeId/members', membersRouter);
app.route('/api/trees/:treeId/relationships', relationshipsRouter);
app.route('/api/trees/:treeId/invitations', invitationsRouter);
app.route('/api/trees/:treeId/claims', claimsRouter);
app.route('/api/trees/:treeId/graph', traversalRouter);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.onError(errorHandler);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

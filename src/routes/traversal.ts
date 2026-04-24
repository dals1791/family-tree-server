import { Hono } from 'hono';
import { requireRole } from '../middleware/requireRole.js';
import * as traversalService from '../services/traversalService.js';
import type { AccessRole } from '../types/tree.js';

type Variables = { userId: string; userRole: AccessRole };

const router = new Hono<{ Variables: Variables }>();

// GET /api/trees/:treeId/graph/:anchorId
router.get('/:anchorId', requireRole('VIEWER'), async (c) => {
  const treeId = c.req.param('treeId')!;
  const anchorId = c.req.param('anchorId')!;
  const graph = await traversalService.getGraph(treeId, anchorId);
  return c.json(graph);
});

export default router;

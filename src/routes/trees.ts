import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { ValidationError } from '../lib/errors.js';
import * as treeService from '../services/treeService.js';
import type { AccessRole } from '../types/tree.js';

type Variables = { userId: string; userEmail: string; userRole: AccessRole };

const router = new Hono<{ Variables: Variables }>();

const CreateTreeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const UpdateTreeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const UpdateAccessSchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

// GET /api/trees — list all trees the user has access to
router.get('/', async (c) => {
  const userId = c.get('userId');
  const trees = await treeService.getTreesForUser(userId);
  return c.json(trees);
});

// POST /api/trees — create a new tree
router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateTreeSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const userId = c.get('userId');
  const userEmail = c.get('userEmail');
  const tree = await treeService.createTree(userId, userEmail, parsed.data.name, parsed.data.description);
  return c.json(tree, 201);
});

// GET /api/trees/:treeId — get a single tree
router.get('/:treeId', requireRole('VIEWER'), async (c) => {
  const userId = c.get('userId');
  const treeId = c.req.param('treeId');
  const tree = await treeService.getTree(userId, treeId);
  return c.json(tree);
});

// PATCH /api/trees/:treeId — update tree metadata
router.patch('/:treeId', requireRole('OWNER'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateTreeSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId');
  const tree = await treeService.updateTree(treeId, parsed.data);
  return c.json(tree);
});

// DELETE /api/trees/:treeId — delete a tree
router.delete('/:treeId', requireRole('OWNER'), async (c) => {
  const treeId = c.req.param('treeId');
  await treeService.deleteTree(treeId);
  return c.body(null, 204);
});

// GET /api/trees/:treeId/access — list all access entries
router.get('/:treeId/access', requireRole('VIEWER'), async (c) => {
  const treeId = c.req.param('treeId');
  const access = await treeService.getTreeAccess(treeId);
  return c.json(access);
});

// PATCH /api/trees/:treeId/access/:userId — update a user's role
router.patch('/:treeId/access/:userId', requireRole('OWNER'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateAccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId');
  const targetUserId = c.req.param('userId');
  const requestingUserId = c.get('userId');

  await treeService.updateAccessRole(treeId, requestingUserId, targetUserId, parsed.data.role);
  return c.body(null, 204);
});

// DELETE /api/trees/:treeId/access/:userId — remove a user's access
router.delete('/:treeId/access/:userId', requireRole('OWNER'), async (c) => {
  const treeId = c.req.param('treeId');
  const targetUserId = c.req.param('userId');
  const requestingUserId = c.get('userId');

  await treeService.removeAccess(treeId, requestingUserId, targetUserId);
  return c.body(null, 204);
});

export default router;

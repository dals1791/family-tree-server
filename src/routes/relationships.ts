import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { ValidationError } from '../lib/errors.js';
import * as relService from '../services/relationshipService.js';
import type { AccessRole } from '../types/tree.js';

type Variables = { userId: string; userRole: AccessRole };

const router = new Hono<{ Variables: Variables }>();

const PartnershipTypeEnum = z.enum(['MARRIAGE', 'DOMESTIC_PARTNERSHIP', 'DIVORCED', 'SEPARATED']);
const DateRegex = /^\d{4}-\d{2}-\d{2}$/;

const ParentChildSchema = z.object({
  parentId: z.string().uuid('parentId must be a UUID'),
  childId: z.string().uuid('childId must be a UUID'),
});

const PartnershipCreateSchema = z.object({
  member1Id: z.string().uuid('member1Id must be a UUID'),
  member2Id: z.string().uuid('member2Id must be a UUID'),
  type: PartnershipTypeEnum.optional(),
  startDate: z.string().regex(DateRegex, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(DateRegex, 'endDate must be YYYY-MM-DD').optional(),
});

const PartnershipUpdateSchema = z.object({
  type: PartnershipTypeEnum.optional(),
  startDate: z.string().regex(DateRegex, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(DateRegex, 'endDate must be YYYY-MM-DD').optional(),
});

// POST /api/trees/:treeId/relationships/parent-child
router.post('/parent-child', requireRole('EDITOR'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = ParentChildSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId')!;
  await relService.addParentChild(treeId, parsed.data.parentId, parsed.data.childId);
  return c.body(null, 204);
});

// DELETE /api/trees/:treeId/relationships/parent-child
router.delete('/parent-child', requireRole('EDITOR'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = ParentChildSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId')!;
  await relService.removeParentChild(treeId, parsed.data.parentId, parsed.data.childId);
  return c.body(null, 204);
});

// POST /api/trees/:treeId/relationships/partnerships
router.post('/partnerships', requireRole('EDITOR'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = PartnershipCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId')!;
  const partnership = await relService.createPartnership(treeId, parsed.data);
  return c.json(partnership, 201);
});

// PATCH /api/trees/:treeId/relationships/partnerships/:id
router.patch('/partnerships/:id', requireRole('EDITOR'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = PartnershipUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId')!;
  const partnershipId = c.req.param('id')!;
  const partnership = await relService.updatePartnership(treeId, partnershipId, parsed.data);
  return c.json(partnership);
});

// DELETE /api/trees/:treeId/relationships/partnerships/:id
router.delete('/partnerships/:id', requireRole('EDITOR'), async (c) => {
  const treeId = c.req.param('treeId')!;
  const partnershipId = c.req.param('id')!;
  await relService.deletePartnership(treeId, partnershipId);
  return c.body(null, 204);
});

export default router;

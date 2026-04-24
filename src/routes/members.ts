import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole.js';
import { ValidationError } from '../lib/errors.js';
import * as memberService from '../services/memberService.js';
import type { AccessRole } from '../types/tree.js';

type Variables = { userId: string; userRole: AccessRole };

const router = new Hono<{ Variables: Variables }>();

const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

const MemberCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  maidenName: z.string().optional(),
  gender: GenderEnum.optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD').optional(),
  birthYear: z.number().int().optional(),
  deathDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'deathDate must be YYYY-MM-DD').optional(),
  deathYear: z.number().int().optional(),
});

const MemberUpdateSchema = MemberCreateSchema.partial();

// GET /api/trees/:treeId/members
router.get('/', requireRole('VIEWER'), async (c) => {
  const treeId = c.req.param('treeId')!;
  const members = await memberService.listMembers(treeId);
  return c.json(members);
});

// POST /api/trees/:treeId/members
router.post('/', requireRole('EDITOR'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = MemberCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId')!;
  const member = await memberService.createMember(treeId, parsed.data);
  return c.json(member, 201);
});

// GET /api/trees/:treeId/members/:memberId
router.get('/:memberId', requireRole('VIEWER'), async (c) => {
  const treeId = c.req.param('treeId')!;
  const memberId = c.req.param('memberId')!;
  const member = await memberService.getMember(treeId, memberId);
  return c.json(member);
});

// PATCH /api/trees/:treeId/members/:memberId
router.patch('/:memberId', requireRole('EDITOR'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = MemberUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');
  }

  const treeId = c.req.param('treeId')!;
  const memberId = c.req.param('memberId')!;
  const member = await memberService.updateMember(treeId, memberId, parsed.data);
  return c.json(member);
});

// DELETE /api/trees/:treeId/members/:memberId
router.delete('/:memberId', requireRole('EDITOR'), async (c) => {
  const treeId = c.req.param('treeId')!;
  const memberId = c.req.param('memberId')!;
  await memberService.deleteMember(treeId, memberId);
  return c.body(null, 204);
});

export default router;

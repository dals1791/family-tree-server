import { createMiddleware } from 'hono/factory';
import { prisma } from '../db/postgres/client.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import { type AccessRole, ROLE_HIERARCHY } from '../types/tree.js';

export const requireRole = (minimumRole: AccessRole) =>
  createMiddleware<{
    Variables: { userId: string; userRole: AccessRole };
  }>(async (c, next) => {
    const userId = c.get('userId');
    const treeId = c.req.param('treeId') ?? '';

    const access = await prisma.familyTreeAccess.findUnique({
      where: { userId_treeId: { userId, treeId } },
    });

    if (!access) {
      throw new NotFoundError('Tree not found or access denied');
    }

    const actualRole = access.role as AccessRole;
    if (ROLE_HIERARCHY[actualRole] < ROLE_HIERARCHY[minimumRole]) {
      throw new ForbiddenError('Insufficient permissions');
    }

    c.set('userRole', actualRole);
    await next();
  });

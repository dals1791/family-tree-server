import { prisma } from '../db/postgres/client.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../lib/errors.js';
import type { AccessRole, FamilyTreeWithRole } from '../types/tree.js';

export async function getTreesForUser(userId: string): Promise<FamilyTreeWithRole[]> {
  const rows = await prisma.familyTreeAccess.findMany({
    where: { userId },
    include: { tree: true },
    orderBy: { tree: { createdAt: 'desc' } },
  });

  return rows.map((row) => ({
    ...row.tree,
    role: row.role as AccessRole,
  }));
}

export async function createTree(
  userId: string,
  email: string,
  name: string,
  description?: string,
): Promise<FamilyTreeWithRole> {
  const tree = await prisma.$transaction(async (tx) => {
    const newTree = await tx.familyTree.create({
      data: { name, description, ownerId: userId },
    });

    // Upsert the Profile row so the FK constraint is satisfied in dev
    // (In production, Supabase creates this automatically via trigger)
    await tx.profile.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    });

    await tx.familyTreeAccess.create({
      data: { userId, treeId: newTree.id, role: 'OWNER' },
    });

    return newTree;
  });

  return { ...tree, role: 'OWNER' };
}

export async function getTree(userId: string, treeId: string): Promise<FamilyTreeWithRole> {
  const access = await prisma.familyTreeAccess.findUnique({
    where: { userId_treeId: { userId, treeId } },
    include: { tree: true },
  });

  if (!access) throw new NotFoundError('Tree not found');

  return { ...access.tree, role: access.role as AccessRole };
}

export async function updateTree(
  treeId: string,
  data: { name?: string; description?: string },
) {
  return prisma.familyTree.update({ where: { id: treeId }, data });
}

export async function deleteTree(treeId: string): Promise<void> {
  await prisma.familyTree.delete({ where: { id: treeId } });
}

export async function getTreeAccess(treeId: string) {
  return prisma.familyTreeAccess.findMany({
    where: { treeId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateAccessRole(
  treeId: string,
  requestingUserId: string,
  targetUserId: string,
  newRole: AccessRole,
): Promise<void> {
  if (requestingUserId === targetUserId) {
    throw new ForbiddenError('Cannot change your own role');
  }

  const existing = await prisma.familyTreeAccess.findUnique({
    where: { userId_treeId: { userId: targetUserId, treeId } },
  });

  if (!existing) throw new NotFoundError('User does not have access to this tree');
  if (existing.role === 'OWNER' && newRole !== 'OWNER') {
    throw new ForbiddenError('Cannot demote the owner');
  }

  await prisma.familyTreeAccess.update({
    where: { userId_treeId: { userId: targetUserId, treeId } },
    data: { role: newRole },
  });
}

export async function removeAccess(
  treeId: string,
  requestingUserId: string,
  targetUserId: string,
): Promise<void> {
  if (requestingUserId === targetUserId) {
    throw new ForbiddenError('Cannot remove your own access');
  }

  const existing = await prisma.familyTreeAccess.findUnique({
    where: { userId_treeId: { userId: targetUserId, treeId } },
  });

  if (!existing) throw new NotFoundError('User does not have access to this tree');
  if (existing.role === 'OWNER') {
    throw new ForbiddenError('Cannot remove the owner');
  }

  await prisma.familyTreeAccess.delete({
    where: { userId_treeId: { userId: targetUserId, treeId } },
  });
}

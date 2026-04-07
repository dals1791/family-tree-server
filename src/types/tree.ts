export type AccessRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export const ROLE_HIERARCHY: Record<AccessRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

export interface FamilyTree {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTreeAccess {
  id: string;
  userId: string;
  treeId: string;
  role: AccessRole;
  createdAt: Date;
}

export interface FamilyTreeWithRole extends FamilyTree {
  role: AccessRole;
}

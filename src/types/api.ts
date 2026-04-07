import type { AccessRole } from './tree.js';

export interface CreateTreeBody {
  name: string;
  description?: string;
}

export interface UpdateTreeBody {
  name?: string;
  description?: string;
}

export interface UpdateAccessBody {
  role: AccessRole;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}

export interface AccessEntry {
  id: string;
  userId: string;
  treeId: string;
  role: AccessRole;
  createdAt: Date;
}

// Stub — full definitions added when traversal routes are built

import type { Member } from './member.js';

export interface Partnership {
  id: string;
  treeId: string;
  memberIds: string[];
}

export interface FamilyGraphPayload {
  anchorId: string;
  members: Member[];
  partnerships: Partnership[];
}

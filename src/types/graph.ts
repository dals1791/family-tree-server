import type { Member, PartnershipType } from './member.js';

export interface ParentEdge {
  childId: string;
  parentId: string;
}

export interface PartnershipEdge {
  id: string;
  member1Id: string;
  member2Id: string;
  type?: PartnershipType;
  startDate?: string;
  endDate?: string;
}

export interface FamilyGraphPayload {
  anchorId: string;
  members: Member[];
  parentEdges: ParentEdge[];
  partnershipEdges: PartnershipEdge[];
}

export interface NormalizedFamilyGraph {
  members: Record<string, Member>;
  childrenOf: Record<string, string[]>;
  parentsOf: Record<string, string[]>;
  partnersOf: Record<string, string[]>;
  siblingsOf: Record<string, string[]>;
}

export function normalizeGraph(payload: FamilyGraphPayload): NormalizedFamilyGraph {
  const members: Record<string, Member> = {};
  for (const m of payload.members) members[m.id] = m;

  const childrenOf: Record<string, string[]> = {};
  const parentsOf: Record<string, string[]> = {};
  for (const { childId, parentId } of payload.parentEdges) {
    (childrenOf[parentId] ??= []).push(childId);
    (parentsOf[childId] ??= []).push(parentId);
  }

  const partnersOf: Record<string, string[]> = {};
  for (const { member1Id, member2Id } of payload.partnershipEdges) {
    (partnersOf[member1Id] ??= []).push(member2Id);
    (partnersOf[member2Id] ??= []).push(member1Id);
  }

  const siblingsOf: Record<string, string[]> = {};
  for (const memberId of Object.keys(members)) {
    const sibs = new Set<string>();
    for (const parentId of parentsOf[memberId] ?? []) {
      for (const sibId of childrenOf[parentId] ?? []) {
        if (sibId !== memberId) sibs.add(sibId);
      }
    }
    siblingsOf[memberId] = Array.from(sibs);
  }

  return { members, childrenOf, parentsOf, partnersOf, siblingsOf };
}

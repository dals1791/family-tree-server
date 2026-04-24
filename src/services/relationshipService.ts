import { randomUUID } from 'crypto';
import { driver } from '../db/neo4j/client.js';
import { NotFoundError, ConflictError, ValidationError } from '../lib/errors.js';
import type { PartnershipType } from '../types/member.js';
import type { PartnershipEdge } from '../types/graph.js';

// ── Parent-child ─────────────────────────────────────────────────────────────

export async function addParentChild(
  treeId: string,
  parentId: string,
  childId: string,
): Promise<void> {
  if (parentId === childId) throw new ValidationError('A member cannot be their own parent');

  const session = driver.session();
  try {
    // Verify both members exist
    const members = await session.run(
      `MATCH (parent:Member {id: $parentId, treeId: $treeId})
       MATCH (child:Member {id: $childId, treeId: $treeId})
       RETURN parent.id, child.id`,
      { parentId, childId, treeId },
    );
    if (members.records.length === 0) throw new NotFoundError('One or both members not found');

    // Check for cycles (child can't already be an ancestor of parent)
    const cycleCheck = await session.run(
      `OPTIONAL MATCH path = (parent:Member {id: $parentId})-[:CHILD_OF*1..30]->(ancestor:Member {id: $childId})
       RETURN path IS NOT NULL as wouldCycle`,
      { parentId, childId },
    );
    if (cycleCheck.records[0]?.get('wouldCycle')) {
      throw new ValidationError('Adding this relationship would create a cycle');
    }

    await session.run(
      `MATCH (child:Member {id: $childId, treeId: $treeId})
       MATCH (parent:Member {id: $parentId, treeId: $treeId})
       MERGE (child)-[:CHILD_OF]->(parent)`,
      { parentId, childId, treeId },
    );
  } finally {
    await session.close();
  }
}

export async function removeParentChild(
  treeId: string,
  parentId: string,
  childId: string,
): Promise<void> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (child:Member {id: $childId, treeId: $treeId})-[r:CHILD_OF]->(parent:Member {id: $parentId, treeId: $treeId})
       DELETE r`,
      { parentId, childId, treeId },
    );
    if (result.summary.counters.updates().relationshipsDeleted === 0) {
      throw new NotFoundError('Relationship not found');
    }
  } finally {
    await session.close();
  }
}

// ── Partnerships ──────────────────────────────────────────────────────────────

export interface PartnershipCreateInput {
  member1Id: string;
  member2Id: string;
  type?: PartnershipType;
  startDate?: string;
  endDate?: string;
}

export interface PartnershipUpdateInput {
  type?: PartnershipType;
  startDate?: string;
  endDate?: string;
}

function rowToPartnershipEdge(record: any): PartnershipEdge {
  const p = record.get('p').properties;
  return {
    id: p.id,
    member1Id: record.get('member1Id'),
    member2Id: record.get('member2Id'),
    type: p.type ?? undefined,
    startDate: p.startDate ?? undefined,
    endDate: p.endDate ?? undefined,
  };
}

export async function createPartnership(
  treeId: string,
  input: PartnershipCreateInput,
): Promise<PartnershipEdge> {
  if (input.member1Id === input.member2Id) {
    throw new ValidationError('A member cannot partner with themselves');
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (m1:Member {id: $member1Id, treeId: $treeId})
       MATCH (m2:Member {id: $member2Id, treeId: $treeId})
       WHERE NOT (m1)-[:PARTNERED_WITH]->(:Partnership)<-[:PARTNERED_WITH]-(m2)
       CREATE (p:Partnership {
         id: $id,
         treeId: $treeId,
         type: $type,
         startDate: $startDate,
         endDate: $endDate,
         createdAt: $createdAt
       })
       CREATE (m1)-[:PARTNERED_WITH]->(p)
       CREATE (m2)-[:PARTNERED_WITH]->(p)
       RETURN p, m1.id as member1Id, m2.id as member2Id`,
      {
        member1Id: input.member1Id,
        member2Id: input.member2Id,
        treeId,
        id: randomUUID(),
        type: input.type ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        createdAt: new Date().toISOString(),
      },
    );

    if (result.records.length === 0) {
      // Distinguish "members not found" from "already partnered"
      const memberCheck = await session.run(
        `MATCH (m1:Member {id: $member1Id, treeId: $treeId})
         MATCH (m2:Member {id: $member2Id, treeId: $treeId})
         RETURN count(*) as found`,
        { member1Id: input.member1Id, member2Id: input.member2Id, treeId },
      );
      const found = memberCheck.records[0]?.get('found');
      if (!found || neo4jIntToNumber(found) === 0) {
        throw new NotFoundError('One or both members not found');
      }
      throw new ConflictError('A partnership already exists between these members');
    }

    return rowToPartnershipEdge(result.records[0]);
  } finally {
    await session.close();
  }
}

export async function updatePartnership(
  treeId: string,
  partnershipId: string,
  input: PartnershipUpdateInput,
): Promise<PartnershipEdge> {
  const session = driver.session();
  try {
    const updates: Record<string, any> = {};
    if (input.type !== undefined) updates.type = input.type;
    if (input.startDate !== undefined) updates.startDate = input.startDate;
    if (input.endDate !== undefined) updates.endDate = input.endDate;

    const result = await session.run(
      `MATCH (p:Partnership {id: $partnershipId, treeId: $treeId})
       SET p += $updates
       WITH p
       MATCH (m1:Member)-[:PARTNERED_WITH]->(p)<-[:PARTNERED_WITH]-(m2:Member)
       WHERE m1.id < m2.id
       RETURN p, m1.id as member1Id, m2.id as member2Id`,
      { partnershipId, treeId, updates },
    );

    if (result.records.length === 0) throw new NotFoundError('Partnership not found');
    return rowToPartnershipEdge(result.records[0]);
  } finally {
    await session.close();
  }
}

export async function deletePartnership(treeId: string, partnershipId: string): Promise<void> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Partnership {id: $partnershipId, treeId: $treeId}) DETACH DELETE p`,
      { partnershipId, treeId },
    );
    if (result.summary.counters.updates().nodesDeleted === 0) {
      throw new NotFoundError('Partnership not found');
    }
  } finally {
    await session.close();
  }
}

// neo4j integers can come back as Integer objects or plain numbers depending on the driver
function neo4jIntToNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (val != null && typeof val.toNumber === 'function') return val.toNumber();
  return Number(val);
}

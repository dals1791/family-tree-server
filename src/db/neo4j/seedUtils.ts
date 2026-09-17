import { driver } from './client.js';

// AC (in-universe "After Conquest") year -> real year, anchored so Joffrey
// Baratheon's death (300 AC) lands on 2026. Every seed file shares this
// offset so ages/timelines stay consistent across houses.
export const AC_OFFSET = 1726;

export function real(acYear: number): number {
  return acYear + AC_OFFSET;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface SeedMember {
  id: string;
  firstName: string;
  lastName?: string;
  gender?: Gender;
  birthYear?: number;
  deathYear?: number;
}

export interface SeedPartnership {
  id: string;
  member1Id: string;
  member2Id: string;
  type?: 'MARRIAGE' | 'DOMESTIC_PARTNERSHIP' | 'DIVORCED' | 'SEPARATED';
}

/** [parentId, childId] */
export type SeedParentChild = [string, string];

/**
 * Upserts a batch of members/partnerships/parent-child edges into a tree.
 * Idempotent (MERGE by id) — safe to re-run. Only touches nodes referenced
 * by the given data, so it's safe to call once per house against the same
 * shared tree.
 */
export async function seedFamily(
  treeId: string,
  members: SeedMember[],
  partnerships: SeedPartnership[],
  parentChild: SeedParentChild[],
): Promise<void> {
  const session = driver.session();
  try {
    for (const m of members) {
      await session.run(
        `MERGE (m:Member {id: $id})
         SET m.treeId = $treeId,
             m.firstName = $firstName,
             m.lastName = $lastName,
             m.gender = $gender,
             m.birthYear = $birthYear,
             m.deathYear = $deathYear,
             m.status = coalesce(m.status, 'UNCLAIMED'),
             m.createdAt = coalesce(m.createdAt, $now),
             m.updatedAt = $now`,
        {
          id: m.id,
          treeId,
          firstName: m.firstName,
          lastName: m.lastName ?? null,
          gender: m.gender ?? null,
          birthYear: m.birthYear ?? null,
          deathYear: m.deathYear ?? null,
          now: new Date().toISOString(),
        },
      );
    }

    for (const p of partnerships) {
      await session.run(
        `MERGE (p:Partnership {id: $id})
         SET p.treeId = $treeId, p.type = $type
         WITH p
         MATCH (m1:Member {id: $member1Id})
         MATCH (m2:Member {id: $member2Id})
         MERGE (m1)-[:PARTNERED_WITH]->(p)
         MERGE (m2)-[:PARTNERED_WITH]->(p)`,
        { id: p.id, treeId, type: p.type ?? null, member1Id: p.member1Id, member2Id: p.member2Id },
      );
    }

    for (const [parentId, childId] of parentChild) {
      await session.run(
        `MATCH (child:Member {id: $childId})
         MATCH (parent:Member {id: $parentId})
         MERGE (child)-[:CHILD_OF]->(parent)`,
        { parentId, childId },
      );
    }

    console.log(
      `  ${members.length} members, ${partnerships.length} partnerships, ${parentChild.length} parent-child edges upserted`,
    );
  } finally {
    await session.close();
  }
}

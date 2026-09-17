import 'dotenv/config';
import { driver } from './client.js';

// Stable seed IDs so the script is idempotent (safe to run multiple times)
const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001'; // House Baratheon Family Tree

const MEMBERS = [
  // Generation 0 — grandparents
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', firstName: 'Steffon', lastName: 'Baratheon', gender: 'MALE', birthYear: 1949, deathYear: 1978 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000002', firstName: 'Cassana', lastName: 'Estermont', gender: 'FEMALE', birthYear: 1950, deathYear: 1978 },

  // Generation 1
  { id: 'bbbbbbbb-0000-0000-0000-000000000003', firstName: 'Robert', lastName: 'Baratheon', gender: 'MALE', birthYear: 1969, deathYear: 1998 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000004', firstName: 'Cersei', lastName: 'Lannister', gender: 'FEMALE', birthYear: 1970 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000005', firstName: 'Stannis', lastName: 'Baratheon', gender: 'MALE', birthYear: 1971, deathYear: 1999 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000006', firstName: 'Selyse', lastName: 'Florent', gender: 'FEMALE', birthYear: 1972 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000007', firstName: 'Renly', lastName: 'Baratheon', gender: 'MALE', birthYear: 1975, deathYear: 1999 },

  // Generation 2
  { id: 'bbbbbbbb-0000-0000-0000-000000000008', firstName: 'Joffrey', lastName: 'Baratheon', gender: 'MALE', birthYear: 1988, deathYear: 1999 },
  { id: 'bbbbbbbb-0000-0000-0000-000000000009', firstName: 'Myrcella', lastName: 'Baratheon', gender: 'FEMALE', birthYear: 1990 },
  { id: 'bbbbbbbb-0000-0000-0000-00000000000a', firstName: 'Tommen', lastName: 'Baratheon', gender: 'MALE', birthYear: 1991 },
  { id: 'bbbbbbbb-0000-0000-0000-00000000000b', firstName: 'Shireen', lastName: 'Baratheon', gender: 'FEMALE', birthYear: 1996 },
] as const;

const PARTNERSHIPS = [
  { id: 'cccccccc-0000-0000-0000-000000000001', member1Id: MEMBERS[0].id, member2Id: MEMBERS[1].id, type: 'MARRIAGE' }, // Steffon + Cassana
  { id: 'cccccccc-0000-0000-0000-000000000002', member1Id: MEMBERS[2].id, member2Id: MEMBERS[3].id, type: 'MARRIAGE' }, // Robert + Cersei
  { id: 'cccccccc-0000-0000-0000-000000000003', member1Id: MEMBERS[4].id, member2Id: MEMBERS[5].id, type: 'MARRIAGE' }, // Stannis + Selyse
] as const;

const PARENT_CHILD: [string, string][] = [
  // Steffon & Cassana -> Robert, Stannis, Renly
  [MEMBERS[0].id, MEMBERS[2].id],
  [MEMBERS[1].id, MEMBERS[2].id],
  [MEMBERS[0].id, MEMBERS[4].id],
  [MEMBERS[1].id, MEMBERS[4].id],
  [MEMBERS[0].id, MEMBERS[6].id],
  [MEMBERS[1].id, MEMBERS[6].id],
  // Robert & Cersei -> Joffrey, Myrcella, Tommen
  [MEMBERS[2].id, MEMBERS[7].id],
  [MEMBERS[3].id, MEMBERS[7].id],
  [MEMBERS[2].id, MEMBERS[8].id],
  [MEMBERS[3].id, MEMBERS[8].id],
  [MEMBERS[2].id, MEMBERS[9].id],
  [MEMBERS[3].id, MEMBERS[9].id],
  // Stannis & Selyse -> Shireen
  [MEMBERS[4].id, MEMBERS[10].id],
  [MEMBERS[5].id, MEMBERS[10].id],
];

async function main() {
  const session = driver.session();
  try {
    console.log('Seeding Neo4j Baratheon tree...');

    for (const m of MEMBERS) {
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
          treeId: TREE_ID,
          firstName: m.firstName,
          lastName: m.lastName,
          gender: m.gender,
          birthYear: m.birthYear ?? null,
          deathYear: (m as any).deathYear ?? null,
          now: new Date().toISOString(),
        },
      );
    }
    console.log(`  ${MEMBERS.length} members upserted`);

    for (const p of PARTNERSHIPS) {
      await session.run(
        `MERGE (p:Partnership {id: $id})
         SET p.treeId = $treeId, p.type = $type
         WITH p
         MATCH (m1:Member {id: $member1Id})
         MATCH (m2:Member {id: $member2Id})
         MERGE (m1)-[:PARTNERED_WITH]->(p)
         MERGE (m2)-[:PARTNERED_WITH]->(p)`,
        { id: p.id, treeId: TREE_ID, type: p.type, member1Id: p.member1Id, member2Id: p.member2Id },
      );
    }
    console.log(`  ${PARTNERSHIPS.length} partnerships upserted`);

    for (const [parentId, childId] of PARENT_CHILD) {
      await session.run(
        `MATCH (child:Member {id: $childId})
         MATCH (parent:Member {id: $parentId})
         MERGE (child)-[:CHILD_OF]->(parent)`,
        { parentId, childId },
      );
    }
    console.log(`  ${PARENT_CHILD.length} parent-child edges upserted`);

    console.log('\nNeo4j seed complete!');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

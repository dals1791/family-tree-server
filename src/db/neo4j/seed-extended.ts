import 'dotenv/config';
import { driver } from './client.js';

// Extends the Baratheon seed with API-sourced ancestors, bastards, and an
// untethered founder branch. Stable ids so this is safe to re-run.
const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const OFFSET = 1726; // AC -> real year, anchored so Joffrey's death (300 AC) lands on 2026

// Existing ids from the original seed, referenced here to attach new relationships
const ORMUND_ID = '98b1d08b-3189-4eaf-82a3-cac6ee5fadd2';
const STEFFON_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const ROBERT_ID = 'bbbbbbbb-0000-0000-0000-000000000003';

const NEW_MEMBERS = [
  // Connected: Steffon's parents
  { id: 'dddddddd-0000-0000-0000-000000000001', firstName: 'Rhaelle', lastName: 'Targaryen', gender: 'FEMALE', birthYear: 1957 },

  // Connected: Robert's bastards
  { id: 'dddddddd-0000-0000-0000-000000000002', firstName: 'Edric', lastName: 'Storm', gender: 'MALE', birthYear: 2013 },
  { id: 'dddddddd-0000-0000-0000-000000000003', firstName: 'Delena', lastName: 'Florent', gender: 'FEMALE' },
  { id: 'dddddddd-0000-0000-0000-000000000004', firstName: 'Barra', lastName: undefined, gender: 'FEMALE', birthYear: 2024, deathYear: 2025 },

  // Untethered founder branch — real House Baratheon ancestors, but the exact
  // line connecting them to Ormund's generation isn't documented, so they're
  // added as members of the tree without a CHILD_OF link to the rest.
  { id: 'dddddddd-0000-0000-0000-000000000005', firstName: 'Orys', lastName: 'Baratheon', gender: 'MALE', deathYear: 1764 },
  { id: 'dddddddd-0000-0000-0000-000000000006', firstName: 'Argella', lastName: 'Durrandon', gender: 'FEMALE' },
  { id: 'dddddddd-0000-0000-0000-000000000007', firstName: 'Gowen', lastName: 'Baratheon', gender: 'MALE' },
  { id: 'dddddddd-0000-0000-0000-000000000008', firstName: 'Tya', lastName: 'Lannister', gender: 'FEMALE' },
  { id: 'dddddddd-0000-0000-0000-000000000009', firstName: 'Lyonel', lastName: 'Baratheon', gender: 'MALE', deathYear: 1968 },
] as const;

const PARTNERSHIPS = [
  { id: 'eeeeeeee-0000-0000-0000-000000000001', member1Id: ORMUND_ID, member2Id: 'dddddddd-0000-0000-0000-000000000001', type: 'MARRIAGE' },
  { id: 'eeeeeeee-0000-0000-0000-000000000002', member1Id: 'dddddddd-0000-0000-0000-000000000005', member2Id: 'dddddddd-0000-0000-0000-000000000006', type: 'MARRIAGE' }, // Orys + Argella
  { id: 'eeeeeeee-0000-0000-0000-000000000003', member1Id: 'dddddddd-0000-0000-0000-000000000007', member2Id: 'dddddddd-0000-0000-0000-000000000008', type: 'MARRIAGE' }, // Gowen + Tya
] as const;

const PARENT_CHILD: [string, string][] = [
  [ORMUND_ID, STEFFON_ID],
  ['dddddddd-0000-0000-0000-000000000001', STEFFON_ID], // Rhaelle -> Steffon
  [ROBERT_ID, 'dddddddd-0000-0000-0000-000000000002'], // Robert -> Edric Storm
  ['dddddddd-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000002'], // Delena -> Edric Storm
  [ROBERT_ID, 'dddddddd-0000-0000-0000-000000000004'], // Robert -> Barra
];

async function main() {
  const session = driver.session();
  try {
    console.log('Extending Neo4j Baratheon tree...');

    for (const m of NEW_MEMBERS) {
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
          lastName: (m as any).lastName ?? null,
          gender: m.gender,
          birthYear: (m as any).birthYear ?? null,
          deathYear: (m as any).deathYear ?? null,
          now: new Date().toISOString(),
        },
      );
    }
    console.log(`  ${NEW_MEMBERS.length} members upserted`);

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

    console.log('\nExtended seed complete!');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

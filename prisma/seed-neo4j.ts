/**
 * Seeds the House Baratheon Family Tree in Neo4j.
 * Safe to re-run — uses MERGE so it won't duplicate nodes/rels.
 *
 * Run: npx tsx prisma/seed-neo4j.ts
 */
import 'dotenv/config';
import neo4j from 'neo4j-driver';

const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const driver = neo4j.driver(
  process.env['NEO4J_URI']!,
  neo4j.auth.basic(process.env['NEO4J_USERNAME']!, process.env['NEO4J_PASSWORD']!),
);

// ── Member definitions ────────────────────────────────────────────────────────

const MEMBERS = [
  {
    id: 'bb000001-0000-0000-0000-000000000001',
    firstName: 'Steffon',
    lastName: 'Baratheon',
    gender: 'MALE',
    birthYear: 247,
    deathYear: 278,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000002',
    firstName: 'Cassana',
    lastName: 'Baratheon',
    maidenName: 'Estermont',
    gender: 'FEMALE',
    birthYear: 250,
    deathYear: 278,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000003',
    firstName: 'Robert',
    lastName: 'Baratheon',
    gender: 'MALE',
    birthYear: 262,
    deathYear: 298,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000004',
    firstName: 'Stannis',
    lastName: 'Baratheon',
    gender: 'MALE',
    birthYear: 264,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000005',
    firstName: 'Renly',
    lastName: 'Baratheon',
    gender: 'MALE',
    birthYear: 277,
    deathYear: 299,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000006',
    firstName: 'Cersei',
    lastName: 'Baratheon',
    maidenName: 'Lannister',
    gender: 'FEMALE',
    birthYear: 266,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000007',
    firstName: 'Joffrey',
    lastName: 'Baratheon',
    gender: 'MALE',
    birthYear: 286,
    deathYear: 300,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000008',
    firstName: 'Myrcella',
    lastName: 'Baratheon',
    gender: 'FEMALE',
    birthYear: 287,
    deathYear: 300,
  },
  {
    id: 'bb000001-0000-0000-0000-000000000009',
    firstName: 'Tommen',
    lastName: 'Baratheon',
    gender: 'MALE',
    birthYear: 288,
    deathYear: 300,
  },
] as const;

// ── Relationship definitions ──────────────────────────────────────────────────

// { childId, parentId }
const PARENT_CHILD = [
  // Robert, Stannis, Renly are children of Steffon + Cassana
  { childId: 'bb000001-0000-0000-0000-000000000003', parentId: 'bb000001-0000-0000-0000-000000000001' },
  { childId: 'bb000001-0000-0000-0000-000000000003', parentId: 'bb000001-0000-0000-0000-000000000002' },
  { childId: 'bb000001-0000-0000-0000-000000000004', parentId: 'bb000001-0000-0000-0000-000000000001' },
  { childId: 'bb000001-0000-0000-0000-000000000004', parentId: 'bb000001-0000-0000-0000-000000000002' },
  { childId: 'bb000001-0000-0000-0000-000000000005', parentId: 'bb000001-0000-0000-0000-000000000001' },
  { childId: 'bb000001-0000-0000-0000-000000000005', parentId: 'bb000001-0000-0000-0000-000000000002' },
  // Joffrey, Myrcella, Tommen are children of Robert + Cersei (officially)
  { childId: 'bb000001-0000-0000-0000-000000000007', parentId: 'bb000001-0000-0000-0000-000000000003' },
  { childId: 'bb000001-0000-0000-0000-000000000007', parentId: 'bb000001-0000-0000-0000-000000000006' },
  { childId: 'bb000001-0000-0000-0000-000000000008', parentId: 'bb000001-0000-0000-0000-000000000003' },
  { childId: 'bb000001-0000-0000-0000-000000000008', parentId: 'bb000001-0000-0000-0000-000000000006' },
  { childId: 'bb000001-0000-0000-0000-000000000009', parentId: 'bb000001-0000-0000-0000-000000000003' },
  { childId: 'bb000001-0000-0000-0000-000000000009', parentId: 'bb000001-0000-0000-0000-000000000006' },
];

// { id, member1Id, member2Id, type }
const PARTNERSHIPS = [
  {
    id: 'pp000001-0000-0000-0000-000000000001',
    member1Id: 'bb000001-0000-0000-0000-000000000001',
    member2Id: 'bb000001-0000-0000-0000-000000000002',
    type: 'MARRIAGE',
  },
  {
    id: 'pp000001-0000-0000-0000-000000000002',
    member1Id: 'bb000001-0000-0000-0000-000000000003',
    member2Id: 'bb000001-0000-0000-0000-000000000006',
    type: 'MARRIAGE',
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  const session = driver.session();
  const now = new Date().toISOString();

  try {
    console.log('Seeding members...');
    for (const m of MEMBERS) {
      await session.run(
        `MERGE (m:Member {id: $id})
         ON CREATE SET m += $props
         ON MATCH  SET m += $props`,
        {
          id: m.id,
          props: {
            id: m.id,
            treeId: TREE_ID,
            firstName: m.firstName,
            lastName: m.lastName ?? null,
            maidenName: (m as any).maidenName ?? null,
            gender: m.gender,
            birthYear: 'birthYear' in m ? neo4j.int(m.birthYear) : null,
            deathYear: 'deathYear' in m ? neo4j.int((m as any).deathYear) : null,
            birthDate: null,
            deathDate: null,
            status: 'UNCLAIMED',
            claimedByUserId: null,
            createdAt: now,
            updatedAt: now,
          },
        },
      );
      console.log(`  ✓ ${m.firstName} ${m.lastName}`);
    }

    console.log('\nSeeding parent-child relationships...');
    for (const rel of PARENT_CHILD) {
      await session.run(
        `MATCH (child:Member {id: $childId})
         MATCH (parent:Member {id: $parentId})
         MERGE (child)-[:CHILD_OF]->(parent)`,
        rel,
      );
    }
    console.log(`  ✓ ${PARENT_CHILD.length} parent-child edges`);

    console.log('\nSeeding partnerships...');
    for (const p of PARTNERSHIPS) {
      await session.run(
        `MERGE (p:Partnership {id: $id})
         ON CREATE SET p += $props
         ON MATCH  SET p += $props
         WITH p
         MATCH (m1:Member {id: $member1Id})
         MATCH (m2:Member {id: $member2Id})
         MERGE (m1)-[:PARTNERED_WITH]->(p)
         MERGE (m2)-[:PARTNERED_WITH]->(p)`,
        {
          id: p.id,
          props: {
            id: p.id,
            treeId: TREE_ID,
            type: p.type,
            startDate: null,
            endDate: null,
            createdAt: now,
          },
          member1Id: p.member1Id,
          member2Id: p.member2Id,
        },
      );
      console.log(`  ✓ Partnership ${p.id}`);
    }

    console.log('\nSeed complete!');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

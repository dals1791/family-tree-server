import { driver } from './client.js';

const STATEMENTS = [
  'CREATE CONSTRAINT member_id_unique IF NOT EXISTS FOR (m:Member) REQUIRE m.id IS UNIQUE',
  'CREATE CONSTRAINT partnership_id_unique IF NOT EXISTS FOR (p:Partnership) REQUIRE p.id IS UNIQUE',
  'CREATE INDEX member_tree_id IF NOT EXISTS FOR (m:Member) ON (m.treeId)',
  'CREATE INDEX member_id_tree IF NOT EXISTS FOR (m:Member) ON (m.id, m.treeId)',
  'CREATE INDEX member_claimed_by IF NOT EXISTS FOR (m:Member) ON (m.claimedByUserId)',
  'CREATE FULLTEXT INDEX member_name_search IF NOT EXISTS FOR (m:Member) ON EACH [m.firstName, m.lastName, m.maidenName]',
];

export async function applyConstraints(): Promise<void> {
  const session = driver.session();
  try {
    for (const stmt of STATEMENTS) {
      await session.run(stmt);
    }
    console.log('Neo4j constraints applied');
  } finally {
    await session.close();
  }
}

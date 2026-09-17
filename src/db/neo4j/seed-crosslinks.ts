import 'dotenv/config';
import { driver } from './client.js';
import { seedFamily, type SeedPartnership, type SeedParentChild } from './seedUtils.js';

// Relationships that span two different house seed files. Must run *after*
// seed-lannister, seed-stark, and seed-targaryen — every id referenced here
// is expected to already exist.
const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const TYRION_ID = 'ffffffff-0000-0000-0000-000000000005';
const SANSA_ID = '11111111-0000-0000-0000-000000000009';
const JON_SNOW_ID = '11111111-0000-0000-0000-00000000000d';
const RHAEGAR_ID = '22222222-0000-0000-0000-000000000007';
const LYANNA_ID = '11111111-0000-0000-0000-000000000005';

const PARTNERSHIPS: SeedPartnership[] = [
  // Political marriage, forced by Tywin — legally a marriage in-universe even
  // though never consummated.
  { id: '33333333-0000-0000-0000-000000000001', member1Id: TYRION_ID, member2Id: SANSA_ID, type: 'MARRIAGE' },
];

const PARENT_CHILD: SeedParentChild[] = [
  // Jon Snow's real parents ("R+L=J") — a secret relationship, not a formal
  // partnership, so no PARTNERED_WITH edge between Rhaegar and Lyanna (same
  // modeling choice as Robert Baratheon + Delena Florent / Edric Storm).
  [RHAEGAR_ID, JON_SNOW_ID],
  [LYANNA_ID, JON_SNOW_ID],
];

async function main() {
  console.log('Seeding cross-house links...');
  await seedFamily(TREE_ID, [], PARTNERSHIPS, PARENT_CHILD);
  console.log('Cross-links seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => driver.close());

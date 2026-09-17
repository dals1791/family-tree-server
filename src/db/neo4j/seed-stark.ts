import 'dotenv/config';
import { driver } from './client.js';
import { seedFamily, real, type SeedMember, type SeedPartnership, type SeedParentChild } from './seedUtils.js';

// Same shared tree as the Baratheon seed — everything lives in one account for now.
const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const MEMBERS: SeedMember[] = [
  { id: '11111111-0000-0000-0000-000000000001', firstName: 'Rickard', lastName: 'Stark', gender: 'MALE', birthYear: real(240), deathYear: real(282) },
  { id: '11111111-0000-0000-0000-000000000002', firstName: 'Lyarra', lastName: 'Stark', gender: 'FEMALE' },
  { id: '11111111-0000-0000-0000-000000000003', firstName: 'Eddard', lastName: 'Stark', gender: 'MALE', birthYear: real(263), deathYear: real(299) },
  { id: '11111111-0000-0000-0000-000000000004', firstName: 'Brandon', lastName: 'Stark', gender: 'MALE', birthYear: real(262), deathYear: real(282) }, // Ned's elder brother
  { id: '11111111-0000-0000-0000-000000000005', firstName: 'Lyanna', lastName: 'Stark', gender: 'FEMALE', birthYear: real(266), deathYear: real(283) },
  { id: '11111111-0000-0000-0000-000000000006', firstName: 'Benjen', lastName: 'Stark', gender: 'MALE', birthYear: real(267) },
  { id: '11111111-0000-0000-0000-000000000007', firstName: 'Catelyn', lastName: 'Stark', gender: 'FEMALE', birthYear: real(264), deathYear: real(299) },
  { id: '11111111-0000-0000-0000-000000000008', firstName: 'Robb', lastName: 'Stark', gender: 'MALE', birthYear: real(283), deathYear: real(299) },
  { id: '11111111-0000-0000-0000-000000000009', firstName: 'Sansa', lastName: 'Stark', gender: 'FEMALE', birthYear: real(286) },
  { id: '11111111-0000-0000-0000-00000000000a', firstName: 'Arya', lastName: 'Stark', gender: 'FEMALE', birthYear: real(289) },
  { id: '11111111-0000-0000-0000-00000000000b', firstName: 'Brandon', lastName: 'Stark', gender: 'MALE', birthYear: real(290) }, // "Bran", Ned's son
  { id: '11111111-0000-0000-0000-00000000000c', firstName: 'Rickon', lastName: 'Stark', gender: 'MALE', birthYear: real(295) },
  // Jon Snow lives here (raised a Stark) even though his real parents (seeded
  // in seed-crosslinks.ts) are Targaryen/Stark, not Eddard/Catelyn.
  { id: '11111111-0000-0000-0000-00000000000d', firstName: 'Jon', lastName: 'Snow', gender: 'MALE', birthYear: real(283) },
];

const PARTNERSHIPS: SeedPartnership[] = [
  { id: '11111111-1111-0000-0000-000000000001', member1Id: '11111111-0000-0000-0000-000000000001', member2Id: '11111111-0000-0000-0000-000000000002', type: 'MARRIAGE' }, // Rickard + Lyarra
  { id: '11111111-1111-0000-0000-000000000002', member1Id: '11111111-0000-0000-0000-000000000003', member2Id: '11111111-0000-0000-0000-000000000007', type: 'MARRIAGE' }, // Ned + Catelyn
];

const PARENT_CHILD: SeedParentChild[] = [
  // Rickard + Lyarra -> Ned, Brandon (elder), Lyanna, Benjen
  ['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003'],
  ['11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003'],
  ['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004'],
  ['11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004'],
  ['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005'],
  ['11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000005'],
  ['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006'],
  ['11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006'],

  // Ned + Catelyn -> Robb, Sansa, Arya, Bran, Rickon
  ['11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000008'],
  ['11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000008'],
  ['11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000009'],
  ['11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000009'],
  ['11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000a'],
  ['11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-00000000000a'],
  ['11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000b'],
  ['11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-00000000000b'],
  ['11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000c'],
  ['11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-00000000000c'],
];

async function main() {
  console.log('Seeding House Stark...');
  await seedFamily(TREE_ID, MEMBERS, PARTNERSHIPS, PARENT_CHILD);
  console.log('House Stark seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => driver.close());

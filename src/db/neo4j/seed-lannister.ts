import 'dotenv/config';
import { driver } from './client.js';
import { seedFamily, real, type SeedMember, type SeedPartnership, type SeedParentChild } from './seedUtils.js';

// Same shared tree as the Baratheon seed — everything lives in one account for now.
const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Existing member, from the Baratheon seed — Robert's wife
const CERSEI_ID = 'bbbbbbbb-0000-0000-0000-000000000004';

const MEMBERS: SeedMember[] = [
  { id: 'ffffffff-0000-0000-0000-000000000001', firstName: 'Tytos', lastName: 'Lannister', gender: 'MALE', birthYear: real(220), deathYear: real(267) },
  { id: 'ffffffff-0000-0000-0000-000000000002', firstName: 'Tywin', lastName: 'Lannister', gender: 'MALE', birthYear: real(242), deathYear: real(300) },
  { id: 'ffffffff-0000-0000-0000-000000000003', firstName: 'Joanna', lastName: 'Lannister', gender: 'FEMALE', birthYear: real(247), deathYear: real(273) },
  { id: 'ffffffff-0000-0000-0000-000000000004', firstName: 'Jaime', lastName: 'Lannister', gender: 'MALE', birthYear: real(266) },
  { id: 'ffffffff-0000-0000-0000-000000000005', firstName: 'Tyrion', lastName: 'Lannister', gender: 'MALE', birthYear: real(273) },
  { id: 'ffffffff-0000-0000-0000-000000000006', firstName: 'Kevan', lastName: 'Lannister', gender: 'MALE', birthYear: real(244), deathYear: real(300) },
  { id: 'ffffffff-0000-0000-0000-000000000007', firstName: 'Genna', lastName: 'Lannister', gender: 'FEMALE', birthYear: real(245) },
  { id: 'ffffffff-0000-0000-0000-000000000008', firstName: 'Gerion', lastName: 'Lannister', gender: 'MALE', birthYear: real(255), deathYear: real(291) },
  { id: 'ffffffff-0000-0000-0000-000000000009', firstName: 'Tygett', lastName: 'Lannister', gender: 'MALE', birthYear: real(250), deathYear: real(285) },
  { id: 'ffffffff-0000-0000-0000-00000000000a', firstName: 'Lancel', lastName: 'Lannister', gender: 'MALE', birthYear: real(282) },
];

const PARTNERSHIPS: SeedPartnership[] = [
  { id: 'ffffffff-1111-0000-0000-000000000001', member1Id: 'ffffffff-0000-0000-0000-000000000002', member2Id: 'ffffffff-0000-0000-0000-000000000003', type: 'MARRIAGE' }, // Tywin + Joanna
];

const PARENT_CHILD: SeedParentChild[] = [
  // Tytos -> his five children (spouse not named in source data)
  ['ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000002'], // Tytos -> Tywin
  ['ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000006'], // Tytos -> Kevan
  ['ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000007'], // Tytos -> Genna
  ['ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000008'], // Tytos -> Gerion
  ['ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000009'], // Tytos -> Tygett

  // Tywin + Joanna -> Cersei (existing), Jaime, Tyrion
  ['ffffffff-0000-0000-0000-000000000002', CERSEI_ID],
  ['ffffffff-0000-0000-0000-000000000003', CERSEI_ID],
  ['ffffffff-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000004'],
  ['ffffffff-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000004'],
  ['ffffffff-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000005'],
  ['ffffffff-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000005'],

  // Kevan -> Lancel (spouse not named in source data)
  ['ffffffff-0000-0000-0000-000000000006', 'ffffffff-0000-0000-0000-00000000000a'],
];

async function main() {
  console.log('Seeding House Lannister...');
  await seedFamily(TREE_ID, MEMBERS, PARTNERSHIPS, PARENT_CHILD);
  console.log('House Lannister seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => driver.close());

import 'dotenv/config';
import { driver } from './client.js';
import { seedFamily, real, type SeedMember, type SeedPartnership, type SeedParentChild } from './seedUtils.js';

// Same shared tree as the Baratheon seed — everything lives in one account for now.
const TREE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Existing member, from the Baratheon extended seed — Ormund Baratheon's wife.
// Rhaelle's own API record doesn't have a `father` field populated, but her
// birth window (229-233 AC) and marriage to Ormund Baratheon match Aegon V's
// documented daughter exactly (per The World of Ice and Fire) — same
// confidence level as the Ormund->Steffon link we already asserted.
const RHAELLE_ID = 'dddddddd-0000-0000-0000-000000000001';

const MEMBERS: SeedMember[] = [
  { id: '22222222-0000-0000-0000-000000000001', firstName: 'Aegon', lastName: 'Targaryen', gender: 'MALE', birthYear: real(200), deathYear: real(259) }, // Aegon V "Egg"
  { id: '22222222-0000-0000-0000-000000000002', firstName: 'Betha', lastName: 'Blackwood', gender: 'FEMALE' },
  { id: '22222222-0000-0000-0000-000000000003', firstName: 'Jaehaerys', lastName: 'Targaryen', gender: 'MALE', birthYear: real(225), deathYear: real(262) }, // Jaehaerys II
  { id: '22222222-0000-0000-0000-000000000004', firstName: 'Shaera', lastName: 'Targaryen', gender: 'FEMALE', birthYear: real(226), deathYear: real(259) },
  { id: '22222222-0000-0000-0000-000000000005', firstName: 'Aerys', lastName: 'Targaryen', gender: 'MALE', birthYear: real(244), deathYear: real(283) }, // Aerys II, "the Mad King"
  { id: '22222222-0000-0000-0000-000000000006', firstName: 'Rhaella', lastName: 'Targaryen', gender: 'FEMALE', birthYear: real(245), deathYear: real(284) },
  { id: '22222222-0000-0000-0000-000000000007', firstName: 'Rhaegar', lastName: 'Targaryen', gender: 'MALE', birthYear: real(259), deathYear: real(283) },
  { id: '22222222-0000-0000-0000-000000000008', firstName: 'Elia', lastName: 'Martell', gender: 'FEMALE', birthYear: real(256), deathYear: real(283) },
  { id: '22222222-0000-0000-0000-000000000009', firstName: 'Viserys', lastName: 'Targaryen', gender: 'MALE', birthYear: real(276), deathYear: real(298) },
  { id: '22222222-0000-0000-0000-00000000000a', firstName: 'Daenerys', lastName: 'Targaryen', gender: 'FEMALE', birthYear: real(284) },
  { id: '22222222-0000-0000-0000-00000000000b', firstName: 'Drogo', lastName: undefined, gender: 'MALE', birthYear: real(267), deathYear: real(298) },
  { id: '22222222-0000-0000-0000-00000000000c', firstName: 'Rhaenys', lastName: 'Targaryen', gender: 'FEMALE', birthYear: real(280), deathYear: real(283) },
  { id: '22222222-0000-0000-0000-00000000000d', firstName: 'Aegon', lastName: 'Targaryen', gender: 'MALE', birthYear: real(281), deathYear: real(283) }, // infant son of Rhaegar+Elia
];

const PARTNERSHIPS: SeedPartnership[] = [
  { id: '22222222-1111-0000-0000-000000000001', member1Id: '22222222-0000-0000-0000-000000000001', member2Id: '22222222-0000-0000-0000-000000000002', type: 'MARRIAGE' }, // Aegon V + Betha
  { id: '22222222-1111-0000-0000-000000000002', member1Id: '22222222-0000-0000-0000-000000000003', member2Id: '22222222-0000-0000-0000-000000000004', type: 'MARRIAGE' }, // Jaehaerys II + Shaera (siblings)
  { id: '22222222-1111-0000-0000-000000000003', member1Id: '22222222-0000-0000-0000-000000000005', member2Id: '22222222-0000-0000-0000-000000000006', type: 'MARRIAGE' }, // Aerys II + Rhaella (siblings)
  { id: '22222222-1111-0000-0000-000000000004', member1Id: '22222222-0000-0000-0000-000000000007', member2Id: '22222222-0000-0000-0000-000000000008', type: 'MARRIAGE' }, // Rhaegar + Elia
  { id: '22222222-1111-0000-0000-000000000005', member1Id: '22222222-0000-0000-0000-00000000000a', member2Id: '22222222-0000-0000-0000-00000000000b', type: 'MARRIAGE' }, // Daenerys + Drogo
];

const PARENT_CHILD: SeedParentChild[] = [
  // Aegon V + Betha -> Jaehaerys II, Rhaelle (existing), Shaera
  ['22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003'],
  ['22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003'],
  ['22222222-0000-0000-0000-000000000001', RHAELLE_ID],
  ['22222222-0000-0000-0000-000000000002', RHAELLE_ID],
  ['22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004'],
  ['22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004'],

  // Jaehaerys II + Shaera -> Aerys II, Rhaella
  ['22222222-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000005'],
  ['22222222-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000005'],
  ['22222222-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006'],
  ['22222222-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000006'],

  // Aerys II + Rhaella -> Rhaegar, Viserys, Daenerys
  ['22222222-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000007'],
  ['22222222-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000007'],
  ['22222222-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000009'],
  ['22222222-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000009'],
  ['22222222-0000-0000-0000-000000000005', '22222222-0000-0000-0000-00000000000a'],
  ['22222222-0000-0000-0000-000000000006', '22222222-0000-0000-0000-00000000000a'],

  // Rhaegar + Elia -> Rhaenys, baby Aegon
  ['22222222-0000-0000-0000-000000000007', '22222222-0000-0000-0000-00000000000c'],
  ['22222222-0000-0000-0000-000000000008', '22222222-0000-0000-0000-00000000000c'],
  ['22222222-0000-0000-0000-000000000007', '22222222-0000-0000-0000-00000000000d'],
  ['22222222-0000-0000-0000-000000000008', '22222222-0000-0000-0000-00000000000d'],
];

async function main() {
  console.log('Seeding House Targaryen...');
  await seedFamily(TREE_ID, MEMBERS, PARTNERSHIPS, PARENT_CHILD);
  console.log('House Targaryen seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => driver.close());

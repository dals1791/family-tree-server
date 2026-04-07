import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Stable seed IDs ──────────────────────────────────────────────────────────
// Fixed so the script is idempotent (safe to run multiple times)
const SEED = {
  user: {
    email: 'robert.baratheon@westeros.test',
    password: 'firstofhisname',
  },
  baratheon_tree_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  stark_tree_id: 'aaaaaaaa-0000-0000-0000-000000000002',
} as const;

async function main() {
  console.log('Seeding...');

  // ── 1. Create or fetch the Supabase Auth user ────────────────────────────
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  let userId: string;
  const existing = listData.users.find((u) => u.email === SEED.user.email);

  if (existing) {
    console.log(`Auth user already exists: ${existing.id}`);
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: SEED.user.email,
      password: SEED.user.password,
      email_confirm: true, // skip email verification for test account
    });
    if (createError) throw createError;
    userId = created.user.id;
    console.log(`Created auth user: ${userId}`);
  }

  // ── 2. Upsert Profile row ────────────────────────────────────────────────
  await prisma.profile.upsert({
    where: { id: userId },
    update: { email: SEED.user.email },
    create: { id: userId, email: SEED.user.email },
  });
  console.log('Profile upserted');

  // ── 3. House Baratheon Family Tree (OWNER) ───────────────────────────────
  await prisma.familyTree.upsert({
    where: { id: SEED.baratheon_tree_id },
    update: {},
    create: {
      id: SEED.baratheon_tree_id,
      name: 'House Baratheon Family Tree',
      description: 'Ours is the Fury.',
      ownerId: userId,
    },
  });
  await prisma.familyTreeAccess.upsert({
    where: { userId_treeId: { userId, treeId: SEED.baratheon_tree_id } },
    update: {},
    create: { userId, treeId: SEED.baratheon_tree_id, role: 'OWNER' },
  });
  console.log('House Baratheon tree + OWNER access upserted');

  // ── 4. House Stark Family Tree (VIEWER) ──────────────────────────────────
  await prisma.familyTree.upsert({
    where: { id: SEED.stark_tree_id },
    update: {},
    create: {
      id: SEED.stark_tree_id,
      name: 'House Stark Family Tree',
      description: 'Winter is Coming.',
      ownerId: userId,
    },
  });
  await prisma.familyTreeAccess.upsert({
    where: { userId_treeId: { userId, treeId: SEED.stark_tree_id } },
    update: {},
    create: { userId, treeId: SEED.stark_tree_id, role: 'VIEWER' },
  });
  console.log('House Stark tree + VIEWER access upserted');

  console.log('\nSeed complete!');
  console.log(`  Email:    ${SEED.user.email}`);
  console.log(`  Password: ${SEED.user.password}`);
  console.log(`  User ID:  ${userId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

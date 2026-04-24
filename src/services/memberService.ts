import neo4j from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { driver } from '../db/neo4j/client.js';
import { NotFoundError } from '../lib/errors.js';
import type { Member, MemberCreateInput, MemberUpdateInput } from '../types/member.js';

function nodeToMember(node: any): Member {
  const p = node.properties;
  return {
    id: p.id,
    treeId: p.treeId,
    firstName: p.firstName,
    lastName: p.lastName ?? undefined,
    maidenName: p.maidenName ?? undefined,
    gender: p.gender ?? undefined,
    birthDate: p.birthDate ?? undefined,
    birthYear: p.birthYear != null ? neo4j.integer.toNumber(p.birthYear) : undefined,
    deathDate: p.deathDate ?? undefined,
    deathYear: p.deathYear != null ? neo4j.integer.toNumber(p.deathYear) : undefined,
    status: p.status ?? 'UNCLAIMED',
    claimedByUserId: p.claimedByUserId ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export { nodeToMember };

export async function listMembers(treeId: string): Promise<Member[]> {
  const session = driver.session({ defaultAccessMode: 'READ' });
  try {
    const result = await session.run(
      `MATCH (m:Member {treeId: $treeId}) RETURN m ORDER BY m.lastName, m.firstName`,
      { treeId },
    );
    return result.records.map((r) => nodeToMember(r.get('m')));
  } finally {
    await session.close();
  }
}

export async function getMember(treeId: string, memberId: string): Promise<Member> {
  const session = driver.session({ defaultAccessMode: 'READ' });
  try {
    const result = await session.run(
      `MATCH (m:Member {id: $memberId, treeId: $treeId}) RETURN m`,
      { memberId, treeId },
    );
    if (result.records.length === 0) throw new NotFoundError('Member not found');
    return nodeToMember(result.records[0].get('m'));
  } finally {
    await session.close();
  }
}

export async function createMember(treeId: string, input: MemberCreateInput): Promise<Member> {
  const session = driver.session();
  try {
    const now = new Date().toISOString();
    const result = await session.run(
      `CREATE (m:Member $props) RETURN m`,
      {
        props: {
          id: randomUUID(),
          treeId,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          maidenName: input.maidenName ?? null,
          gender: input.gender ?? null,
          birthDate: input.birthDate ?? null,
          birthYear: input.birthYear != null ? neo4j.int(input.birthYear) : null,
          deathDate: input.deathDate ?? null,
          deathYear: input.deathYear != null ? neo4j.int(input.deathYear) : null,
          status: 'UNCLAIMED',
          claimedByUserId: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    );
    return nodeToMember(result.records[0].get('m'));
  } finally {
    await session.close();
  }
}

export async function updateMember(
  treeId: string,
  memberId: string,
  input: MemberUpdateInput,
): Promise<Member> {
  const session = driver.session();
  try {
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (input.firstName !== undefined) updates.firstName = input.firstName;
    if (input.lastName !== undefined) updates.lastName = input.lastName;
    if (input.maidenName !== undefined) updates.maidenName = input.maidenName;
    if (input.gender !== undefined) updates.gender = input.gender;
    if (input.birthDate !== undefined) updates.birthDate = input.birthDate;
    if (input.birthYear !== undefined) updates.birthYear = neo4j.int(input.birthYear);
    if (input.deathDate !== undefined) updates.deathDate = input.deathDate;
    if (input.deathYear !== undefined) updates.deathYear = neo4j.int(input.deathYear);

    const result = await session.run(
      `MATCH (m:Member {id: $memberId, treeId: $treeId}) SET m += $updates RETURN m`,
      { memberId, treeId, updates },
    );
    if (result.records.length === 0) throw new NotFoundError('Member not found');
    return nodeToMember(result.records[0].get('m'));
  } finally {
    await session.close();
  }
}

export async function deleteMember(treeId: string, memberId: string): Promise<void> {
  const session = driver.session();
  try {
    // Check existence first
    const check = await session.run(
      `MATCH (m:Member {id: $memberId, treeId: $treeId}) RETURN m.id`,
      { memberId, treeId },
    );
    if (check.records.length === 0) throw new NotFoundError('Member not found');

    // Delete member + any partnerships they belong to
    await session.run(
      `MATCH (m:Member {id: $memberId, treeId: $treeId})
       OPTIONAL MATCH (m)-[:PARTNERED_WITH]->(p:Partnership)
       WITH m, collect(p) as partnerships
       DETACH DELETE m
       WITH partnerships
       UNWIND partnerships as p
       DETACH DELETE p`,
      { memberId, treeId },
    );
  } finally {
    await session.close();
  }
}

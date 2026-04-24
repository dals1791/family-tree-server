import { driver } from '../db/neo4j/client.js';
import { NotFoundError } from '../lib/errors.js';
import { nodeToMember } from './memberService.js';
import type { FamilyGraphPayload, ParentEdge, PartnershipEdge } from '../types/graph.js';

/**
 * Returns a flat FamilyGraphPayload centered on anchorId.
 *
 * Visibility by generation:
 *   +2  direct grandparents + their partners
 *   +1  parents + parent siblings + their partners
 *    0  anchor + siblings + all partners
 *   -1  children + their partners
 *   -2  grandchildren + their partners
 */
export async function getGraph(treeId: string, anchorId: string): Promise<FamilyGraphPayload> {
  const session = driver.session({ defaultAccessMode: 'READ' });
  try {
    // 1. Verify anchor exists
    const anchorResult = await session.run(
      `MATCH (m:Member {id: $anchorId, treeId: $treeId}) RETURN m`,
      { anchorId, treeId },
    );
    if (anchorResult.records.length === 0) throw new NotFoundError('Member not found');
    const anchor = anchorResult.records[0].get('m');

    // 2. Parents (gen +1)
    const parentsResult = await session.run(
      `MATCH (anchor:Member {id: $anchorId, treeId: $treeId})-[:CHILD_OF]->(p:Member) RETURN DISTINCT p`,
      { anchorId, treeId },
    );
    const parents = parentsResult.records.map((r) => r.get('p'));
    const parentIds = parents.map((n: any) => n.properties.id as string);

    // 3. Grandparents (gen +2)
    let grandparents: any[] = [];
    if (parentIds.length > 0) {
      const gpResult = await session.run(
        `UNWIND $parentIds as pid
         MATCH (p:Member {id: pid})-[:CHILD_OF]->(gp:Member) RETURN DISTINCT gp`,
        { parentIds },
      );
      grandparents = gpResult.records.map((r) => r.get('gp'));
    }
    const grandparentIds = grandparents.map((n: any) => n.properties.id as string);

    // 4. Children (gen -1)
    const childrenResult = await session.run(
      `MATCH (child:Member)-[:CHILD_OF]->(anchor:Member {id: $anchorId, treeId: $treeId}) RETURN DISTINCT child`,
      { anchorId, treeId },
    );
    const children = childrenResult.records.map((r) => r.get('child'));
    const childIds = children.map((n: any) => n.properties.id as string);

    // 5. Grandchildren (gen -2)
    let grandchildren: any[] = [];
    if (childIds.length > 0) {
      const gcResult = await session.run(
        `UNWIND $childIds as cid
         MATCH (gc:Member)-[:CHILD_OF]->(c:Member {id: cid, treeId: $treeId}) RETURN DISTINCT gc`,
        { childIds, treeId },
      );
      grandchildren = gcResult.records.map((r) => r.get('gc'));
    }

    // 6. Anchor siblings (share a parent, gen 0)
    let anchorSibs: any[] = [];
    if (parentIds.length > 0) {
      const sibResult = await session.run(
        `UNWIND $parentIds as pid
         MATCH (sib:Member)-[:CHILD_OF]->(p:Member {id: pid})
         WHERE sib.id <> $anchorId
         RETURN DISTINCT sib`,
        { parentIds, anchorId },
      );
      anchorSibs = sibResult.records.map((r) => r.get('sib'));
    }

    // 7. Parent siblings (share a grandparent, gen +1)
    let parentSibs: any[] = [];
    if (grandparentIds.length > 0) {
      const pSibResult = await session.run(
        `UNWIND $grandparentIds as gpid
         MATCH (sib:Member)-[:CHILD_OF]->(gp:Member {id: gpid})
         WHERE NOT sib.id IN $parentIds
         RETURN DISTINCT sib`,
        { grandparentIds, parentIds },
      );
      parentSibs = pSibResult.records.map((r) => r.get('sib'));
    }

    // Build deduplicated core member map
    const memberMap = new Map<string, any>();
    for (const node of [anchor, ...parents, ...grandparents, ...children, ...grandchildren, ...anchorSibs, ...parentSibs]) {
      if (node) memberMap.set(node.properties.id, node);
    }
    const coreIds = Array.from(memberMap.keys());

    // 8. Partnerships involving any core member
    const partnerResult = await session.run(
      `UNWIND $memberIds as mId
       MATCH (m:Member {id: mId})-[:PARTNERED_WITH]->(p:Partnership {treeId: $treeId})<-[:PARTNERED_WITH]-(partner:Member {treeId: $treeId})
       RETURN DISTINCT p, m.id as mId, partner.id as partnerId, partner as partnerNode`,
      { memberIds: coreIds, treeId },
    );

    // Collect partner nodes + partnership edges (dedup by partnership id)
    const partnershipMap = new Map<string, PartnershipEdge>();
    for (const record of partnerResult.records) {
      const pProps = record.get('p').properties;
      const mId = record.get('mId') as string;
      const partnerId = record.get('partnerId') as string;
      const partnerNode = record.get('partnerNode');

      if (!memberMap.has(partnerId)) memberMap.set(partnerId, partnerNode);

      if (!partnershipMap.has(pProps.id)) {
        const [m1Id, m2Id] = mId < partnerId ? [mId, partnerId] : [partnerId, mId];
        partnershipMap.set(pProps.id, {
          id: pProps.id,
          member1Id: m1Id,
          member2Id: m2Id,
          type: pProps.type ?? undefined,
          startDate: pProps.startDate ?? undefined,
          endDate: pProps.endDate ?? undefined,
        });
      }
    }

    const allMemberIds = Array.from(memberMap.keys());

    // 9. Parent edges within the full member set
    const parentEdgeResult = await session.run(
      `UNWIND $memberIds as childId
       MATCH (child:Member {id: childId, treeId: $treeId})-[:CHILD_OF]->(parent:Member {treeId: $treeId})
       WHERE parent.id IN $memberIds
       RETURN child.id as childId, parent.id as parentId`,
      { memberIds: allMemberIds, treeId },
    );

    const parentEdges: ParentEdge[] = parentEdgeResult.records.map((r) => ({
      childId: r.get('childId') as string,
      parentId: r.get('parentId') as string,
    }));

    return {
      anchorId,
      members: Array.from(memberMap.values()).map(nodeToMember),
      parentEdges,
      partnershipEdges: Array.from(partnershipMap.values()),
    };
  } finally {
    await session.close();
  }
}

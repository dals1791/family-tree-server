// Stub — full definitions added when Neo4j member routes are built

export interface Member {
  id: string;
  treeId: string;
  firstName: string;
  lastName?: string;
  birthYear?: number;
  deathYear?: number;
  claimedByUserId?: string;
}

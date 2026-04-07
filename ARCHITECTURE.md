# Family Tree App — Architecture & Context

This document captures all key architectural decisions made during planning.
Read this before making any changes to the codebase.

---

## What This App Is

A collaborative family tree application. Users can build family trees, invite
others to view or edit them, and claim themselves within a tree. The core
differentiator is the graph-based navigation model — clicking any person
recenters the view around them and their immediate family network.

---

## Repo Structure

Two separate repos, independently deployed:

```
family-tree-server/   →   Hono API (Node.js)  →   Railway / Render / Fly.io
family-tree-client/   →   Next.js (App Router) →  Vercel
```

Types are currently duplicated between repos (accepted tradeoff while the API
is still moving). Plan to consolidate into a monorepo or shared package once
the API stabilizes.

---

## Tech Stack

| Layer         | Technology                        | Why                                              |
|---------------|-----------------------------------|--------------------------------------------------|
| API server    | Hono                              | Lightweight, first-class TS, Express-like DX     |
| Auth          | Supabase Auth                     | Handles OAuth, magic links, sessions             |
| Relational DB | Postgres via Supabase             | Auth, access control, invitations                |
| ORM           | Prisma                            | Type-safe Postgres queries, migrations           |
| Graph DB      | Neo4j AuraDB                      | Family member nodes and relationships            |
| Client        | Next.js 14 App Router             | Server components + client components            |
| Client state  | Zustand                           | Normalized graph state on client                 |
| Validation    | Zod                               | Shared schemas, used in both server and client   |
| Deployment    | Railway (server), Vercel (client) |                                                  |

---

## Database Architecture

### The Split

**Postgres (Supabase) — access control and auth metadata only:**
- Who exists (Users/Profiles)
- Who can access which tree and at what role
- Pending invitations

**Neo4j — all family graph data:**
- Member nodes (people)
- CHILD_OF relationships (parent → child direction)
- Partnership nodes and PARTNERED_WITH / INCLUDES relationships
- Every Neo4j node carries a `treeId` property to scope queries

The key rule: **Postgres is the auth authority. Neo4j is the graph authority.**
Never check permissions in Neo4j. Never store family graph data in Postgres.

### Why This Split

The permission/collaboration layer (users, roles, invitations) is fundamentally
relational data. The family graph (traversal, path-finding, relationship queries)
is fundamentally graph data. Each database does what it's best at.

Neo4j nodes are full data nodes — not thin reference nodes — because family tree
queries are always anchored to a specific member and traverse outward, which is
exactly what graph databases are optimized for.

### Postgres Schema (Prisma)

```
Profile              — extends Supabase auth.users (1:1, created via trigger)
FamilyTree           — tree metadata (name, description, ownerId)
FamilyTreeAccess     — join table: userId + treeId + role
Invitation           — pending invites with token, email, optional memberId
```

The `Profile` row is created automatically by a Supabase database trigger
whenever a user signs up. Never create Profile rows manually.

### Neo4j Schema

```cypher
// Nodes
(:Member {
  id,               // UUID — same format as Postgres UUIDs
  treeId,           // scopes this member to a specific tree
  firstName,
  lastName,
  maidenName,
  gender,           // MALE | FEMALE | OTHER | PREFER_NOT_TO_SAY
  birthDate,        // ISO date string YYYY-MM-DD
  birthYear,        // integer — when full date unknown
  deathDate,
  status,           // UNCLAIMED | INVITED | CLAIMED
  claimedByUserId,  // Postgres Profile.id of the user who claimed this member
  createdAt,
  updatedAt
})

(:Partnership {
  id,
  treeId,
  type,             // MARRIAGE | DOMESTIC_PARTNERSHIP | DIVORCED | SEPARATED
  startDate,
  endDate,
  createdAt
})

// Relationships
(child:Member)-[:CHILD_OF]->(parent:Member)
(member:Member)-[:PARTNERED_WITH]->(p:Partnership)-[:INCLUDES]->(partner:Member)
```

**Relationship direction convention:**
- `CHILD_OF` always points from child TO parent
- `PARTNERED_WITH` / `INCLUDES` form a hub pattern through the Partnership node
  so partnership metadata (type, dates) can be stored and queried

### Neo4j Constraints (must be applied once)

```cypher
CREATE CONSTRAINT member_id_unique IF NOT EXISTS FOR (m:Member) REQUIRE m.id IS UNIQUE
CREATE CONSTRAINT partnership_id_unique IF NOT EXISTS FOR (p:Partnership) REQUIRE p.id IS UNIQUE
CREATE INDEX member_tree_id IF NOT EXISTS FOR (m:Member) ON (m.treeId)
CREATE INDEX member_id_tree IF NOT EXISTS FOR (m:Member) ON (m.id, m.treeId)
CREATE INDEX member_claimed_by IF NOT EXISTS FOR (m:Member) ON (m.claimedByUserId)
CREATE FULLTEXT INDEX member_name_search IF NOT EXISTS FOR (m:Member) ON EACH [m.firstName, m.lastName, m.maidenName]
```

---

## Access Control Model

Three roles per tree. Roles are stored in `FamilyTreeAccess` in Postgres.

```
OWNER   — full control: invite, remove, change roles, delete tree
EDITOR  — add/edit members and relationships, cannot manage access
VIEWER  — read only. Can still claim themselves and edit their own claimed member
```

**Claimed status is orthogonal to role.** A VIEWER can claim themselves. A claimed
member can always edit their own node data regardless of role.

**Auth flow on every request:**
1. Client sends `Authorization: Bearer <supabase_jwt>`
2. `authMiddleware` verifies JWT via Supabase, extracts `userId`
3. `requireRole(minimum)` middleware checks `FamilyTreeAccess` in Postgres
4. Service function runs with `userId` as trusted identity

**Never skip the middleware.** Every service function assumes auth has already
been checked by the middleware layer. Services do not re-check permissions
except for ownership-specific operations (e.g. "can only unclaim own member
unless OWNER").

---

## Server Repo Structure

```
family-tree-server/
├── src/
│   ├── index.ts                  # Hono app, route mounting, global middleware
│   ├── middleware/
│   │   ├── auth.ts               # Verifies Supabase JWT, sets userId in context
│   │   ├── requireRole.ts        # Checks FamilyTreeAccess, asserts minimum role
│   │   └── errorHandler.ts       # Global error handler, consistent JSON errors
│   ├── routes/
│   │   ├── trees.ts              # /api/trees and /api/trees/:treeId
│   │   ├── members.ts            # /api/trees/:treeId/members
│   │   ├── relationships.ts      # /api/trees/:treeId/relationships
│   │   ├── invitations.ts        # /api/trees/:treeId/invitations + /api/invitations/accept
│   │   ├── claims.ts             # /api/trees/:treeId/claims
│   │   └── traversal.ts          # /api/trees/:treeId/graph/:anchorId
│   ├── services/                 # All business logic — only layer that touches DB
│   │   ├── treeService.ts        # Postgres: tree CRUD, access management
│   │   ├── memberService.ts      # Neo4j: member node CRUD
│   │   ├── relationshipService.ts# Neo4j: CHILD_OF edges, Partnership nodes
│   │   ├── invitationService.ts  # Postgres: invite lifecycle, token generation
│   │   ├── claimService.ts       # Neo4j: link userId to member node
│   │   └── traversalService.ts   # Neo4j: neighborhood traversal query
│   ├── db/
│   │   ├── postgres/client.ts    # Prisma singleton
│   │   └── neo4j/
│   │       ├── client.ts         # Neo4j driver singleton + read/write helpers
│   │       └── constraints.ts    # One-time constraint setup script
│   ├── lib/
│   │   ├── errors.ts             # AppError, UnauthorizedError, ForbiddenError, etc.
│   │   └── supabase.ts           # Supabase admin client (service role key)
│   └── types/
│       ├── tree.ts               # FamilyTree, AccessRole, FamilyTreeWithRole
│       ├── member.ts             # Member, MemberCreateInput, MemberUpdateInput
│       ├── graph.ts              # FamilyGraphPayload, NormalizedFamilyGraph, normalizeGraph()
│       └── api.ts                # All request/response body shapes
├── prisma/schema.prisma
└── supabase/setup.sql            # Trigger + RLS policies — run in Supabase SQL editor
```

**The rule:** Routes import from services. Services import from db/. Nothing
else imports from db/ directly. Pages and components never touch the database.

---

## API Endpoints

All routes require `Authorization: Bearer <supabase_jwt>`.
Role annotations show minimum required role for write operations.

```
# Trees
GET    /api/trees                                    — user's trees
POST   /api/trees                                    — create tree
GET    /api/trees/:treeId                            — get tree (VIEWER)
PATCH  /api/trees/:treeId                            — update metadata (OWNER)
DELETE /api/trees/:treeId                            — delete tree (OWNER)
GET    /api/trees/:treeId/access                     — list who has access (VIEWER)
PATCH  /api/trees/:treeId/access/:userId             — change role (OWNER)
DELETE /api/trees/:treeId/access/:userId             — remove access (OWNER)

# Members
GET    /api/trees/:treeId/members                    — list all members (VIEWER)
POST   /api/trees/:treeId/members                    — add member (EDITOR)
GET    /api/trees/:treeId/members/:memberId          — get member (VIEWER)
PATCH  /api/trees/:treeId/members/:memberId          — update member (EDITOR)
DELETE /api/trees/:treeId/members/:memberId          — delete member (EDITOR)

# Relationships
POST   /api/trees/:treeId/relationships/parent-child              — add (EDITOR)
DELETE /api/trees/:treeId/relationships/parent-child              — remove (EDITOR)
POST   /api/trees/:treeId/relationships/partnerships              — add (EDITOR)
PATCH  /api/trees/:treeId/relationships/partnerships/:id          — update (EDITOR)
DELETE /api/trees/:treeId/relationships/partnerships/:id          — remove (EDITOR)

# Invitations
GET    /api/trees/:treeId/invitations                — list invites (OWNER)
POST   /api/trees/:treeId/invitations                — send invite (OWNER)
DELETE /api/trees/:treeId/invitations/:id            — revoke invite (OWNER)
POST   /api/invitations/accept                       — accept by token (any authed user)

# Claims
GET    /api/trees/:treeId/claims/me                  — my claimed member (VIEWER)
POST   /api/trees/:treeId/claims                     — claim a member (VIEWER)
DELETE /api/trees/:treeId/claims/:memberId           — unclaim (VIEWER, or OWNER for any)

# Graph
GET    /api/trees/:treeId/graph/:anchorId            — neighborhood traversal (VIEWER)
```

---

## Traversal Query Logic

The main read path. Returns a flat `FamilyGraphPayload` centered on an anchor member.

**Visibility rules by generation:**
```
Gen +2  direct grandparents + their partners only (no great-aunts/uncles)
Gen +1  parents + their siblings + siblings' partners
Gen  0  anchor + their siblings + all partners
Gen -1  children + their partners
Gen -2  grandchildren + their partners only
```

This keeps typical node counts in the 18–40 range for a real family.

**Return shape — always flat, never nested:**
```typescript
interface FamilyGraphPayload {
  anchorId: string
  members: Member[]           // flat array
  parentEdges: ParentEdge[]   // { childId, parentId }
  partnershipEdges: PartnershipEdge[]  // { id, member1Id, member2Id, type, startDate, endDate }
}
```

**Client normalization** (`normalizeGraph()` in `types/graph.ts`):
Converts the flat payload into indexed lookup maps on receipt:
```typescript
interface NormalizedFamilyGraph {
  members: Record<string, Member>       // O(1) lookup by id
  childrenOf: Record<string, string[]>  // memberId → [childIds]
  parentsOf: Record<string, string[]>   // memberId → [parentIds]
  partnersOf: Record<string, string[]>  // memberId → [partnerIds]
  siblingsOf: Record<string, string[]>  // memberId → [siblingIds]
}
```

Clicking a node re-fetches `GET /api/trees/:treeId/graph/:newAnchorId`.
The graph animates to the new center rather than doing a hard cut.

---

## Invitation & Claim Flow

**Inviting someone:**
1. OWNER calls `POST /api/trees/:treeId/invitations` with email, role, optional memberId
2. Server generates a secure random token, stores invitation in Postgres
3. In development: token is returned in response for manual testing
4. In production: token goes out via email as `{CLIENT_URL}/invite/{token}`
5. The invited person clicks the link, authenticates, hits `POST /api/invitations/accept`
6. Server grants `FamilyTreeAccess`, marks invitation ACCEPTED
7. If `memberId` was set on the invitation, client prompts the user to claim that member

**Claiming a member:**
1. User calls `POST /api/trees/:treeId/claims` with a memberId
2. Server checks: user hasn't already claimed someone in this tree
3. Server checks: target member is still UNCLAIMED (`claimedByUserId IS NULL`)
4. Sets `claimedByUserId = userId` and `status = 'CLAIMED'` on the Neo4j node
5. One claim per user per tree. First-come-first-served. Disputes go to tree owner.

**Email sending** is not yet implemented. The service is structured to accept
a Resend or SendGrid call after invitation creation. This is the next piece to add.

---

## MVP Scope (Current)

What is built:
- Fully isolated trees (no cross-tree linking)
- Invite people with OWNER / EDITOR / VIEWER roles
- Claim a member node within a tree
- Full CRUD for members and relationships
- Neighborhood traversal query

What is explicitly NOT built yet (planned for later):
- Cross-tree references and linked nodes
- Email delivery (token returned in dev mode only)
- Stripe payments / subscription gating
- Graph visualization (client work)
- Real-time updates
- Member search across a tree

---

## Decisions Made — Do Not Revisit Without Good Reason

**No Apollo / GraphQL.** The original codebase used a Neo4j-generated GraphQL
server. This was replaced with a direct Hono REST API + Neo4j driver. The
generated GraphQL layer abstracted away the thing that makes Neo4j worth using
(raw Cypher traversals). All Cypher is written directly in service files.

**FamilyTree metadata lives in Postgres, not Neo4j.** Every auth check needs
the tree record. Keeping it in Postgres means no cross-database hop on every
request. Neo4j nodes use `treeId` as a property to scope queries.

**Flat graph payload, normalize on client.** The traversal endpoint returns a
flat list of members and edges. The client runs `normalizeGraph()` once and
builds indexed lookup maps. This avoids deeply nested GraphQL-style responses
and makes client-side relationship queries O(1).

**Supabase for auth, not NextAuth.** The invitation flow (send → token → accept
→ claim) maps naturally onto Supabase Auth's infrastructure. Building the same
flow with NextAuth would have required significant custom work.

**Two repos, not a monorepo.** Chosen for clean separation during early
development. Types are duplicated (accepted tradeoff). Plan to consolidate
into a monorepo or shared `@family-tree/types` package once the API stabilizes.

---

## Environment Variables

### Server (.env)
```
DATABASE_URL              # Supabase pooled connection (PgBouncer)
DIRECT_URL                # Supabase direct connection (for migrations)
SUPABASE_URL              # https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY # Server-only — never expose to client
NEO4J_URI                 # neo4j+s://[id].databases.neo4j.io
NEO4J_USERNAME            # neo4j
NEO4J_PASSWORD            # [password]
PORT                      # 3001
CLIENT_URL                # http://localhost:3000 (for CORS)
```

### Client (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL       # https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Public anon key (safe to expose)
NEXT_PUBLIC_API_URL            # http://localhost:3001 (server URL)
```

---

## What To Build Next

In rough priority order:

1. **Client repo setup** — Next.js App Router, Supabase Auth, API client layer
2. **Auth flow** — login, signup, session middleware, redirect on unauthed
3. **Dashboard** — list user's trees, create tree UI
4. **Tree view** — member list, add member form, add relationship UI
5. **Graph visualization** — react-flow canvas, anchor-based navigation
6. **Invitation UI** — send invite form, accept invite page, claim prompt
7. **Email delivery** — Resend integration in invitationService
8. **Payments** — Stripe checkout, subscription gating on tree/member limits

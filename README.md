# family-tree-server

Hono REST API for the Family Tree app. Handles auth, tree management, and (soon) graph traversal.

## Stack

| Layer | Technology |
|-------|-----------|
| HTTP Framework | [Hono](https://hono.dev/) on Node.js |
| Auth | Supabase Auth (JWT verification) |
| Relational DB | Postgres via Supabase + Prisma ORM |
| Graph DB | Neo4j AuraDB (not yet wired) |
| Validation | Zod |

## Project Structure

```
src/
  index.ts                  — App entry, CORS, routes, error handler
  lib/
    errors.ts               — Typed error classes (UnauthorizedError, ForbiddenError, etc.)
    supabase.ts             — Supabase admin client (service role, server-only)
  db/
    postgres/client.ts      — Prisma singleton
    neo4j/client.ts         — Neo4j client (stub, not yet implemented)
  middleware/
    auth.ts                 — Verifies Supabase JWT, sets userId on context
    requireRole.ts          — Checks user has minimum role on a tree
    errorHandler.ts         — Maps AppError → HTTP status
  routes/
    trees.ts                — Tree CRUD + access management (8 endpoints, fully working)
    members.ts              — 501 stub
    relationships.ts        — 501 stub
    invitations.ts          — 501 stub
    claims.ts               — 501 stub
    traversal.ts            — 501 stub
  services/
    treeService.ts          — All Prisma queries (routes never call Prisma directly)
  types/
    tree.ts                 — AccessRole, FamilyTree interfaces
    member.ts               — Member shape
    graph.ts                — FamilyGraphPayload (for traversal endpoint)
    api.ts                  — Shared API response types
prisma/
  schema.prisma             — Profile, FamilyTree, FamilyTreeAccess, Invitation models
  seed.ts                   — Game of Thrones test data
```

## Environment Variables

Create a `.env` file in this directory:

```env
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxxx:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> `SUPABASE_SERVICE_ROLE_KEY` is the secret service role key — never expose this to the client.

## Commands

```bash
npm run dev          # Start with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled build

npx prisma db push   # Sync schema to Supabase (use instead of migrate dev — see note below)
npx prisma db seed   # Seed test data (Baratheons)
npx prisma studio    # Browse the database in a UI
```

> **Note on migrations:** `prisma migrate dev` requires a direct Postgres connection for advisory locking.
> Supabase's direct connection (`db.*.supabase.co`) is IPv6-only on the free tier.
> Use `prisma db push` to sync schema changes instead.

## Auth

Every request requires either:

**A. Supabase Bearer token (production/real auth):**
```
Authorization: Bearer <supabase_jwt>
```

**B. Dev bypass header (non-production only):**
```
X-Dev-User-Id: <any-uuid>
```

The dev bypass is disabled in `NODE_ENV=production`.

## Access Roles

Three roles per tree, checked via `requireRole()` middleware:

| Role | Permissions |
|------|------------|
| `OWNER` | Full control including deleting tree and managing access |
| `EDITOR` | Add/edit members and relationships |
| `VIEWER` | Read only (can also claim themselves) |

## API Endpoints

### Trees

| Method | Path | Role Required | Description |
|--------|------|--------------|-------------|
| GET | `/api/trees` | — | List trees for the authenticated user |
| POST | `/api/trees` | — | Create a new tree |
| GET | `/api/trees/:treeId` | VIEWER | Get a single tree |
| PATCH | `/api/trees/:treeId` | OWNER | Update tree name/description |
| DELETE | `/api/trees/:treeId` | OWNER | Delete a tree |
| GET | `/api/trees/:treeId/access` | VIEWER | List all access entries |
| PATCH | `/api/trees/:treeId/access/:userId` | OWNER | Update a user's role |
| DELETE | `/api/trees/:treeId/access/:userId` | OWNER | Remove a user's access |

### Other Routes (not yet implemented — return 501)

- `POST /api/trees/:treeId/members`
- `GET /api/trees/:treeId/graph/:anchorId`
- `POST /api/trees/:treeId/relationships`
- `POST /api/trees/:treeId/invitations`
- `POST /api/trees/:treeId/claims`

## Local Testing

Start the server:
```bash
npm run dev
```

### Using the dev bypass header

List trees for the seeded user:
```bash
curl http://localhost:3001/api/trees \
  -H "X-Dev-User-Id: 2e9dbe1d-81a7-4335-90e2-8c60ccf6009a"
```

Create a tree:
```bash
curl -X POST http://localhost:3001/api/trees \
  -H "X-Dev-User-Id: 2e9dbe1d-81a7-4335-90e2-8c60ccf6009a" \
  -H "Content-Type: application/json" \
  -d '{"name": "House Targaryen Family Tree", "description": "Fire and Blood."}'
```

Get a specific tree:
```bash
curl http://localhost:3001/api/trees/aaaaaaaa-0000-0000-0000-000000000001 \
  -H "X-Dev-User-Id: 2e9dbe1d-81a7-4335-90e2-8c60ccf6009a"
```

Test role enforcement (VIEWER trying to delete — should return 403):
```bash
curl -X DELETE http://localhost:3001/api/trees/aaaaaaaa-0000-0000-0000-000000000002 \
  -H "X-Dev-User-Id: 2e9dbe1d-81a7-4335-90e2-8c60ccf6009a"
```

Test no auth (should return 401):
```bash
curl http://localhost:3001/api/trees
```

### Using a real Supabase JWT

Log in via the client app to get a token, then:
```bash
curl http://localhost:3001/api/trees \
  -H "Authorization: Bearer <your_jwt_here>"
```

### Seed data reference

| | |
|--|--|
| Email | `robert.baratheon@westeros.test` |
| Password | `firstofhisname` |
| User ID | `2e9dbe1d-81a7-4335-90e2-8c60ccf6009a` |
| Tree 1 | `aaaaaaaa-0000-0000-0000-000000000001` — House Baratheon (OWNER) |
| Tree 2 | `aaaaaaaa-0000-0000-0000-000000000002` — House Stark (VIEWER) |

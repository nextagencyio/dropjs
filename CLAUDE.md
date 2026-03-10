# CLAUDE.md — drop.js

## What This Is

A Node.js CMS framework inspired by Drupal 11. The data layer is portable — the same database schema works in both Node.js and Drupal 11 (SQLite, PostgreSQL/Supabase).

## Commands

```bash
npm run dev          # Dev server with hot reload (tsx)
npm run build        # Compile TS + build Next.js admin UI
npm run serve        # Production server (pre-built)
npm test             # Unit tests (vitest)
npm run test:e2e     # E2E tests (playwright)
npm run typecheck    # Type check server code only
```

## Architecture

**Custom HTTP server** (not Express) in `src/cli/commands/dev.ts`. Routes `/api/*` to the API handler, everything else to Next.js.

```
src/api/          REST API, request handling, middleware, OpenAPI, GraphQL
src/auth/         Users, roles, permissions, sessions, CSRF, rate limiting
src/core/         Entity system, config, event bus, cron, Views, cache, Drupal compat
src/field/        18 field types, storage engine, validation, revision tables
src/db/           Database abstraction (Knex), SQLite/PostgreSQL
src/cli/          CLI commands (dev, serve, build, migrate)
src/bin/          CLI entry point (drop.ts → commander)
src/app/          Next.js admin UI + public frontend (React 19, App Router)
src/components/   Admin UI components
src/lib/          Client-side API utilities + server-side fetch utility
src/migrate/      Drupal migration tools
```

### Key Files

- `src/api/init.ts` — Bootstrap (DB, entity types, auth, hooks, cron, queues)
- `src/api/route-table.ts` — All API route definitions
- `src/api/request-handler.ts` — HTTP request dispatcher
- `src/core/entity.ts` — Entity CRUD, query builder
- `src/core/entity-types.ts` — Entity type registry, JSON config loading
- `src/field/field-storage.ts` — Field table management, serialization
- `src/auth/user.ts` — User CRUD, password hashing
- `src/auth/access.ts` — Permission checks
- `src/cli/commands/dev.ts` — Dev server entry point
- `src/bin/drop.ts` — CLI binary (commander)

### Key Patterns

- **Entity config** lives in `config/entity_types/*.json`
- **DB config** loaded from `drop.config.js` in cwd, with env var overrides
- **Next.js dir** resolves to the package root (not cwd) so admin UI works when installed as dependency
- **Auto-invoke guards** on dev.ts/serve.ts — only self-execute when run directly, not when imported by CLI
- **Initialization** is lazy singleton via `ensureInitialized()` — safe to call multiple times

## Testing

- **Unit tests:** `tests/unit/` — 176 tests across 10 files (vitest)
- **E2E tests:** `tests/e2e/` — 354+ tests across 39 specs (playwright)
- **Test fixtures:** `tests/e2e/fixtures.ts` — `authenticatedPage` handles login
- **Seeded admin:** `admin` / `DropJs2024Admin`
- **Clean DB for E2E:** `DROP_CLEAN_DB=1` env var
- **Always test with Playwright before giving URLs to user**

## Important Rules

- Default site name is `drop.js` (lowercase)
- Image fields auto-add `url`, `thumbnail_url`, `medium_url`, `large_url` on deserialize
- Legacy Express server at `src/api/server.ts` is dead code — not used
- `Entity.load(entityType, id)` works without specifying bundle
- All public pages are server-rendered (Next.js server components) for SEO
- `basePath` is NOT set — all routes at root (e.g., `/node/1/edit`, `/login`)

# drop.js

A Node.js CMS framework inspired by Drupal's best ideas, built for AI-assisted development.

> Define content types in JSON. Get JSON:API, GraphQL, and GraphQL Compose endpoints instantly. Migrate from Drupal with one command.

## Why drop.js?

Drupal's entity/field architecture is powerful — but it's PHP, heavy, and hard to customize. drop.js takes the best parts and rebuilds them in TypeScript:

- **Entity/field system** — Content types with configurable fields, Drupal-compatible multi-table storage
- **Revision system** — Every content change tracked with full revision history, diff, and revert
- **Taxonomy system** — Vocabularies and terms with hierarchical parent-child relationships
- **Database agnostic** — SQLite for dev, PostgreSQL/Supabase for production — swap with one config change or `DATABASE_URL`
- **Drupal schema compatibility** — Node, taxonomy, media, and block tables mirror Drupal's structure exactly — verified for both reads and writes
- **Auto-generated API** — Every entity type gets JSON:API and GraphQL endpoints automatically
- **OpenAPI/Swagger** — Auto-generated API documentation at `/api/docs`
- **Views system** — Drupal Views-inspired configurable list builder with filters, sorts, pagination, exposed parameters, and live preview
- **Block/Region system** — Layout management with visibility conditions, block placements, 8 default regions
- **Comments** — Threaded commenting on any entity type with Drupal-style thread ordering
- **Display modes** — View modes (full, teaser, search_result) with per-entity-type field display configuration
- **CORS** — Configurable cross-origin resource sharing with credential support and preflight handling
- **Input sanitization** — Server-side HTML purification stripping XSS vectors (scripts, event handlers, javascript: URLs) while preserving safe markup
- **Cache system** — In-memory cache with Drupal-style tag-based invalidation, named bins, entity/config cache wiring with automatic invalidation on CRUD
- **Admin UI** — Full React admin panel covering content, structure, views, menus, blocks, comments, configuration, webhooks, languages, layout builder, URL patterns (pathauto), reports, media, user management, registration, password reset, content preview, REST resource management, actions/triggers, contact forms, and shortcuts
- **Menu system** — Hierarchical navigation menus with drag-and-drop ordering, config-based storage
- **Cron scheduler** — Tick-based job scheduler with EventBus integration and admin API
- **Webhook system** — HTTP webhooks for entity lifecycle and system events with HMAC signing
- **Module system** — Drupal-style extensible module architecture with route/middleware contribution, event hooks, dependency management, and enable/disable persistence
- **Media library** — File uploads with image style processing, grid browser, search, and bulk operations
- **URL aliases** — Human-readable paths with auto-generation on entity create/update and middleware-based resolution
- **Config sync** — Import/export all configuration as JSON, diff incoming config against current state
- **Content workflow** — Drupal-style content moderation with configurable states (draft/review/published/archived), transitions, and moderation history tracking
- **Multilingual** — 16 default languages, translation CRUD, language negotiation (query param, Accept-Language, default), automatic fallback to default language
- **GraphQL** — Full GraphQL API with dynamic schema generation from entity types, queries, mutations, introspection, and built-in playground
- **Layout Builder** — Configurable page layouts with sections (5 layout types), components, region-based placement, and server-side rendering
- **Scheduled Publishing** — Time-based content state transitions with cron processing — schedule publish/unpublish at a future date
- **Content Locking** — Pessimistic edit locking with TTL, lock renewal, admin break, and automatic expired lock cleanup
- **Pathauto** — Automatic URL alias generation with configurable patterns per entity type/bundle, token replacement (`[entity:title]`, `[date:year]`, etc.), and bulk generation
- **JSON:API** — Optional JSON:API 1.0 output format via `Accept: application/vnd.api+json` header or `?format=jsonapi` query parameter
- **State API** — Key-value runtime state storage, separate from configuration
- **Queue system** — Persistent task queue with claim/release pattern for deferred processing
- **Paragraphs** — Structured content entity type with typed paragraph bundles, parent-child relationships, and reorder support
- **REST resource plugins** — Custom API endpoint registration with enable/disable, method configuration, and permission control
- **Content preview** — Draft preview system with token-based access, TTL expiry, and automatic cleanup
- **Form validation** — Server-side field constraint system with required, max_length, min/max, pattern, and custom validators
- **Batch API** — Execute multiple API operations in a single request with parallel or sequential execution modes
- **Actions & Triggers** — Event-driven action system with 6 built-in actions (publish, unpublish, log, webhook, sticky, promote), configurable triggers with condition matching
- **Contact forms** — Multi-form contact system with message submission, status tracking, and EventBus integration
- **Shortcuts** — Per-user admin toolbar shortcut links with reorder and shortcut sets
- **Token replacement** — `[type:name]` token system with 6 built-in types (node, user, site, date, current-date, random) for dynamic text substitution
- **Mail system** — SMTP email via nodemailer with console fallback, pluggable template registry (password reset, contact notifications, registration)
- **Session signing** — HMAC-SHA256 signed session tokens with configurable secret
- **SSR public frontend** — Server-rendered pages (Next.js server components) with SEO metadata, OpenGraph tags, pagination, user profiles, RSS feed, sitemap, and 404 page
- **CI pipeline** — GitHub Actions with type checking, unit tests (Vitest), and E2E tests (Playwright)
- **Authentication** — Users, roles, 21 permissions, entity-level access control, sessions, CSRF protection, rate limiting, registration, and password reset
- **Drupal migration** — Read a Drupal database and migrate content directly
- **E2E tested** — 382+ Playwright tests across 42 specs covering the full stack
- **Unit tested** — 197 Vitest tests across 12 files
- **Search API** — Native full-text search (SQLite FTS5, PostgreSQL tsvector/tsquery) with porter stemming across all entity types
- **Rate limiting** — In-memory sliding window rate limiter (5/min auth, 30/min mutations, 100/min reads) with `X-RateLimit-*` headers
- **HTTP caching** — `Cache-Control`, `ETag`, `Last-Modified` headers on file serving; CDN-friendly `s-maxage` + `stale-while-revalidate` for public API responses
- **Environment config** — `.env` file support via `dotenv`, documented `.env.example` with all supported variables
- **AI-native** — Every API surface designed to be discoverable and operable by AI coding agents

## Quick Start

```bash
# Install globally
npm install -g dropjs

# Create a new project
drop init my-site
cd my-site
npm install

# Start dev server (SQLite, zero config)
npm run dev

# API is live at http://localhost:3000/api
# Admin UI at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

## Project Structure

```
src/
├── api/          REST API, request handling, middleware, OpenAPI, GraphQL
├── auth/         Users, roles, permissions, sessions, CSRF, rate limiting
├── cli/          CLI commands (dev, serve, migrate)
├── core/         Entity system, config, event bus, cron, Views, cache, mail, Drupal compat
├── db/           Database abstraction (Knex — SQLite, PostgreSQL), schema management
├── field/        18 field type definitions, storage engine with revision tables
├── modules/      Drupal-style modules (GraphQL, JSON:API, GraphQL Compose)
├── migrate/      Drupal-to-drop.js migration tools
├── app/          Next.js admin UI + SSR public frontend (React 19, App Router)
├── components/   Admin UI + public frontend components
└── lib/          Client-side API utilities + server-side fetch
```

## Web Services

drop.js replicates the API surface of Drupal's JSON:API, GraphQL, and GraphQL Compose modules.

### JSON:API (drupal/jsonapi equivalent)

Any REST endpoint can return JSON:API 1.0 format by adding an `Accept: application/vnd.api+json` header or `?format=jsonapi` query parameter. Entity data is automatically transformed to `{ jsonapi: {version:"1.0"}, data: { type, id, attributes, relationships } }`. Contributed by the `jsonapi` module.

### GraphQL (drupal/graphql equivalent)

```
GET    /api/graphql              — GraphQL playground (HTML) or query via ?query=...
POST   /api/graphql              — Execute GraphQL query/mutation
```

Queries: `entityTypes`, `node(nid)`, `nodes(type, status, limit, offset)`, `taxonomyTerm(tid)`, `taxonomyTerms(type)`, plus per-bundle typed queries. Mutations: `createNode`, `updateNode`, `deleteNode`. Full introspection support. Contributed by the `graphql` module.

### GraphQL Compose (drupal/graphql_compose equivalent)

```
GET    /api/graphql-compose     — GraphQL Compose playground or query via ?query=...
POST   /api/graphql-compose     — Execute GraphQL Compose query/mutation
```

Extended GraphQL with Relay-style pagination (cursor-based connections with `first`/`after`/`last`/`before`), per-bundle typed mutations (`createArticle`, `updateArticle`), and union types. Contributed by the `graphql_compose` module.

### Admin API

Internal endpoints consumed by the admin UI. These are not part of Drupal's public REST surface — they serve the same role as Drupal's admin forms and config management.

<details>
<summary>Admin API endpoints (click to expand)</summary>

**Entity Type & Field Management**

```
POST   /api/entity-types                              — Create content type
PATCH  /api/entity-types/:entityType/:bundle           — Update content type
DELETE /api/entity-types/:entityType/:bundle           — Delete content type
POST   /api/entity-types/:entityType/:bundle/fields    — Add field
PATCH  /api/entity-types/:entityType/:bundle/fields/:f — Update field
DELETE /api/entity-types/:entityType/:bundle/fields/:f — Remove field
```

**Taxonomy Admin**

```
POST   /api/taxonomy/vocabularies          — Create vocabulary
PATCH  /api/taxonomy/vocabularies/:vid     — Update vocabulary
DELETE /api/taxonomy/vocabularies/:vid     — Delete vocabulary
PATCH  /api/taxonomy/:vid/reorder          — Reorder terms
GET    /api/taxonomy/:vid/content-counts   — Count content per term
```

**Views**

```
GET    /api/views                    — List all views
GET    /api/views/:id                — Get view definition
POST   /api/views                    — Create view
PATCH  /api/views/:id                — Update view
DELETE /api/views/:id                — Delete view
GET    /api/views/:id/execute        — Execute view
```

**Block/Region Layout**

```
GET    /api/blocks                          — List registered blocks
GET    /api/block-placements                — List block placements
POST   /api/block-placements                — Create placement
PATCH  /api/block-placements/:id            — Update placement
DELETE /api/block-placements/:id            — Delete placement
GET    /api/regions                         — Get region definitions
PUT    /api/regions                         — Save region definitions
```

**Webhooks**

```
GET    /api/webhooks            — List webhooks
POST   /api/webhooks            — Create webhook
PATCH  /api/webhooks/:id        — Update webhook
DELETE /api/webhooks/:id        — Delete webhook
```

**Workflows**

```
GET    /api/workflows                               — List workflows
POST   /api/workflows                               — Create workflow
DELETE /api/workflows/:id                           — Delete workflow
```

**Layout Builder**

```
GET    /api/layout-types                                                          — List layout types
GET    /api/layout/:entityType/:bundle/:viewMode                                  — Get layout
PUT    /api/layout/:entityType/:bundle/:viewMode                                  — Save layout
DELETE /api/layout/:entityType/:bundle/:viewMode                                  — Delete layout
POST   /api/layout/:entityType/:bundle/:viewMode/sections                         — Add section
DELETE /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId              — Remove section
POST   /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components   — Add component
DELETE /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components/:componentId — Remove component
```

**Display Modes**

```
GET    /api/display-modes/:entityType               — List view modes
POST   /api/display-modes/:entityType               — Create view mode
DELETE /api/display-modes/:entityType/:mode          — Delete view mode
GET    /api/display/:entityType/:bundle/:mode        — Get view display
PUT    /api/display/:entityType/:bundle/:mode        — Save view display
```

**Scheduled Publishing**

```
GET    /api/scheduler                          — List scheduled transitions
POST   /api/scheduler/:entityType/:id          — Schedule a transition
DELETE /api/scheduler/:entityType/:id          — Cancel a scheduled transition
```

**Content Locking**

```
GET    /api/content-lock/:entityType/:id       — Check lock status
POST   /api/content-lock/:entityType/:id       — Acquire a lock
DELETE /api/content-lock/:entityType/:id       — Release a lock
POST   /api/content-lock/:entityType/:id/break — Break a lock (admin only)
```

**Pathauto**

```
GET    /api/pathauto/patterns                  — List URL alias patterns
POST   /api/pathauto/patterns                  — Create a pattern
PATCH  /api/pathauto/patterns/:id              — Update a pattern
DELETE /api/pathauto/patterns/:id              — Delete a pattern
POST   /api/pathauto/generate                  — Bulk generate aliases
```

**Paragraphs**

```
GET    /api/paragraphs/types                    — List paragraph types
POST   /api/paragraphs/types                    — Register paragraph type
```

**Contact Forms Admin**

```
GET    /api/contact/forms               — List contact forms
POST   /api/contact/forms               — Create contact form
PATCH  /api/contact/forms/:id           — Update contact form
DELETE /api/contact/forms/:id           — Delete contact form
GET    /api/contact/messages            — List contact messages
```

**Actions & Triggers**

```
GET    /api/actions                     — List registered actions
GET    /api/triggers                    — List triggers
POST   /api/triggers                    — Create trigger
PATCH  /api/triggers/:id                — Update trigger
DELETE /api/triggers/:id                — Delete trigger
```

**REST Resources, Shortcuts, Tokens**

```
GET    /api/rest-resources                      — List REST resources
POST   /api/rest-resources/:id/enable           — Enable a REST resource
GET    /api/shortcuts                           — List shortcuts
POST   /api/shortcuts                           — Add a shortcut
GET    /api/tokens                              — List token types
POST   /api/tokens/replace                      — Replace tokens in text
```

**Configuration**

```
GET/PATCH  /api/config/site                   — Site information
GET/POST   /api/config/text-formats            — Text formats
GET/POST   /api/config/image-styles            — Image styles
GET/POST   /api/aliases                        — URL aliases
GET/POST   /api/modules/:name/enable|disable   — Module management
GET/POST   /api/config/export|import|diff      — Config sync
```

**System**

```
GET    /api/state/:key               — State API (key-value store)
GET    /api/queues                   — Queue API
GET    /api/cache/stats              — Cache statistics
DELETE /api/cache                    — Clear cache
GET    /api/cron/status              — Cron status
POST   /api/cron/run                 — Run cron
GET    /api/reports/status           — System status
GET    /api/reports/logs             — Watchdog logs
POST   /api/batch                   — Batch operations
```

</details>

Rate limits: 5 req/min for auth, 30 req/min for mutations, 100 req/min for reads.

## Admin UI

The React admin panel (Next.js 15 / React 19) provides a full management interface at `/admin`:

### Content Management
- **Dashboard** — Overview with recent activity
- **Content list** — Browse, filter, search all content with bulk operations
- **Content forms** — Create/edit with dynamic field widgets and rich text editor
- **Content preview** — Preview draft content before publishing with shareable token-based URLs
- **Revision history** — View, compare, and revert content versions
- **Quick add** — Streamlined node creation interface
- **Comment moderation** — Filter, approve, delete comments with pagination

### Structure
- **Content types** — Create, edit, delete content types
- **Fields** — Add, edit, reorder, and remove fields with type-specific settings
- **Block layout** — Block placements grouped by region, visibility conditions, weight ordering
- **Views** — Configurable list builder with filters, sorts, field selection, pagination, and live preview
- **Menus** — Create menus, add/edit/delete links, hierarchical ordering
- **Taxonomy** — Vocabularies and hierarchical terms with parent-child relationships

### Modules
- **Extend** — Enable/disable modules with persistent configuration

### Configuration
- **Site information** — Name, slogan, email, front page
- **Text formats** — Configure allowed HTML tags per format
- **Image styles** — Define resize/crop/scale effects (thumbnail, medium, large)
- **URL aliases** — Create human-readable paths
- **URL patterns (Pathauto)** — Configure automatic URL alias patterns with token replacement
- **Languages** — Enable/disable languages, add new languages, set direction
- **Layout Builder** — Configure page layouts with sections, components, and regions
- **Webhooks** — Create, toggle, and delete HTTP webhooks with event selection
- **REST resources** — Enable/disable REST resource plugins with method and permission management
- **Actions & Triggers** — Configure automated actions triggered by system events
- **Contact forms** — Manage contact forms and submitted messages
- **Shortcuts** — Manage personal admin toolbar shortcuts

### People
- **Users** — Create, edit, delete user accounts
- **Roles** — Manage roles and assign permissions
- **Registration** — Self-service user registration with auto-login
- **Password reset** — Forgot password and token-based reset flow

### Media
- **Media library** — Grid browser with drag-and-drop upload, search, MIME filtering, bulk operations, and file detail modal

### Reports
- **Status report** — System info, Node.js version, database status, uptime, memory
- **Recent logs** — Watchdog entries with type/severity filtering
- **Top pages** — Most visited paths with period filtering

## Database Configuration

```javascript
// drop.config.js
export default {
  database: {
    client: 'sqlite3',              // or 'pg'
    connection: {
      filename: './data/drop.db'    // or { host, user, password, database }
    }
  }
}
```

### Supabase / PostgreSQL

Set `DATABASE_URL` to connect to Supabase or any PostgreSQL host:

```bash
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Or use individual environment variables:

```bash
DB_CLIENT=pg
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.your-ref
DB_PASSWORD=your-password
DB_NAME=postgres
DB_SSL=1
```

The same Drupal-compatible schema (entity tables, field storage, config, cache bins) is created in PostgreSQL — matching Drupal's PostgreSQL database driver. Full-text search uses PostgreSQL's native `tsvector`/`tsquery` with GIN indexes instead of SQLite's FTS5.

## Field Types

18 built-in field types:

| Type | Storage | Description |
|------|---------|-------------|
| `string` | varchar(255) | Short text |
| `text_long` | text + varchar | Long text with format |
| `text_with_summary` | text + text + varchar | Long text with summary and format |
| `integer` | int | Whole number |
| `float` | float | Decimal number |
| `decimal` | decimal(p,s) | Precise decimal |
| `boolean` | int (0/1) | True/false (Drupal-compatible) |
| `email` | varchar(255) | Email with validation |
| `timestamp` | int (unix) | Date/time as Unix timestamp |
| `entity_reference` | int (FK) | Reference to another entity |
| `image` | int (FK) + meta | File reference + alt, title, dimensions |
| `list_string` | varchar | Selection from allowed values |
| `json` | json/text | Arbitrary JSON data |
| `date` | varchar(20) | Date (YYYY-MM-DD) |
| `link` | varchar + text | URL with title and options |
| `file` | int (FK) + meta | File reference with display/description |
| `telephone` | varchar(255) | Phone number |
| `color` | varchar(7) + float | Hex color with opacity |

## Auth & Permissions

Drupal-style role-based access control:

```typescript
import { createUser, authenticateUser } from './src/auth/user.js';
import { userHasPermission } from './src/auth/access.js';

const user = await createUser({ name: 'editor', email: 'ed@example.com', password: 'secret' });
const session = await authenticateUser('editor', 'secret');
const canEdit = await userHasPermission(user.uid, 'edit any article content');
```

Default roles: `anonymous`, `authenticated`, `administrator`. The first registered user automatically receives the `administrator` role.

## Drupal Migration

Analyze and migrate a Drupal database:

```bash
# Analyze what's in the Drupal database
drop migrate:drupal analyze

# Generate drop.js entity configs from Drupal schema
drop migrate:drupal schema

# Run full content migration
drop migrate:drupal run
```

The migrator handles content types, taxonomy terms, paragraphs, and entity references — preserving relationships and multi-value fields.

## Event System

Modules hook into entity lifecycle events:

```typescript
import { EventBus } from './src/core/event-bus.js';

EventBus.on('entity:presave', async (entity) => {
  if (entity.type === 'blog_post' && !entity.field_slug) {
    entity.field_slug = slugify(entity.title);
  }
}, { priority: 10 });
```

Events: `entity:presave`, `entity:insert`, `entity:update`, `entity:delete`, `entity:load`, `entity_query:alter`, `system:boot`, `system:cron`.

## Drupal 11 Compatibility

drop.js creates a database schema that is **verified to boot a real Drupal 11 site** — both SQLite and PostgreSQL. Point Drupal's `settings.php` at the drop.js database and Drupal runs: cache rebuild, router rebuild, content rendering, JSON:API, entity CRUD, and admin login all work.

### What's compatible

- **Entity storage** — `node`, `node_field_data`, `node_revision`, `node_field_revision`, taxonomy term tables (including `taxonomy_term_revision`, `taxonomy_term_field_revision`, `taxonomy_term_revision__parent`), media tables, block content tables — all match Drupal's exact schema
- **Field storage** — `{entity_type}__{field_name}` + `{entity_type}_revision__{field_name}` with delta, langcode, and deleted columns
- **Config** — `config` table with PHP-serialized data for entity types, field storage, field instances, roles, site settings, date formats
- **Key-value** — `key_value` table with `system.schema` entries for all installed modules
- **Cache bins** — 10 cache tables (`cache_bootstrap`, `cache_config`, `cache_data`, etc.) + `cachetags`
- **Infrastructure** — `sessions`, `watchdog`, `flood`, `history`, `batch`, `menu_tree`, `router`, `semaphore`, `block_content`, `menu_link_content` tables — with correct column types for Drupal's lock system (float expire) and router dumper
- **Roles & permissions** — PHP-serialized role configs (`user.role.*`) with Drupal metadata (uuid, langcode, status)
- **Core extension** — `core.extension` config listing 20 installed modules and the Claro theme
- **Theme config** — `system.theme` config stored in the database for Drupal compatibility (drop.js does not have a theme system — the admin UI is a built-in React application)
- **Read + write** — Drupal can both read content created by drop.js and create new nodes/taxonomy terms in the same database

### Verified scenarios

**SQLite** — Playwright E2E spec copies `drop.db` into a Drupal 11 DDEV project, confirms bootstrap, content queries, config reads, and cache rebuild.

**PostgreSQL** — Manually verified against Drupal 11.3.1 via DDEV + local Supabase:
1. drop.js seeds content into Supabase PostgreSQL (with RLS enabled on all tables)
2. Drupal bootstraps successfully with `pgsql` driver
3. `Node::load()`, `Term::load()`, `User::load()` — all return correct data
4. `Node::create()->save()`, `Term::create()->save()` — Drupal writes succeed
5. JSON:API returns articles, pages, taxonomy terms, and users (363 routes rebuilt)
6. `drush cr` — cache rebuild completes with no errors

## Development

```bash
# Install dependencies
npm install

# Start dev server (SQLite, auto-reload)
npm run dev

# Run unit tests (Vitest)
npm test

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E tests in UI mode
npx playwright test --ui

# Run Drupal compat E2E test (requires DDEV + Drupal 11 project)
npx playwright test tests/e2e/drupal-compat.spec.ts

# Type check
npm run typecheck
```

Requires Node.js >= 18.0.0.

CI runs type checking, unit tests, and E2E tests on every push and PR via GitHub Actions.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string (Supabase, Railway, etc.) | — |
| `DB_SSL` | Enable SSL for database connection (`1`) | — |
| `DROP_DATA_DIR` | Data directory path | `./data` |
| `DROP_DISABLE_RATE_LIMIT` | Disable rate limiting (`1`) | — |
| `DROP_CLEAN_DB` | Clean DB on startup (for E2E) | — |
| `DROP_NO_ADMIN` | Disable admin UI (API-only mode) | — |
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | HMAC secret for signing session tokens | auto-generated |
| `SMTP_HOST` | SMTP server hostname | — |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `MAIL_FROM` | Default sender email address | — |
| `SITE_URL` | Public site URL (used in email links) | — |
| `SITE_EMAIL` | Site email (contact form notifications) | — |
| `LOG_LEVEL` | Logging level | `info` |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Applications                    │
│       (Next.js Admin UI, API consumers)          │
├─────────────────────────────────────────────────┤
│            src/api (Custom HTTP)                  │
│  REST · OpenAPI · GraphQL · CSRF · Rate Limit    │
├─────────────────────────────────────────────────┤
│              src/modules                          │
│  GraphQL · JSON:API · GraphQL Compose            │
├─────────────────────────────────────────────────┤
│                 src/core                          │
│  Entity System · Event Bus · Config · Modules    │
│  Views · Cache · Cron · Mail · Drupal Compat     │
├──────────┬──────────────────────┬───────────────┤
│ src/     │      src/auth        │   src/        │
│ field    │  Users · Roles · ACL │   migrate     │
├──────────┴──────────────────────┴───────────────┤
│               src/db (Knex)                      │
├─────────────────┬───────────────────────────────┤
│     SQLite      │       PostgreSQL              │
└─────────────────┴───────────────────────────────┘
```

## License

ISC

# drop.js

A Node.js CMS framework inspired by Drupal's best ideas, built for AI-assisted development.

> Define content types in JSON. Get a full REST API instantly. Migrate from Drupal with one command.

## Why drop.js?

Drupal's entity/field architecture is powerful — but it's PHP, heavy, and hard to customize. drop.js takes the best parts and rebuilds them in TypeScript:

- **Entity/field system** — Content types with configurable fields, Drupal-compatible multi-table storage
- **Revision system** — Every content change tracked with full revision history, diff, and revert
- **Taxonomy system** — Vocabularies and terms with hierarchical parent-child relationships
- **Database agnostic** — SQLite for dev, MySQL/PostgreSQL for production — swap with one config change
- **Drupal schema compatibility** — Node/taxonomy tables mirror Drupal's structure exactly
- **Auto-generated API** — Every entity type gets REST endpoints automatically with filtering, sorting, pagination, and reference expansion
- **OpenAPI/Swagger** — Auto-generated API documentation at `/api/docs`
- **Views system** — Drupal Views-inspired configurable list builder with filters, sorts, pagination, exposed parameters, and live preview
- **Block/Region system** — Layout management with visibility conditions, block placements, 8 default regions
- **Comments** — Threaded commenting on any entity type with Drupal-style thread ordering
- **Display modes** — View modes (full, teaser, search_result) with per-entity-type field display configuration
- **CORS** — Configurable cross-origin resource sharing with credential support and preflight handling
- **Input sanitization** — Server-side HTML purification stripping XSS vectors (scripts, event handlers, javascript: URLs) while preserving safe markup
- **Cache system** — In-memory cache with Drupal-style tag-based invalidation, named bins, entity/config cache wiring with automatic invalidation on CRUD
- **Admin UI** — Full React admin panel with 52 pages covering content, structure, views, menus, blocks, comments, appearance, configuration, webhooks, languages, layout builder, URL patterns (pathauto), reports, media, user management, registration, password reset, content preview, REST resource management, actions/triggers, contact forms, and shortcuts
- **Menu system** — Hierarchical navigation menus with drag-and-drop ordering, config-based storage
- **Cron scheduler** — Tick-based job scheduler with EventBus integration and admin API
- **Webhook system** — HTTP webhooks for entity lifecycle and system events with HMAC signing
- **Theme system** — Discoverable themes with YAML metadata, region definitions, and admin UI for switching
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
- **Search API** — FTS5 full-text search with porter stemming across all entity types
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
├── db/           Database abstraction (SQLite via Knex), schema management
├── field/        18 field type definitions, storage engine with revision tables
├── modules/      Drupal-style modules (GraphQL, JSON:API, GraphQL Compose)
├── migrate/      Drupal-to-drop.js migration tools
├── app/          Next.js admin UI + SSR public frontend (React 19, App Router)
├── components/   Admin UI + public frontend components
└── lib/          Client-side API utilities + server-side fetch
```

## Auto-Generated REST API

Every entity type gets these endpoints automatically:

```
GET    /api/node/article          — List articles
GET    /api/node/article/:id      — Get single article
POST   /api/node/article          — Create article
PATCH  /api/node/article/:id      — Update article
DELETE /api/node/article/:id      — Delete article
```

With query parameters for filtering, sorting, pagination, and reference expansion:

```
GET /api/node/article?status=1&sort=-created&page[limit]=10&include=field_tags
```

### Content Type & Field Management API

```
POST   /api/entity-types                              — Create content type
PATCH  /api/entity-types/:entityType/:bundle           — Update content type
DELETE /api/entity-types/:entityType/:bundle           — Delete content type
POST   /api/entity-types/:entityType/:bundle/fields    — Add field
PATCH  /api/entity-types/:entityType/:bundle/fields/:f — Update field
DELETE /api/entity-types/:entityType/:bundle/fields/:f — Remove field
```

### Taxonomy API

```
GET    /api/taxonomy/vocabularies          — List vocabularies
POST   /api/taxonomy/vocabularies          — Create vocabulary
PATCH  /api/taxonomy/vocabularies/:vid     — Update vocabulary
DELETE /api/taxonomy/vocabularies/:vid     — Delete vocabulary
GET    /api/taxonomy/:vid/tree             — Get term hierarchy tree
PATCH  /api/taxonomy/:vid/reorder          — Reorder terms
GET    /api/taxonomy/:vid/content-counts   — Count content per term
```

Taxonomy terms use the standard entity endpoints (`/api/taxonomy_term/:vid`).

### Revision API

```
GET    /api/node/:bundle/:nid/revisions              — List revisions
GET    /api/node/:bundle/:nid/revisions/:vid          — Load specific revision
POST   /api/node/:bundle/:nid/revisions/:vid/revert   — Revert to revision
GET    /api/node/:bundle/:nid/revisions/:v1/diff/:v2   — Compare revisions
```

### Media & File API

```
POST   /api/files/upload             — Upload file (multipart, 50MB max)
GET    /api/files/:id                — Get file metadata
GET    /api/files/:id/download       — Download file
GET    /api/files/:id/style/:style   — Get styled image (thumbnail, medium, large)
DELETE /api/files/:id                — Delete file
```

### Menu API

```
GET    /api/menus                        — List menus
GET    /api/menus/:menuId                — Get menu with tree
POST   /api/menus                        — Create menu
DELETE /api/menus/:menuId                — Delete menu
POST   /api/menus/:menuId/items          — Add menu link
PATCH  /api/menus/:menuId/items/:itemId  — Update menu link
DELETE /api/menus/:menuId/items/:itemId  — Delete menu link
PATCH  /api/menus/:menuId/reorder        — Reorder menu links
```

### Webhook API

```
GET    /api/webhooks            — List webhooks
GET    /api/webhooks/:id        — Get webhook
POST   /api/webhooks            — Create webhook
PATCH  /api/webhooks/:id        — Update webhook
DELETE /api/webhooks/:id        — Delete webhook
```

### Views API

```
GET    /api/views                    — List all views
GET    /api/views/:id                — Get view definition
POST   /api/views                    — Create view
PATCH  /api/views/:id                — Update view
DELETE /api/views/:id                — Delete view
GET    /api/views/:id/execute        — Execute view (with optional filters, sorts, pagination)
```

### Comment API

```
GET    /api/comments?entity_type=...&entity_id=...  — List comments for an entity
GET    /api/comments/:cid           — Get single comment
POST   /api/comments                — Create comment
PATCH  /api/comments/:cid           — Update comment
DELETE /api/comments/:cid           — Delete comment
```

### Block/Region API

```
GET    /api/blocks                          — List registered blocks
GET    /api/block-placements                — List block placements
GET    /api/block-placements/:id            — Get placement
POST   /api/block-placements                — Create placement
PATCH  /api/block-placements/:id            — Update placement
DELETE /api/block-placements/:id            — Delete placement
GET    /api/regions                         — Get region definitions
PUT    /api/regions                         — Save region definitions
GET    /api/regions/:region/render          — Render a region
```

### State API

```
GET    /api/state/:key               — Get state value
PUT    /api/state/:key               — Set state value
DELETE /api/state/:key               — Delete state value
```

### Queue API

```
GET    /api/queues                   — List queues
POST   /api/queues/:name/items       — Add item to queue
POST   /api/queues/:name/process     — Process queue items
DELETE /api/queues/:name             — Purge queue
```

### Display Modes API

```
GET    /api/display-modes/:entityType               — List view modes
POST   /api/display-modes/:entityType               — Create view mode
DELETE /api/display-modes/:entityType/:mode          — Delete view mode
GET    /api/display/:entityType/:bundle/:mode        — Get view display
PUT    /api/display/:entityType/:bundle/:mode        — Save view display
DELETE /api/display/:entityType/:bundle/:mode        — Delete view display
POST   /api/display/:entityType/:bundle/:mode/apply  — Apply display to entity data
```

### Config Sync API

```
GET    /api/config/export     — Export all configuration as JSON
POST   /api/config/import     — Import configuration (overwrites existing)
POST   /api/config/diff       — Diff incoming config against current state
```

### Workflow/Moderation API

```
GET    /api/workflows                               — List workflows
GET    /api/workflows/:id                           — Get workflow
POST   /api/workflows                               — Create workflow
DELETE /api/workflows/:id                           — Delete workflow
GET    /api/workflows/:id/transitions/:state        — Get available transitions
POST   /api/:entityType/:bundle/:id/moderation      — Apply moderation transition
GET    /api/:entityType/:bundle/:id/moderation      — Get moderation history
```

### Cache API

```
GET    /api/cache/stats       — Get cache statistics (all bins)
DELETE /api/cache             — Clear all cache bins
```

### Search API

```
GET    /api/search?q=...&type=...&bundle=...  — Full-text search (FTS5 with porter stemming)
```

### Cron API

```
GET    /api/cron/status          — List scheduled jobs
POST   /api/cron/run             — Run all due jobs
```

### Translation API

```
GET    /api/languages                                        — List all languages
GET    /api/languages/enabled                                — List enabled languages
GET    /api/languages/default                                — Get default language
POST   /api/languages                                        — Add a language
PATCH  /api/languages/:id                                    — Enable/disable or update language
DELETE /api/languages/:id                                    — Remove a language
GET    /api/:entityType/:bundle/:id/translations             — Get translation status
GET    /api/:entityType/:bundle/:id/translations/:langcode   — Get specific translation
POST   /api/:entityType/:bundle/:id/translations/:langcode   — Create translation
PATCH  /api/:entityType/:bundle/:id/translations/:langcode   — Update translation
DELETE /api/:entityType/:bundle/:id/translations/:langcode   — Delete translation
```

### GraphQL API

```
GET    /api/graphql              — GraphQL playground (HTML) or query via ?query=...
POST   /api/graphql              — Execute GraphQL query/mutation
```

Queries: `entityTypes`, `node(nid)`, `nodes(type, status, limit, offset)`, `taxonomyTerm(tid)`, `taxonomyTerms(type)`, plus per-bundle typed queries. Mutations: `createNode`, `updateNode`, `deleteNode`. Full introspection support.

### GraphQL Compose API

```
GET    /api/graphql-compose     — GraphQL Compose playground or query via ?query=...
POST   /api/graphql-compose     — Execute GraphQL Compose query/mutation
```

Extended GraphQL with Relay-style pagination (cursor-based connections with `first`/`after`/`last`/`before`), per-bundle typed mutations (`createArticle`, `updateArticle`), and union types. Contributed by the `graphql_compose` module.

### Layout Builder API

```
GET    /api/layout-types                                                          — List available layout types
GET    /api/layout/:entityType/:bundle/:viewMode                                  — Get layout
PUT    /api/layout/:entityType/:bundle/:viewMode                                  — Save layout
DELETE /api/layout/:entityType/:bundle/:viewMode                                  — Delete layout
POST   /api/layout/:entityType/:bundle/:viewMode/sections                         — Add section
DELETE /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId              — Remove section
POST   /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components   — Add component
DELETE /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components/:componentId — Remove component
GET    /api/layout/:entityType/:bundle/:viewMode/render                           — Render layout
```

### Scheduled Publishing API

```
GET    /api/scheduler                          — List all scheduled transitions
GET    /api/scheduler/:entityType/:id          — Get scheduled transition for an entity
POST   /api/scheduler/:entityType/:id          — Schedule a publish/unpublish transition
DELETE /api/scheduler/:entityType/:id          — Cancel a scheduled transition
```

### Content Locking API

```
GET    /api/content-lock                       — List all active locks
GET    /api/content-lock/:entityType/:id       — Check lock status for an entity
POST   /api/content-lock/:entityType/:id       — Acquire a lock
DELETE /api/content-lock/:entityType/:id       — Release a lock
POST   /api/content-lock/:entityType/:id/renew — Renew lock duration
POST   /api/content-lock/:entityType/:id/break — Break a lock (admin only)
```

### Pathauto API

```
GET    /api/pathauto/patterns                  — List URL alias patterns
GET    /api/pathauto/patterns/:id              — Get a specific pattern
POST   /api/pathauto/patterns                  — Create a URL alias pattern
PATCH  /api/pathauto/patterns/:id              — Update a pattern
DELETE /api/pathauto/patterns/:id              — Delete a pattern
POST   /api/pathauto/generate                  — Bulk generate aliases for entity type/bundle
```

### Paragraphs API

```
GET    /api/paragraphs/types                    — List paragraph types
POST   /api/paragraphs/types                    — Register paragraph type
GET    /api/paragraphs/types/:type              — Get paragraph type
DELETE /api/paragraphs/types/:type              — Delete paragraph type
GET    /api/paragraphs/:parentType/:parentId    — List paragraphs for parent entity
POST   /api/paragraphs/:parentType/:parentId    — Create paragraph
PATCH  /api/paragraphs/:id                      — Update paragraph
DELETE /api/paragraphs/:id                      — Delete paragraph
PATCH  /api/paragraphs/:parentType/:parentId/reorder — Reorder paragraphs
```

### REST Resources API

```
GET    /api/rest-resources                      — List all REST resources
POST   /api/rest-resources/:id/enable           — Enable a REST resource
POST   /api/rest-resources/:id/disable          — Disable a REST resource
```

### Content Preview API

```
POST   /api/preview                             — Create preview (returns token)
GET    /api/preview/:token                      — Load preview by token
DELETE /api/preview/:token                      — Delete preview
```

### Validation API

```
GET    /api/validation/:entityType/:bundle              — Get field constraints
PUT    /api/validation/:entityType/:bundle/:field       — Set field constraints
DELETE /api/validation/:entityType/:bundle/:field       — Remove field constraints
POST   /api/validation/:entityType/:bundle/validate     — Validate entity data
```

### Batch API

```
POST   /api/batch                               — Execute multiple API operations
```

Supports `{ operations: [{method, path, body}], sequential?: boolean }`. Max 25 operations per request. Parallel by default; `sequential: true` stops on first error.

### Actions & Triggers API

```
GET    /api/actions                     — List registered actions
GET    /api/triggers                    — List triggers (optional ?event= filter)
GET    /api/triggers/:id                — Get trigger
POST   /api/triggers                    — Create trigger (label, event, action_id)
PATCH  /api/triggers/:id                — Update trigger
DELETE /api/triggers/:id                — Delete trigger
POST   /api/triggers/:id/execute        — Manually execute a trigger
```

### Contact Forms API

```
GET    /api/contact/forms               — List contact forms
GET    /api/contact/forms/:id           — Get contact form
POST   /api/contact/forms               — Create contact form
PATCH  /api/contact/forms/:id           — Update contact form
DELETE /api/contact/forms/:id           — Delete contact form
POST   /api/contact/submit              — Submit a contact message
GET    /api/contact/messages            — List contact messages
GET    /api/contact/messages/:id        — Get contact message
PATCH  /api/contact/messages/:id        — Update message status
DELETE /api/contact/messages/:id        — Delete contact message
```

### Shortcuts API

```
GET    /api/shortcuts                   — List shortcuts for authenticated user
POST   /api/shortcuts                   — Add a shortcut
PATCH  /api/shortcuts/:id               — Update a shortcut
DELETE /api/shortcuts/:id               — Delete a shortcut
PATCH  /api/shortcuts/reorder           — Reorder shortcuts (body: {ids: number[]})
GET    /api/shortcut-sets               — List shortcut sets
```

### Token API

```
GET    /api/tokens                      — List registered token types
POST   /api/tokens/replace              — Replace tokens in text (body: {text, data})
```

### JSON:API Output

Any endpoint can return JSON:API 1.0 format by adding an `Accept: application/vnd.api+json` header or `?format=jsonapi` query parameter. Entity data is automatically transformed to `{ jsonapi: {version:"1.0"}, data: { type, id, attributes, relationships } }`.

### Configuration API

```
GET/PATCH  /api/config/site                   — Site information
GET/POST   /api/config/text-formats            — Text formats
GET/POST   /api/config/image-styles            — Image styles
GET/POST   /api/aliases                        — URL aliases
GET        /api/appearance/themes              — List themes
POST       /api/appearance/themes/active       — Set active theme
GET/POST   /api/modules/:name/enable|disable   — Module management
```

### Reports API

```
GET    /api/reports/status       — System status
GET    /api/reports/logs         — Watchdog logs (filterable, paginated)
DELETE /api/reports/logs         — Clear logs
GET    /api/reports/top-pages    — Most visited pages
```

### Security

```
GET    /api/csrf-token                  — Get CSRF token
POST   /api/auth/login                  — Authenticate
POST   /api/auth/register               — Register user
POST   /api/auth/logout                 — End session
POST   /api/auth/forgot-password        — Request password reset token
POST   /api/auth/reset-password         — Reset password with token
```

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

### Appearance
- **Themes** — View installed themes, set active theme

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
    client: 'sqlite3',              // or 'mysql2', 'pg'
    connection: {
      filename: './data/drop.db'    // or { host, user, password, database }
    }
  }
}
```

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

## Theme System

Themes are defined with YAML metadata:

```yaml
# themes/my_theme/theme.info.yml
name: My Theme
type: theme
description: A custom theme
version: 1.0.0
engine: react
regions:
  header: Header
  content: Content
  sidebar: Sidebar
  footer: Footer
```

Manage themes via the admin UI at `/admin/appearance` or the REST API.

## Drupal 11 Compatibility

drop.js generates a single SQLite database (`drop.db`) that is **verified to boot a real Drupal 11 site**. Copy the file into a Drupal installation's `sites/default/files/` directory, point `settings.php` at it, and Drupal runs — cache rebuild, content rendering, JSON:API, admin login all work.

### What's compatible

- **Entity storage** — `node`, `node_field_data`, `node_revision`, `node_field_revision`, taxonomy term tables, field data tables — all match Drupal's exact schema
- **Field storage** — `{entity_type}__{field_name}` + `{entity_type}_revision__{field_name}` with delta, langcode, and deleted columns
- **Config** — `config` table with PHP-serialized data for entity types, field storage, field instances, roles, site settings, date formats
- **Key-value** — `key_value` table with `system.schema` entries for all installed modules
- **Cache bins** — 10 cache tables (`cache_bootstrap`, `cache_config`, `cache_data`, etc.) + `cachetags`
- **Infrastructure** — `sessions`, `watchdog`, `flood`, `history`, `batch`, `menu_tree`, `router`, `semaphore`, `block_content`, `menu_link_content` tables
- **Roles & permissions** — PHP-serialized role configs (`user.role.*`) with Drupal metadata (uuid, langcode, status)
- **Core extension** — `core.extension` config listing 20 installed modules and the Claro theme

### E2E verified

The Playwright test suite includes a Drupal compatibility spec that:
1. Starts drop.js and seeds content via the API
2. Copies the SQLite database to a Drupal 11 DDEV project
3. Runs `drush status` — confirms Drupal 11 bootstraps with SQLite driver
4. Queries content — verifies nodes created by drop.js are readable by Drupal
5. Reads config — confirms `system.site`, `node.type.article`, etc. are valid
6. Runs `drush cr` — cache rebuild succeeds with no fatal errors

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
├──────────┬──────────┬───────────────────────────┤
│  SQLite  │  MySQL   │  PostgreSQL               │
└──────────┴──────────┴───────────────────────────┘
```

## License

ISC

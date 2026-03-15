# Next.js & Vercel Best Practices Review — Progress

## Issues Found & Fixed

### 1. Security: .env files not explicitly gitignored
- **Problem**: `.env.local` and `.env.vercel` contained real credentials (DB passwords, session secrets, OIDC tokens) but weren't explicitly in `.gitignore`
- **Fix**: Added `.env.local` and `.env.vercel` to `.gitignore`
- **Status**: Done

### 2. No `instrumentation.ts` for server initialization
- **Problem**: DB and subsystem initialization happened lazily on first API request, adding cold-start latency
- **Fix**: Added `instrumentation.ts` with `register()` hook that calls `ensureInitialized()` eagerly when `NEXT_RUNTIME === 'nodejs'`
- **Status**: Done

### 3. Raw `<img>` tags instead of `next/image`
- **Problem**: Public pages used native `<img>` tags, missing automatic WebP/AVIF conversion, responsive `srcset`, and built-in lazy loading
- **Fix**: Replaced all `<img>` in front page, node detail, and user profile with `next/image` using `fill` mode and appropriate `sizes` attributes. Hero images on node detail get `priority` for LCP optimization
- **Status**: Done

### 4. No `robots.ts`
- **Problem**: Missing robots.txt — search engines had no crawl directives
- **Fix**: Added `src/app/robots.ts` using Next.js Metadata API. Allows public pages, disallows admin routes (`/api/`, `/content/`, `/config/`, etc.), points to sitemap
- **Status**: Done

### 5. No root `not-found.tsx`
- **Problem**: Only `(public)` group had a 404 page — requests to unknown root paths got the default Next.js 404
- **Fix**: Added `src/app/not-found.tsx` as global 404 fallback
- **Status**: Done

### 6. Error boundaries expose error messages in production
- **Problem**: All three error boundaries (`(admin)`, `(public)`, `(auth)`) showed `error.message` directly, potentially leaking stack traces or internal details to users in production
- **Fix**: Changed to show `error.message` only in development, generic message in production
- **Status**: Done

### 7. No `generateStaticParams` for dynamic routes
- **Problem**: Dynamic public routes (`/node/[id]`, `/taxonomy/term/[tid]`) were only ISR-on-demand — no pages pre-generated at build time
- **Fix**: Added `generateStaticParams()` to both routes, pre-generating up to 100 nodes and all taxonomy terms at build time
- **Status**: Done

## Already Good (No Changes Needed)

- **Font loading**: Inter via `next/font/google` with `display: 'swap'` and CSS variable — correct
- **ISR strategy**: Public pages use `revalidate: 300`, admin uses `force-dynamic` — appropriate
- **Middleware**: NextAuth-based route protection with proper matcher — clean
- **`sitemap.ts`**: Already uses Next.js Metadata API with ISR
- **Server Actions**: Proper pattern with `ensureInitialized()`, permission checks, `revalidatePath()`
- **`sharp` dependency**: Present for production image optimization
- **`serverExternalPackages`**: `knex`, `better-sqlite3`, `pg` correctly externalized
- **`maxDuration: 60`**: Set on root layout and API routes for Vercel
- **Error boundaries**: Present in all three route groups
- **Loading states**: Present for admin and public groups

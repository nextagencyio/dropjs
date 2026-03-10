/**
 * Token — placeholder replacement system for DropJS.
 *
 * Inspired by Drupal's Token module. Tokens are placeholders like
 * `[node:title]`, `[user:name]`, `[site:name]`, `[date:short]` that get
 * replaced with actual values at runtime.
 *
 * This is an in-memory registration system — no database table is needed.
 */

import { loadConfig } from './config-storage.js';

// ── Types ──────────────────────────────────────────────────────────────────

type TokenResolver = (data: TokenData) => string | undefined;

export interface TokenType {
  id: string;         // e.g., 'node', 'user', 'site', 'date'
  label: string;
  tokens: TokenInfo[];
}

export interface TokenInfo {
  name: string;       // e.g., 'title', 'name', 'url'
  description: string;
}

export interface TokenData {
  node?: Record<string, unknown>;
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Registry ───────────────────────────────────────────────────────────────
// Stored on globalThis for webpack module sharing.
const gToken = globalThis as unknown as {
  __dropjs_token_types?: Map<string, TokenType>;
  __dropjs_token_resolvers?: Map<string, TokenResolver>;
};
if (!gToken.__dropjs_token_types) gToken.__dropjs_token_types = new Map<string, TokenType>();
if (!gToken.__dropjs_token_resolvers) gToken.__dropjs_token_resolvers = new Map<string, TokenResolver>();
const tokenTypes = gToken.__dropjs_token_types;
const tokenResolvers = gToken.__dropjs_token_resolvers;

// ── Registration API ───────────────────────────────────────────────────────

/**
 * Register a token type and its resolver function.
 */
export function registerTokenType(type: TokenType, resolver: TokenResolver): void {
  tokenTypes.set(type.id, type);
  tokenResolvers.set(type.id, resolver);
}

/**
 * Remove a token type from the registry.
 */
export function unregisterTokenType(id: string): void {
  tokenTypes.delete(id);
  tokenResolvers.delete(id);
}

/**
 * List all registered token types.
 */
export function getTokenTypes(): TokenType[] {
  return Array.from(tokenTypes.values());
}

/**
 * Get information about a specific token type.
 */
export function getTokenInfo(typeId: string): TokenType | undefined {
  return tokenTypes.get(typeId);
}

// ── Token Replacement ──────────────────────────────────────────────────────

/**
 * Replace all `[type:name]` tokens in the given text using registered
 * resolvers. Unknown tokens are left in place.
 */
export function replaceTokens(text: string, data: TokenData): string {
  return text.replace(/\[([a-z][a-z0-9_-]*):([a-z][a-z0-9_]*)\]/g, (match, typeId, tokenName) => {
    const resolver = tokenResolvers.get(typeId);
    if (!resolver) return match;

    // Pass the specific token name via a special key so the resolver knows
    // which token within the type is being requested.
    const resolved = resolver({ ...data, __token: tokenName });
    return resolved !== undefined ? resolved : match;
  });
}

// ── Month Names ────────────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// ── Date Helper ────────────────────────────────────────────────────────────

function resolveDateToken(tokenName: string, date: Date): string | undefined {
  switch (tokenName) {
    case 'short':
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
    case 'medium':
      return `${MONTH_NAMES_SHORT[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
    case 'long':
      return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    case 'timestamp':
      return String(Math.floor(date.getTime() / 1000));
    case 'year':
      return String(date.getFullYear());
    case 'month':
      return String(date.getMonth() + 1).padStart(2, '0');
    case 'day':
      return String(date.getDate()).padStart(2, '0');
    default:
      return undefined;
  }
}

// ── Built-in Token Types ───────────────────────────────────────────────────

/**
 * Register all built-in token types (node, user, site, date, current-date, random).
 */
export function registerDefaultTokens(): void {
  // ── Node tokens ────────────────────────────────────────────────────────

  registerTokenType(
    {
      id: 'node',
      label: 'Content',
      tokens: [
        { name: 'title', description: 'The title of the content item' },
        { name: 'nid', description: 'The unique numeric ID of the content item' },
        { name: 'type', description: 'The machine name of the content type' },
        { name: 'created', description: 'The date the content was created (timestamp)' },
        { name: 'changed', description: 'The date the content was last updated (timestamp)' },
        { name: 'author', description: 'The name of the content author' },
        { name: 'url', description: 'The URL path of the content item' },
      ],
    },
    (data: TokenData) => {
      const token = data.__token as string;
      const node = data.node;
      if (!node) return undefined;

      switch (token) {
        case 'title':
          return node.title != null ? String(node.title) : undefined;
        case 'nid':
          return node.nid != null ? String(node.nid) : undefined;
        case 'type':
          return node.type != null ? String(node.type) : undefined;
        case 'created':
          return node.created != null ? String(node.created) : undefined;
        case 'changed':
          return node.changed != null ? String(node.changed) : undefined;
        case 'author':
          return node.author != null ? String(node.author) : (node.uid != null ? String(node.uid) : undefined);
        case 'url':
          return node.url != null ? String(node.url) : (node.nid != null ? `/node/${node.nid}` : undefined);
        default:
          return undefined;
      }
    },
  );

  // ── User tokens ────────────────────────────────────────────────────────

  registerTokenType(
    {
      id: 'user',
      label: 'User',
      tokens: [
        { name: 'name', description: 'The login name of the user' },
        { name: 'uid', description: 'The unique numeric ID of the user' },
        { name: 'email', description: 'The email address of the user' },
        { name: 'created', description: 'The date the user account was created (timestamp)' },
      ],
    },
    (data: TokenData) => {
      const token = data.__token as string;
      const user = data.user;
      if (!user) return undefined;

      switch (token) {
        case 'name':
          return user.name != null ? String(user.name) : undefined;
        case 'uid':
          return user.uid != null ? String(user.uid) : undefined;
        case 'email':
          return user.email != null ? String(user.email) : (user.mail != null ? String(user.mail) : undefined);
        case 'created':
          return user.created != null ? String(user.created) : undefined;
        default:
          return undefined;
      }
    },
  );

  // ── Site tokens ────────────────────────────────────────────────────────

  registerTokenType(
    {
      id: 'site',
      label: 'Site information',
      tokens: [
        { name: 'name', description: 'The name of the site' },
        { name: 'slogan', description: 'The slogan of the site' },
        { name: 'url', description: 'The base URL of the site' },
      ],
    },
    (data: TokenData) => {
      const token = data.__token as string;

      // Site tokens resolve from a pre-loaded config object if available,
      // otherwise they return the token name as a placeholder.
      // The caller can pass site config via data.site.
      const site = data.site as Record<string, unknown> | undefined;

      switch (token) {
        case 'name':
          return site?.name != null ? String(site.name) : 'DropJS';
        case 'slogan':
          return site?.slogan != null ? String(site.slogan) : '';
        case 'url':
          return site?.url != null ? String(site.url) : '';
        default:
          return undefined;
      }
    },
  );

  // ── Date tokens (from data.date or current time) ───────────────────────

  registerTokenType(
    {
      id: 'date',
      label: 'Date',
      tokens: [
        { name: 'short', description: 'Date in MM/DD/YYYY format' },
        { name: 'medium', description: 'Date in Mon DD, YYYY format' },
        { name: 'long', description: 'Full date (e.g. Wednesday, January 1, 2025)' },
        { name: 'timestamp', description: 'Unix timestamp' },
        { name: 'year', description: 'Four-digit year' },
        { name: 'month', description: 'Two-digit month (01-12)' },
        { name: 'day', description: 'Two-digit day of the month (01-31)' },
      ],
    },
    (data: TokenData) => {
      const token = data.__token as string;
      // Use provided date value (timestamp or Date), fall back to current time
      let date: Date;
      if (data.date instanceof Date) {
        date = data.date;
      } else if (typeof data.date === 'number') {
        date = new Date(data.date * 1000);
      } else {
        date = new Date();
      }
      return resolveDateToken(token, date);
    },
  );

  // ── Current-date tokens (always uses current time) ─────────────────────

  registerTokenType(
    {
      id: 'current-date',
      label: 'Current date',
      tokens: [
        { name: 'short', description: 'Current date in MM/DD/YYYY format' },
        { name: 'medium', description: 'Current date in Mon DD, YYYY format' },
        { name: 'long', description: 'Current full date' },
        { name: 'timestamp', description: 'Current unix timestamp' },
        { name: 'year', description: 'Current four-digit year' },
        { name: 'month', description: 'Current two-digit month' },
        { name: 'day', description: 'Current two-digit day' },
      ],
    },
    (data: TokenData) => {
      const token = data.__token as string;
      return resolveDateToken(token, new Date());
    },
  );

  // ── Random tokens ──────────────────────────────────────────────────────

  registerTokenType(
    {
      id: 'random',
      label: 'Random',
      tokens: [
        { name: 'number', description: 'A random number between 0 and 100' },
        { name: 'hash', description: 'A random 8-character hexadecimal string' },
      ],
    },
    (data: TokenData) => {
      const token = data.__token as string;

      switch (token) {
        case 'number':
          return String(Math.floor(Math.random() * 101));
        case 'hash': {
          const bytes = new Array(4);
          for (let i = 0; i < 4; i++) {
            bytes[i] = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
          }
          return bytes.join('');
        }
        default:
          return undefined;
      }
    },
  );
}

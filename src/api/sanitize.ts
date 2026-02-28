import type { Request, Response, NextFunction } from './types.js';

/**
 * Allowed HTML tags per format. Tags not in this list are stripped.
 * This is a server-side safety net — the text format system in config defines
 * allowed tags per format, but this provides a hard ceiling.
 */
const SAFE_TAGS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo', 'blockquote',
  'br', 'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details',
  'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1',
  'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'ins', 'kbd',
  'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby',
  's', 'samp', 'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul',
  'var', 'wbr',
]);

/** Attributes that are always safe */
const SAFE_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id', 'width', 'height', 'colspan',
  'rowspan', 'target', 'rel', 'lang', 'dir', 'role', 'aria-label',
  'aria-hidden', 'aria-describedby', 'data-align', 'data-caption',
  'datetime', 'cite', 'start', 'type',
]);

/** Dangerous attribute patterns (event handlers, javascript: URLs) */
const DANGEROUS_ATTR_PATTERN = /^on[a-z]/i;
const DANGEROUS_URL_PATTERN = /^\s*(?:javascript|vbscript|data(?!:image\/))\s*:/i;

/**
 * Strip dangerous HTML from a string value.
 * Removes: <script>, <style>, <iframe>, <object>, <embed>, <form>, <input>,
 * event handler attributes, javascript: URLs.
 */
export function sanitizeHtml(html: string): string {
  // Remove script, style, iframe, object, embed, form, input, select, textarea, button tags entirely (including content for script/style)
  let result = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  result = result.replace(/<\/?(script|style|iframe|object|embed|form|input|select|textarea|button|applet|base|link|meta)\b[^>]*>/gi, '');

  // Remove dangerous attributes from remaining tags
  result = result.replace(/<([a-z][a-z0-9]*)\b([^>]*)>/gi, (_match, tag: string, attrs: string) => {
    const tagLower = tag.toLowerCase();
    if (!SAFE_TAGS.has(tagLower)) {
      // Strip unknown tags but keep content
      return '';
    }

    // Parse and filter attributes
    const cleanAttrs = filterAttributes(attrs, tagLower);
    return `<${tag}${cleanAttrs}>`;
  });

  // Clean closing tags for unsafe tags
  result = result.replace(/<\/([a-z][a-z0-9]*)\s*>/gi, (_match, tag: string) => {
    return SAFE_TAGS.has(tag.toLowerCase()) ? `</${tag}>` : '';
  });

  return result;
}

function filterAttributes(attrString: string, _tag: string): string {
  const attrs: string[] = [];
  // Match attribute patterns: name="value", name='value', name=value, name
  const attrRegex = /([a-z][a-z0-9_-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>'"]+)))?/gi;
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';

    // Skip event handlers
    if (DANGEROUS_ATTR_PATTERN.test(name)) continue;

    // Skip style attribute (potential CSS injection)
    if (name === 'style') continue;

    // Only allow known-safe attributes
    if (!SAFE_ATTRS.has(name) && !name.startsWith('data-')) continue;

    // Check URL attributes for javascript:
    if ((name === 'href' || name === 'src') && DANGEROUS_URL_PATTERN.test(value)) continue;

    attrs.push(` ${name}="${escapeAttrValue(value)}"`);
  }

  return attrs.join('');
}

function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Recursively sanitize string values in an object that look like HTML.
 * Only sanitizes strings containing '<' to avoid processing plain text.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.includes('<')) {
      return sanitizeHtml(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = sanitizeValue(v);
    }
    return result;
  }

  return value;
}

/**
 * Express middleware that sanitizes HTML in request bodies on state-changing requests.
 * Only applies to POST, PATCH, PUT methods with JSON bodies.
 */
export function sanitizeMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (
      req.body &&
      typeof req.body === 'object' &&
      ['POST', 'PATCH', 'PUT'].includes(req.method)
    ) {
      req.body = sanitizeValue(req.body);
    }
    next();
  };
}

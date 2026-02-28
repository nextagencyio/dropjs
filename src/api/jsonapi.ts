/**
 * JSON:API output format middleware.
 *
 * When a request includes `Accept: application/vnd.api+json` or `?format=jsonapi`,
 * the response is transformed from the internal format to JSON:API 1.0 spec.
 *
 * Internal format:   { data: {...}, meta: {...}, links: {...} }
 * JSON:API format:   { jsonapi: {version:"1.0"}, data: {type, id, attributes, relationships}, links, meta }
 */
import type { Request, Response, NextFunction } from './types.js';

const JSONAPI_CONTENT_TYPE = 'application/vnd.api+json';

// Fields that become JSON:API resource identifiers rather than attributes
const RELATIONSHIP_FIELDS = new Set(['uid', 'field_tags', 'parent']);
// Fields that are part of the resource object, not attributes
const META_FIELDS = new Set(['nid', 'uuid', 'type', 'tid', 'vid', 'langcode']);

interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

interface JsonApiDocument {
  jsonapi: { version: string };
  data: JsonApiResource | JsonApiResource[] | null;
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
  included?: JsonApiResource[];
}

function isJsonApiRequest(req: Request): boolean {
  const accept = req.headers.accept || '';
  const format = (req.query as Record<string, string>).format;
  return accept.includes(JSONAPI_CONTENT_TYPE) || format === 'jsonapi';
}

/**
 * Convert an internal entity object to a JSON:API resource.
 */
function toJsonApiResource(entity: Record<string, unknown>, entityType?: string, bundle?: string): JsonApiResource {
  const type = entityType && bundle
    ? `${entityType}--${bundle}`
    : entity.type
      ? `node--${entity.type}`
      : 'unknown';

  const id = String(entity.uuid || entity.nid || entity.tid || entity.id || '');

  const attributes: Record<string, unknown> = {};
  const relationships: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entity)) {
    if (META_FIELDS.has(key)) continue;

    if (RELATIONSHIP_FIELDS.has(key) && value != null) {
      if (Array.isArray(value)) {
        relationships[key] = {
          data: value.map((v: unknown) => ({
            type: key === 'field_tags' ? 'taxonomy_term--tags' : 'user--user',
            id: String(v),
          })),
        };
      } else {
        relationships[key] = {
          data: {
            type: key === 'uid' ? 'user--user' : 'unknown',
            id: String(value),
          },
        };
      }
      continue;
    }

    attributes[key] = value;
  }

  const resource: JsonApiResource = { type, id, attributes };
  if (Object.keys(relationships).length > 0) {
    resource.relationships = relationships;
  }
  return resource;
}

/**
 * Transform an internal API response to JSON:API format.
 */
function transformResponse(body: unknown, req: Request): JsonApiDocument {
  const internal = body as Record<string, unknown>;
  const entityType = req.params?.entityType;
  const bundle = req.params?.bundle;

  const doc: JsonApiDocument = {
    jsonapi: { version: '1.0' },
    data: null,
  };

  if (internal.data !== undefined) {
    if (Array.isArray(internal.data)) {
      doc.data = internal.data.map((item: unknown) =>
        typeof item === 'object' && item !== null
          ? toJsonApiResource(item as Record<string, unknown>, entityType, bundle)
          : item as unknown as JsonApiResource
      );
    } else if (typeof internal.data === 'object' && internal.data !== null) {
      const d = internal.data as Record<string, unknown>;
      // Only transform entity-like objects (have nid/uuid/tid)
      if (d.nid !== undefined || d.uuid !== undefined || d.tid !== undefined) {
        doc.data = toJsonApiResource(d, entityType, bundle);
      } else {
        // Non-entity responses (config, stats, etc.) — wrap as-is
        doc.data = internal.data as any;
      }
    } else {
      doc.data = internal.data as any;
    }
  }

  if (internal.meta) {
    doc.meta = internal.meta as Record<string, unknown>;
  }

  if (internal.links) {
    doc.links = internal.links as Record<string, unknown>;
  }

  return doc;
}

/**
 * Express middleware that transforms responses to JSON:API format
 * when the client requests it via Accept header or query parameter.
 */
export function jsonApiMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isJsonApiRequest(req)) {
    return next();
  }

  // Intercept res.json to transform the response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    res.setHeader('Content-Type', JSONAPI_CONTENT_TYPE);
    const transformed = transformResponse(body, req);
    return originalJson(transformed);
  } as any;

  next();
}

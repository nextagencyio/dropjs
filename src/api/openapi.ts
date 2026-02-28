import {
  getAllEntityTypes,
  type EntityTypeDefinition,
  type FieldDefinition,
} from '../core/index.js';
import { getRegisteredFieldTypes } from '../field/index.js';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  tags: Array<{ name: string; description?: string }>;
}

function fieldTypeToJsonSchema(fieldDef: FieldDefinition): Record<string, unknown> {
  switch (fieldDef.type) {
    case 'string':
      return { type: 'string', maxLength: fieldDef.settings?.max_length ?? 255 };
    case 'text_long':
      return {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              value: { type: 'string' },
              format: { type: 'string' },
            },
          },
        ],
      };
    case 'integer':
      return { type: 'integer' };
    case 'float':
    case 'decimal':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'email':
      return { type: 'string', format: 'email' };
    case 'timestamp':
      return { type: 'integer', description: 'Unix timestamp' };
    case 'entity_reference':
      return { type: 'integer', description: `Reference to ${fieldDef.settings?.target_type ?? 'entity'}` };
    case 'list_string': {
      const schema: Record<string, unknown> = { type: 'string' };
      if (fieldDef.settings?.allowed_values) {
        schema.enum = Object.keys(fieldDef.settings.allowed_values);
      }
      return schema;
    }
    case 'image':
      return {
        type: 'object',
        properties: {
          target_id: { type: 'integer' },
          alt: { type: 'string' },
          title: { type: 'string' },
          width: { type: 'integer' },
          height: { type: 'integer' },
        },
      };
    case 'json':
      return { type: 'object' };
    default:
      return { type: 'string' };
  }
}

function buildEntitySchema(def: EntityTypeDefinition): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    nid: { type: 'integer', readOnly: true },
    uuid: { type: 'string', format: 'uuid', readOnly: true },
    type: { type: 'string', enum: [def.bundle] },
    langcode: { type: 'string', default: 'en' },
    title: { type: 'string' },
    status: { type: 'boolean' },
    uid: { type: 'integer' },
    created: { type: 'integer', readOnly: true },
    changed: { type: 'integer', readOnly: true },
  };

  const required: string[] = [];

  for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
    if (['title', 'status', 'uid'].includes(fieldName)) continue;

    const baseSchema = fieldTypeToJsonSchema(fieldDef);
    const cardinality = fieldDef.cardinality ?? 1;

    if (cardinality === -1 || cardinality > 1) {
      properties[fieldName] = {
        type: 'array',
        items: baseSchema,
        ...(cardinality > 1 ? { maxItems: cardinality } : {}),
      };
    } else {
      properties[fieldName] = baseSchema;
    }

    if (fieldDef.required) {
      required.push(fieldName);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function buildInputSchema(def: EntityTypeDefinition): Record<string, unknown> {
  const schema = buildEntitySchema(def) as { properties: Record<string, unknown> };
  const { nid, uuid, created, changed, ...rest } = schema.properties;
  return { ...schema, properties: rest };
}

function addEntityPaths(
  paths: Record<string, Record<string, unknown>>,
  def: EntityTypeDefinition,
  schemaName: string,
  inputSchemaName: string
): void {
  const { entity_type, bundle, label } = def;
  const basePath = `/api/${entity_type}/${bundle}`;
  const itemPath = `${basePath}/{id}`;
  const tag = `${label} (${entity_type}/${bundle})`;

  paths[basePath] = {
    get: {
      tags: [tag],
      summary: `List ${label} entities`,
      parameters: [
        { name: 'page[offset]', in: 'query', schema: { type: 'integer', default: 0 } },
        { name: 'page[limit]', in: 'query', schema: { type: 'integer', default: 50 } },
        { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'Field to sort by (prefix with - for DESC)' },
        { name: 'filter[status]', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'List of entities',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: `#/components/schemas/${schemaName}` } },
                  meta: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      total: { type: 'integer' },
                      offset: { type: 'integer' },
                      limit: { type: 'integer' },
                    },
                  },
                  links: {
                    type: 'object',
                    properties: {
                      self: { type: 'string' },
                      next: { type: 'string' },
                      prev: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: [tag],
      summary: `Create a ${label}`,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${inputSchemaName}` },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created entity',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${schemaName}` },
                },
              },
            },
          },
        },
        '401': { description: 'Authentication required' },
        '422': { description: 'Validation failed' },
      },
    },
  };

  paths[itemPath] = {
    get: {
      tags: [tag],
      summary: `Get a ${label} by ID`,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '200': {
          description: 'Single entity',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${schemaName}` },
                },
              },
            },
          },
        },
        '404': { description: 'Not found' },
      },
    },
    patch: {
      tags: [tag],
      summary: `Update a ${label}`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${inputSchemaName}` },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated entity',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${schemaName}` },
                },
              },
            },
          },
        },
        '401': { description: 'Authentication required' },
        '404': { description: 'Not found' },
        '422': { description: 'Validation failed' },
      },
    },
    delete: {
      tags: [tag],
      summary: `Delete a ${label}`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        '204': { description: 'Deleted' },
        '401': { description: 'Authentication required' },
        '404': { description: 'Not found' },
      },
    },
  };
}

export function generateOpenApiSpec(): OpenAPISpec {
  const entityTypes = getAllEntityTypes();
  const paths: Record<string, Record<string, unknown>> = {};
  const schemas: Record<string, unknown> = {};
  const tags: Array<{ name: string; description?: string }> = [];

  // Auth endpoints
  tags.push({ name: 'Authentication', description: 'User authentication and registration' });

  paths['/api/auth/login'] = {
    post: {
      tags: ['Authentication'],
      summary: 'Login with credentials',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'password'],
              properties: {
                name: { type: 'string' },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      user: { type: 'object' },
                      token: { type: 'string' },
                      expires: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { description: 'Missing fields' },
        '401': { description: 'Invalid credentials' },
      },
    },
  };

  paths['/api/auth/logout'] = {
    post: {
      tags: ['Authentication'],
      summary: 'Logout (revoke token)',
      security: [{ bearerAuth: [] }],
      responses: {
        '204': { description: 'Logged out' },
      },
    },
  };

  paths['/api/auth/register'] = {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'User created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      user: { type: 'object' },
                      token: { type: 'string' },
                      expires: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { description: 'Missing fields' },
        '422': { description: 'Registration failed' },
      },
    },
  };

  // Entity type discovery
  tags.push({ name: 'Entity Types', description: 'Content type and field management' });

  paths['/api/entity-types'] = {
    get: {
      tags: ['Entity Types'],
      summary: 'List all registered entity types',
      responses: {
        '200': {
          description: 'List of entity type definitions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
      },
    },
  };

  // Taxonomy endpoints
  tags.push({ name: 'Taxonomy', description: 'Vocabulary and term management' });

  paths['/api/taxonomy/vocabularies'] = {
    get: {
      tags: ['Taxonomy'],
      summary: 'List all vocabularies',
      responses: {
        '200': { description: 'List of vocabularies' },
      },
    },
    post: {
      tags: ['Taxonomy'],
      summary: 'Create a vocabulary',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['vid', 'name'],
              properties: {
                vid: { type: 'string', description: 'Machine name' },
                name: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Vocabulary created' },
        '401': { description: 'Authentication required' },
      },
    },
  };

  // Entity type schemas and paths
  for (const def of entityTypes) {
    const schemaName = `${def.entity_type}_${def.bundle}`;
    const inputSchemaName = `${schemaName}_input`;
    const tag = `${def.label} (${def.entity_type}/${def.bundle})`;

    tags.push({ name: tag, description: def.description });

    schemas[schemaName] = buildEntitySchema(def);
    schemas[inputSchemaName] = buildInputSchema(def);

    addEntityPaths(paths, def, schemaName, inputSchemaName);
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'DropJS API',
      version: '0.1.0',
      description: 'Auto-generated REST API documentation for DropJS CMS',
    },
    paths,
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'JWT token obtained from /api/auth/login',
        },
      },
    },
    tags,
  };
}

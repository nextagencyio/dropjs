/**
 * GraphQL Compose module — equivalent to Drupal's graphql_compose module.
 *
 * Provides a composable, schema-first GraphQL API where entity types are
 * automatically composed into a unified schema with:
 *   - Union types for polymorphic entity queries
 *   - Fragment support per bundle
 *   - Relay-style pagination (edges/nodes/pageInfo)
 *   - Automatic input types for mutations
 *
 * This module extends the base GraphQL module with a richer, more
 * Drupal-compatible schema. Both can be enabled simultaneously —
 * graphql_compose serves at /api/graphql-compose.
 *
 * Enable/disable via the module system:
 *   await installModule(graphqlComposeModule);
 *   await uninstallModule('graphql_compose');
 */

import type { ModuleDefinition, ModuleRoute } from '../core/module-loader.js';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLUnionType,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLEnumType,
} from 'graphql';
import {
  Entity,
  getAllEntityTypes,
  type EntityTypeDefinition,
} from '../core/index.js';
import { authenticate } from '../auth/index.js';
import { createLogger } from '../core/index.js';
import type { Request, Response } from '../api/types.js';

const logger = createLogger('module:graphql-compose');

// ── Field type mapping ──────────────────────────────────────

function mapFieldType(fieldType: string) {
  switch (fieldType) {
    case 'string': case 'varchar': case 'email': case 'link':
    case 'color': case 'telephone': case 'date':
      return GraphQLString;
    case 'text_long': case 'text_with_summary':
      return GraphQLString;
    case 'integer': case 'int': case 'serial': case 'entity_reference': case 'timestamp':
      return GraphQLInt;
    case 'float': case 'decimal':
      return GraphQLFloat;
    case 'boolean':
      return GraphQLBoolean;
    case 'file': case 'image':
      return GraphQLString;
    default:
      return GraphQLString;
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^_0-9A-Za-z]/g, '_');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Relay-style pagination types ────────────────────────────

const PageInfoType = new GraphQLObjectType({
  name: 'ComposePageInfo',
  fields: {
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    startCursor: { type: GraphQLString },
    endCursor: { type: GraphQLString },
    total: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

function createConnectionType(nodeType: GraphQLObjectType, typeName: string) {
  const EdgeType = new GraphQLObjectType({
    name: `${typeName}Edge`,
    fields: {
      node: { type: new GraphQLNonNull(nodeType) },
      cursor: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  return new GraphQLObjectType({
    name: `${typeName}Connection`,
    fields: {
      edges: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EdgeType))) },
      pageInfo: { type: new GraphQLNonNull(PageInfoType) },
      totalCount: { type: new GraphQLNonNull(GraphQLInt) },
    },
  });
}

// ── Sort enum ───────────────────────────────────────────────

const SortDirectionEnum = new GraphQLEnumType({
  name: 'ComposeSortDirection',
  values: {
    ASC: { value: 'ASC' },
    DESC: { value: 'DESC' },
  },
});

// ── Schema builder ──────────────────────────────────────────

let cachedSchema: GraphQLSchema | null = null;
let cachedTypeCount = -1;

export function resetComposeSchema(): void {
  cachedSchema = null;
  cachedTypeCount = -1;
}

function buildComposeSchema(): GraphQLSchema {
  const entityTypes = getAllEntityTypes();
  const objectTypes: Record<string, GraphQLObjectType> = {};
  const inputTypes: Record<string, GraphQLInputObjectType> = {};

  // Base fields for each entity type category
  const nodeBaseFields = (): GraphQLFieldConfigMap<unknown, unknown> => ({
    nid: { type: GraphQLInt },
    vid: { type: GraphQLInt },
    uuid: { type: GraphQLString },
    type: { type: GraphQLString },
    bundle: { type: GraphQLString },
    title: { type: GraphQLString },
    status: { type: GraphQLBoolean },
    uid: { type: GraphQLInt },
    created: { type: GraphQLInt },
    changed: { type: GraphQLInt },
    langcode: { type: GraphQLString },
    promote: { type: GraphQLBoolean },
    sticky: { type: GraphQLBoolean },
  });

  const taxonomyBaseFields = (): GraphQLFieldConfigMap<unknown, unknown> => ({
    tid: { type: GraphQLInt },
    nid: { type: GraphQLInt },
    vid: { type: GraphQLInt },
    uuid: { type: GraphQLString },
    type: { type: GraphQLString },
    title: { type: GraphQLString },
    status: { type: GraphQLBoolean },
    changed: { type: GraphQLInt },
    langcode: { type: GraphQLString },
    weight: { type: GraphQLInt },
    parent: { type: GraphQLInt },
  });

  // Build typed object and input types per bundle
  for (const def of entityTypes) {
    const typeName = capitalize(sanitizeName(def.entity_type)) + capitalize(sanitizeName(def.bundle));

    const baseFields = def.entity_type === 'taxonomy_term'
      ? taxonomyBaseFields()
      : nodeBaseFields();

    // Add custom fields
    for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
      if (baseFields[fieldName]) continue;
      const gqlType = mapFieldType(fieldDef.type);
      const cardinality = fieldDef.cardinality ?? 1;
      baseFields[sanitizeName(fieldName)] = {
        type: cardinality === 1 ? gqlType : new GraphQLList(gqlType),
      };
    }

    objectTypes[typeName] = new GraphQLObjectType({
      name: typeName,
      fields: () => baseFields,
    });

    // Input type for mutations (node types only)
    if (def.entity_type === 'node') {
      const inputFields: GraphQLInputFieldConfigMap = {
        title: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        uid: { type: GraphQLInt },
        promote: { type: GraphQLBoolean },
        sticky: { type: GraphQLBoolean },
      };

      for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
        if (inputFields[fieldName]) continue;
        const gqlType = mapFieldType(fieldDef.type);
        const cardinality = fieldDef.cardinality ?? 1;
        inputFields[sanitizeName(fieldName)] = {
          type: cardinality === 1 ? gqlType : new GraphQLList(gqlType),
        };
      }

      inputTypes[typeName] = new GraphQLInputObjectType({
        name: `${typeName}Input`,
        fields: () => inputFields,
      });
    }
  }

  // Union types per entity type (e.g., NodeUnion = NodeArticle | NodePage)
  const unionsByEntityType: Record<string, GraphQLUnionType> = {};
  const entityTypeGroups: Record<string, GraphQLObjectType[]> = {};

  for (const def of entityTypes) {
    const typeName = capitalize(sanitizeName(def.entity_type)) + capitalize(sanitizeName(def.bundle));
    const objType = objectTypes[typeName];
    if (!objType) continue;
    const group = def.entity_type;
    if (!entityTypeGroups[group]) entityTypeGroups[group] = [];
    entityTypeGroups[group].push(objType);
  }

  for (const [entityType, types] of Object.entries(entityTypeGroups)) {
    if (types.length > 1) {
      unionsByEntityType[entityType] = new GraphQLUnionType({
        name: `${capitalize(sanitizeName(entityType))}Union`,
        types,
        resolveType: (value: any) => {
          const bundle = value.type || value.bundle;
          return capitalize(sanitizeName(entityType)) + capitalize(sanitizeName(bundle || ''));
        },
      });
    }
  }

  // Build connection types for each bundle
  const connectionTypes: Record<string, GraphQLObjectType> = {};
  for (const [typeName, objType] of Object.entries(objectTypes)) {
    connectionTypes[typeName] = createConnectionType(objType, typeName);
  }

  // Resolve helper: normalize entity data
  function normalizeEntity(data: Record<string, unknown>, entityType: string): Record<string, unknown> {
    if (entityType === 'taxonomy_term') {
      data.tid = data.nid;
    }
    if (typeof data.status === 'number') {
      data.status = data.status === 1;
    }
    data.bundle = data.type;
    return data;
  }

  // ── Queries ─────────────────────────────────────────────

  const queryFields: GraphQLFieldConfigMap<unknown, unknown> = {};

  // Per-bundle queries with Relay pagination
  for (const def of entityTypes) {
    const typeName = capitalize(sanitizeName(def.entity_type)) + capitalize(sanitizeName(def.bundle));
    const objType = objectTypes[typeName];
    const connType = connectionTypes[typeName];
    if (!objType || !connType) continue;

    const idField = def.entity_type === 'taxonomy_term' ? 'tid' : 'nid';
    const queryBase = sanitizeName(`${def.entity_type}_${def.bundle}`);

    // Single item query
    queryFields[queryBase] = {
      type: objType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load(def.entity_type, args.id);
        if (!entity || entity.bundle !== def.bundle) return null;
        return normalizeEntity(entity.toJSON(), def.entity_type);
      },
    };

    // Collection query with Relay pagination
    queryFields[`${queryBase}s`] = {
      type: new GraphQLNonNull(connType),
      args: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString },
        sortBy: { type: GraphQLString },
        sortDirection: { type: SortDirectionEnum },
      },
      resolve: async (_root, args) => {
        const first = args.first ?? 10;
        const afterCursor = args.after ? parseInt(args.after, 10) : 0;
        const sortField = args.sortBy || idField;
        const sortDir = args.sortDirection || 'DESC';

        let query = Entity.query(def.entity_type).condition('type', def.bundle);
        query = query.sort(sortField, sortDir);

        // Get total count
        const countQuery = Entity.query(def.entity_type).condition('type', def.bundle);
        const allIds = await countQuery.execute();
        const total = allIds.length;

        // Apply pagination
        query = query.range(afterCursor, first);
        const ids = await query.execute();
        const entities = await Entity.loadMultiple(def.entity_type, ids);

        const edges = entities.map((e, i) => ({
          node: normalizeEntity(e.toJSON(), def.entity_type),
          cursor: String(afterCursor + i),
        }));

        return {
          edges,
          pageInfo: {
            hasNextPage: afterCursor + first < total,
            hasPreviousPage: afterCursor > 0,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            total,
          },
          totalCount: total,
        };
      },
    };
  }

  // Fallback if no entity types
  if (Object.keys(queryFields).length === 0) {
    queryFields['_empty'] = {
      type: GraphQLString,
      resolve: () => 'No entity types registered',
    };
  }

  const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: () => queryFields,
  });

  // ── Mutations ───────────────────────────────────────────

  const mutationFields: GraphQLFieldConfigMap<unknown, unknown> = {};

  // Delete result type
  const DeleteResultType = new GraphQLObjectType({
    name: 'ComposeDeleteResult',
    fields: {
      success: { type: new GraphQLNonNull(GraphQLBoolean) },
      id: { type: GraphQLInt },
    },
  });

  for (const def of entityTypes) {
    if (def.entity_type !== 'node') continue;

    const typeName = capitalize(sanitizeName(def.entity_type)) + capitalize(sanitizeName(def.bundle));
    const objType = objectTypes[typeName];
    const inputType = inputTypes[typeName];
    if (!objType || !inputType) continue;

    const bundleName = capitalize(sanitizeName(def.bundle));

    // Create
    mutationFields[`create${bundleName}`] = {
      type: objType,
      args: {
        input: { type: new GraphQLNonNull(inputType) },
      },
      resolve: async (_root, args, context: any) => {
        const values: Record<string, unknown> = { ...args.input };
        if (context?.user?.uid) values.uid = context.user.uid;
        // Convert boolean status to int for storage
        if (typeof values.status === 'boolean') {
          values.status = values.status ? 1 : 0;
        }
        const entity = await Entity.create('node', def.bundle, values as any);
        return normalizeEntity(entity.toJSON(), 'node');
      },
    };

    // Update
    mutationFields[`update${bundleName}`] = {
      type: objType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
        input: { type: new GraphQLNonNull(inputType) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load('node', args.id);
        if (!entity || entity.bundle !== def.bundle) {
          throw new Error(`${bundleName} ${args.id} not found`);
        }
        const input = args.input;
        if (input.title !== undefined) entity.title = input.title;
        if (input.status !== undefined) entity.status = typeof input.status === 'boolean' ? input.status : input.status === 1;
        if (input.uid !== undefined) entity.uid = input.uid;
        await entity.save();
        return normalizeEntity(entity.toJSON(), 'node');
      },
    };

    // Delete
    mutationFields[`delete${bundleName}`] = {
      type: new GraphQLNonNull(DeleteResultType),
      args: {
        id: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load('node', args.id);
        if (!entity || entity.bundle !== def.bundle) {
          throw new Error(`${bundleName} ${args.id} not found`);
        }
        await Entity.delete('node', args.id);
        return { success: true, id: args.id };
      },
    };
  }

  // Fallback if no mutations
  if (Object.keys(mutationFields).length === 0) {
    mutationFields['_empty'] = {
      type: GraphQLString,
      resolve: () => 'No mutations available',
    };
  }

  const MutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => mutationFields,
  });

  return new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
  });
}

function getSchema(): GraphQLSchema {
  const types = getAllEntityTypes();
  if (!cachedSchema || types.length !== cachedTypeCount) {
    cachedSchema = buildComposeSchema();
    cachedTypeCount = types.length;
  }
  return cachedSchema;
}

// ── Request handler ─────────────────────────────────────────

async function handleGraphQLCompose(req: Request, res: Response): Promise<void> {
  let query: string | undefined;
  let variables: Record<string, unknown> | undefined;
  let operationName: string | undefined;

  if (req.method === 'POST') {
    const body = req.body;
    query = body?.query;
    variables = body?.variables;
    operationName = body?.operationName;
  } else {
    query = req.query.query as string | undefined;
    const varsStr = req.query.variables as string | undefined;
    if (varsStr) {
      try { variables = JSON.parse(varsStr); } catch { /* ignore */ }
    }
    operationName = req.query.operationName as string | undefined;
  }

  if (!query) {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html');
      res.send(getPlaygroundHTML());
      return;
    }
    res.status(400).json({ errors: [{ message: 'Query is required' }] });
    return;
  }

  try {
    const schema = getSchema();
    const context = { user: (req as any).user ?? null, req };
    const result = await graphql({ schema, source: query, variableValues: variables, operationName, contextValue: context });
    res.json(result);
  } catch (err: unknown) {
    logger.error('GraphQL Compose execution error', { error: String(err) });
    res.status(500).json({ errors: [{ message: 'Internal server error' }] });
  }
}

function getPlaygroundHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>DropJS GraphQL Compose Playground</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .badge { display: inline-block; background: #6c5ce7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; }
    textarea { width: 100%; height: 200px; font-family: monospace; font-size: 14px; padding: 10px; }
    button { padding: 10px 20px; font-size: 16px; background: #6c5ce7; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0; }
    button:hover { background: #5a4bd1; }
    pre { background: white; padding: 15px; border-radius: 4px; overflow: auto; max-height: 400px; border: 1px solid #ddd; }
    .info { background: #dfe6e9; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>DropJS GraphQL Compose <span class="badge">Relay</span></h1>
  <div class="info">
    This endpoint uses Relay-style pagination (edges/nodes/pageInfo), union types for polymorphic queries,
    and per-bundle typed mutations. For the basic GraphQL endpoint, visit <a href="/api/graphql">/api/graphql</a>.
  </div>
  <p>Enter a GraphQL query below:</p>
  <textarea id="query">{
  node_articles(first: 5) {
    edges {
      node {
        nid
        title
        status
      }
      cursor
    }
    pageInfo {
      hasNextPage
      total
    }
    totalCount
  }
}</textarea>
  <br>
  <button onclick="runQuery()">Execute Query</button>
  <h2>Result:</h2>
  <pre id="result">Click "Execute Query" to see results</pre>
  <script>
    async function runQuery() {
      const query = document.getElementById('query').value;
      try {
        const resp = await fetch('/api/graphql-compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const json = await resp.json();
        document.getElementById('result').textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        document.getElementById('result').textContent = 'Error: ' + e.message;
      }
    }
  </script>
</body>
</html>`;
}

// ── Module routes ───────────────────────────────────────────

function getRoutes(): ModuleRoute[] {
  const auth = [authenticate() as any];
  return [
    { method: 'GET', pattern: '/api/graphql-compose', middleware: auth, skipCsrf: true, handler: handleGraphQLCompose },
    { method: 'POST', pattern: '/api/graphql-compose', middleware: auth, skipCsrf: true, handler: handleGraphQLCompose },
  ];
}

// ── Module definition ───────────────────────────────────────

export const graphqlComposeModule: ModuleDefinition = {
  name: 'graphql_compose',
  version: '0.1.0',
  label: 'GraphQL Compose',
  description: 'Composable GraphQL schema with Relay-style pagination, union types, and per-bundle typed mutations at /api/graphql-compose.',
  package: 'Web services',

  routes: getRoutes,

  events: {
    'entity_type:create': () => resetComposeSchema(),
    'entity_type:update': () => resetComposeSchema(),
    'entity_type:delete': () => resetComposeSchema(),
  },
};

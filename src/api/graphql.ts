import type { Request, Response } from './types.js';
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
  GraphQLInputFieldConfigMap,
  GraphQLFieldConfigMap,
  GraphQLEnumType,
} from 'graphql';
import {
  Entity,
  getAllEntityTypes,
  type EntityTypeDefinition,
  type FieldDefinition,
} from '../core/index.js';
import { createLogger } from '../core/index.js';

const logger = createLogger('api:graphql');

/**
 * Map a CMS field type to a GraphQL output type.
 */
function fieldTypeToGraphQL(fieldType: string) {
  switch (fieldType) {
    case 'string':
    case 'text_long':
    case 'text_with_summary':
    case 'varchar':
    case 'email':
    case 'link':
    case 'color':
    case 'telephone':
    case 'date':
    case 'file':
    case 'image':
      return GraphQLString;
    case 'integer':
    case 'int':
    case 'serial':
    case 'entity_reference':
    case 'timestamp':
      return GraphQLInt;
    case 'float':
    case 'decimal':
      return GraphQLFloat;
    case 'boolean':
      return GraphQLBoolean;
    default:
      return GraphQLString;
  }
}

/**
 * Map a CMS field type to a GraphQL input type.
 */
function fieldTypeToGraphQLInput(fieldType: string) {
  return fieldTypeToGraphQL(fieldType);
}

/**
 * Sanitize a name to be a valid GraphQL identifier.
 * GraphQL names must match [_A-Za-z][_0-9A-Za-z]+
 */
function sanitizeGraphQLName(name: string): string {
  return name.replace(/[^_0-9A-Za-z]/g, '_');
}

/**
 * Build a unique GraphQL type name from entity type and bundle.
 */
function buildTypeName(entityType: string, bundle: string): string {
  const et = sanitizeGraphQLName(entityType);
  const b = sanitizeGraphQLName(bundle);
  // Capitalize first letter of each segment
  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1);
  return capitalize(et) + '_' + capitalize(b);
}

/**
 * EntityTypeInfo type returned by entityTypes query.
 */
const EntityTypeInfoType = new GraphQLObjectType({
  name: 'EntityTypeInfo',
  fields: {
    entity_type: { type: new GraphQLNonNull(GraphQLString) },
    bundle: { type: new GraphQLNonNull(GraphQLString) },
    label: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
  },
});

/**
 * Build the GraphQL schema dynamically from registered entity types.
 */
export function buildSchema(): GraphQLSchema {
  const entityTypes = getAllEntityTypes();

  // Track generated types to avoid name collisions
  const objectTypes: Record<string, GraphQLObjectType> = {};
  const inputTypes: Record<string, GraphQLInputObjectType> = {};

  // Build a GraphQL object type for each entity type/bundle
  for (const def of entityTypes) {
    const typeName = buildTypeName(def.entity_type, def.bundle);

    // Build fields for this type
    const typeFields: GraphQLFieldConfigMap<unknown, unknown> = {};

    // Add base fields depending on entity type
    if (def.entity_type === 'node') {
      typeFields['nid'] = { type: GraphQLInt };
      typeFields['vid'] = { type: GraphQLInt };
      typeFields['uuid'] = { type: GraphQLString };
      typeFields['type'] = { type: GraphQLString };
      typeFields['title'] = { type: GraphQLString };
      typeFields['status'] = { type: GraphQLInt };
      typeFields['uid'] = { type: GraphQLInt };
      typeFields['created'] = { type: GraphQLInt };
      typeFields['changed'] = { type: GraphQLInt };
      typeFields['langcode'] = { type: GraphQLString };
      typeFields['promote'] = { type: GraphQLInt };
      typeFields['sticky'] = { type: GraphQLInt };
    } else if (def.entity_type === 'taxonomy_term') {
      typeFields['tid'] = { type: GraphQLInt };
      typeFields['nid'] = { type: GraphQLInt };
      typeFields['vid'] = { type: GraphQLInt };
      typeFields['uuid'] = { type: GraphQLString };
      typeFields['type'] = { type: GraphQLString };
      typeFields['title'] = { type: GraphQLString };
      typeFields['status'] = { type: GraphQLInt };
      typeFields['changed'] = { type: GraphQLInt };
      typeFields['langcode'] = { type: GraphQLString };
      typeFields['weight'] = { type: GraphQLInt };
      typeFields['parent'] = { type: GraphQLInt };
    } else {
      typeFields['nid'] = { type: GraphQLInt };
      typeFields['uuid'] = { type: GraphQLString };
      typeFields['type'] = { type: GraphQLString };
      typeFields['title'] = { type: GraphQLString };
      typeFields['status'] = { type: GraphQLInt };
      typeFields['uid'] = { type: GraphQLInt };
      typeFields['created'] = { type: GraphQLInt };
      typeFields['changed'] = { type: GraphQLInt };
      typeFields['langcode'] = { type: GraphQLString };
    }

    // Add dynamic fields from the definition
    for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
      // Skip fields already handled as base fields
      if (typeFields[fieldName]) continue;

      const graphqlType = fieldTypeToGraphQL(fieldDef.type);
      const cardinality = fieldDef.cardinality ?? 1;

      if (cardinality === 1) {
        typeFields[sanitizeGraphQLName(fieldName)] = { type: graphqlType };
      } else {
        typeFields[sanitizeGraphQLName(fieldName)] = {
          type: new GraphQLList(graphqlType),
        };
      }
    }

    objectTypes[typeName] = new GraphQLObjectType({
      name: typeName,
      fields: () => typeFields,
    });

    // Build input type for mutations (node types)
    if (def.entity_type === 'node') {
      const inputFields: GraphQLInputFieldConfigMap = {
        title: { type: GraphQLString },
        status: { type: GraphQLInt },
        uid: { type: GraphQLInt },
        promote: { type: GraphQLInt },
        sticky: { type: GraphQLInt },
      };

      for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
        if (inputFields[fieldName]) continue;
        const graphqlType = fieldTypeToGraphQLInput(fieldDef.type);
        const cardinality = fieldDef.cardinality ?? 1;
        if (cardinality === 1) {
          inputFields[sanitizeGraphQLName(fieldName)] = { type: graphqlType };
        } else {
          inputFields[sanitizeGraphQLName(fieldName)] = {
            type: new GraphQLList(graphqlType),
          };
        }
      }

      inputTypes[typeName] = new GraphQLInputObjectType({
        name: `${typeName}Input`,
        fields: () => inputFields,
      });
    }
  }

  // If no entity types registered, create a placeholder
  if (Object.keys(objectTypes).length === 0) {
    objectTypes['_Placeholder'] = new GraphQLObjectType({
      name: '_Placeholder',
      fields: { _empty: { type: GraphQLString } },
    });
  }

  // Build the generic Node type that is a union-like type for node queries
  const GenericNodeType = new GraphQLObjectType({
    name: 'GenericNode',
    fields: {
      nid: { type: GraphQLInt },
      vid: { type: GraphQLInt },
      uuid: { type: GraphQLString },
      type: { type: GraphQLString },
      title: { type: GraphQLString },
      status: { type: GraphQLInt },
      uid: { type: GraphQLInt },
      created: { type: GraphQLInt },
      changed: { type: GraphQLInt },
      langcode: { type: GraphQLString },
      promote: { type: GraphQLInt },
      sticky: { type: GraphQLInt },
    },
  });

  const GenericTaxonomyTermType = new GraphQLObjectType({
    name: 'GenericTaxonomyTerm',
    fields: {
      tid: { type: GraphQLInt },
      nid: { type: GraphQLInt },
      vid: { type: GraphQLInt },
      uuid: { type: GraphQLString },
      type: { type: GraphQLString },
      title: { type: GraphQLString },
      status: { type: GraphQLInt },
      changed: { type: GraphQLInt },
      langcode: { type: GraphQLString },
      weight: { type: GraphQLInt },
      parent: { type: GraphQLInt },
    },
  });

  // Generic node input for mutations
  const GenericNodeInput = new GraphQLInputObjectType({
    name: 'NodeInput',
    fields: {
      title: { type: GraphQLString },
      status: { type: GraphQLInt },
      uid: { type: GraphQLInt },
      promote: { type: GraphQLInt },
      sticky: { type: GraphQLInt },
    },
  });

  // Deletion result type
  const DeleteResultType = new GraphQLObjectType({
    name: 'DeleteResult',
    fields: {
      success: { type: new GraphQLNonNull(GraphQLBoolean) },
      nid: { type: GraphQLInt },
    },
  });

  // Build Query type
  const queryFields: GraphQLFieldConfigMap<unknown, unknown> = {
    // Query entity type definitions
    entityTypes: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EntityTypeInfoType))),
      resolve: () => {
        const types = getAllEntityTypes();
        return types.map((t) => ({
          entity_type: t.entity_type,
          bundle: t.bundle,
          label: t.label,
          description: t.description ?? null,
        }));
      },
    },

    // Query a single node by ID
    node: {
      type: GenericNodeType,
      args: {
        nid: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load('node', args.nid);
        if (!entity) return null;
        const data = entity.toJSON();
        // Normalize status to int
        if (typeof data.status === 'boolean') {
          data.status = data.status ? 1 : 0;
        }
        return data;
      },
    },

    // Query multiple nodes
    nodes: {
      type: new GraphQLNonNull(new GraphQLList(GenericNodeType)),
      args: {
        type: { type: GraphQLString },
        status: { type: GraphQLInt },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: async (_root, args) => {
        let query = Entity.query('node');
        if (args.type) {
          query = query.condition('type', args.type);
        }
        if (args.status !== undefined && args.status !== null) {
          query = query.condition('status', args.status);
        }
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;
        query = query.range(offset, limit);
        query = query.sort('nid', 'DESC');

        const ids = await query.execute();
        const entities = await Entity.loadMultiple('node', ids);
        return entities.map((e) => {
          const data = e.toJSON();
          if (typeof data.status === 'boolean') {
            data.status = data.status ? 1 : 0;
          }
          return data;
        });
      },
    },

    // Query a single taxonomy term
    taxonomyTerm: {
      type: GenericTaxonomyTermType,
      args: {
        tid: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load('taxonomy_term', args.tid);
        if (!entity) return null;
        const data = entity.toJSON();
        // Add tid alias
        data.tid = data.nid;
        if (typeof data.status === 'boolean') {
          data.status = data.status ? 1 : 0;
        }
        return data;
      },
    },

    // Query multiple taxonomy terms
    taxonomyTerms: {
      type: new GraphQLNonNull(new GraphQLList(GenericTaxonomyTermType)),
      args: {
        type: { type: GraphQLString },
      },
      resolve: async (_root, args) => {
        let query = Entity.query('taxonomy_term');
        if (args.type) {
          query = query.condition('type', args.type);
        }
        query = query.sort('tid', 'ASC');

        const ids = await query.execute();
        const entities = await Entity.loadMultiple('taxonomy_term', ids);
        return entities.map((e) => {
          const data = e.toJSON();
          data.tid = data.nid;
          if (typeof data.status === 'boolean') {
            data.status = data.status ? 1 : 0;
          }
          return data;
        });
      },
    },
  };

  // Add typed queries for each registered entity type
  for (const def of entityTypes) {
    const typeName = buildTypeName(def.entity_type, def.bundle);
    const objType = objectTypes[typeName];
    if (!objType) continue;

    if (def.entity_type === 'node') {
      // e.g. node_article(nid: Int!): Node_Article
      const queryName = sanitizeGraphQLName(`${def.entity_type}_${def.bundle}`);
      queryFields[queryName] = {
        type: objType,
        args: {
          nid: { type: new GraphQLNonNull(GraphQLInt) },
        },
        resolve: async (_root, args) => {
          const entity = await Entity.load('node', args.nid);
          if (!entity || entity.bundle !== def.bundle) return null;
          const data = entity.toJSON();
          if (typeof data.status === 'boolean') {
            data.status = data.status ? 1 : 0;
          }
          return data;
        },
      };
    }
  }

  const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: () => queryFields,
  });

  // Build Mutation type
  const mutationFields: GraphQLFieldConfigMap<unknown, unknown> = {
    createNode: {
      type: GenericNodeType,
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        input: { type: new GraphQLNonNull(GenericNodeInput) },
      },
      resolve: async (_root, args, context: any) => {
        const values: Record<string, unknown> = { ...args.input };
        if (context?.user?.uid) {
          values.uid = context.user.uid;
        }
        const entity = await Entity.create('node', args.type, values as any);
        const data = entity.toJSON();
        if (typeof data.status === 'boolean') {
          data.status = data.status ? 1 : 0;
        }
        return data;
      },
    },

    updateNode: {
      type: GenericNodeType,
      args: {
        nid: { type: new GraphQLNonNull(GraphQLInt) },
        input: { type: new GraphQLNonNull(GenericNodeInput) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load('node', args.nid);
        if (!entity) {
          throw new Error(`Node ${args.nid} not found`);
        }

        const input = args.input;
        if (input.title !== undefined) entity.title = input.title;
        if (input.status !== undefined) entity.status = input.status === 1;
        if (input.uid !== undefined) entity.uid = input.uid;

        await entity.save();
        const data = entity.toJSON();
        if (typeof data.status === 'boolean') {
          data.status = data.status ? 1 : 0;
        }
        return data;
      },
    },

    deleteNode: {
      type: new GraphQLNonNull(DeleteResultType),
      args: {
        nid: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: async (_root, args) => {
        const entity = await Entity.load('node', args.nid);
        if (!entity) {
          throw new Error(`Node ${args.nid} not found`);
        }
        await Entity.delete('node', args.nid);
        return { success: true, nid: args.nid };
      },
    },
  };

  const MutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => mutationFields,
  });

  return new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
  });
}

// Cache the schema (rebuild when entity types change)
let cachedSchema: GraphQLSchema | null = null;
let cachedTypeCount = -1;

function getSchema(): GraphQLSchema {
  const types = getAllEntityTypes();
  if (!cachedSchema || types.length !== cachedTypeCount) {
    cachedSchema = buildSchema();
    cachedTypeCount = types.length;
  }
  return cachedSchema;
}

/**
 * Reset the cached schema. Call this when entity types are modified.
 */
export function resetGraphQLSchema(): void {
  cachedSchema = null;
  cachedTypeCount = -1;
}

/**
 * Handle a GraphQL request (POST or GET).
 */
export async function handleGraphQL(req: Request, res: Response): Promise<void> {
  let query: string | undefined;
  let variables: Record<string, unknown> | undefined;
  let operationName: string | undefined;

  if (req.method === 'POST') {
    const body = req.body;
    query = body?.query;
    variables = body?.variables;
    operationName = body?.operationName;
  } else {
    // GET request
    query = req.query.query as string | undefined;
    const varsStr = req.query.variables as string | undefined;
    if (varsStr) {
      try {
        variables = JSON.parse(varsStr);
      } catch {
        // ignore parse errors
      }
    }
    operationName = req.query.operationName as string | undefined;
  }

  if (!query) {
    // If GET without query param, return a simple GraphQL playground HTML
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
    const context = {
      user: (req as any).user ?? null,
      req,
    };

    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: context,
    });

    res.json(result);
  } catch (err: unknown) {
    logger.error('GraphQL execution error', { error: String(err) });
    res.status(500).json({
      errors: [{ message: 'Internal server error' }],
    });
  }
}

/**
 * Simple GraphQL playground HTML page.
 */
function getPlaygroundHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>DropJS GraphQL Playground</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    textarea { width: 100%; height: 200px; font-family: monospace; font-size: 14px; padding: 10px; }
    button { padding: 10px 20px; font-size: 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0; }
    button:hover { background: #0052a3; }
    pre { background: white; padding: 15px; border-radius: 4px; overflow: auto; max-height: 400px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>DropJS GraphQL Playground</h1>
  <p>Enter a GraphQL query below:</p>
  <textarea id="query">{ entityTypes { entity_type bundle label } }</textarea>
  <br>
  <button onclick="runQuery()">Execute Query</button>
  <h2>Result:</h2>
  <pre id="result">Click "Execute Query" to see results</pre>
  <script>
    async function runQuery() {
      const query = document.getElementById('query').value;
      try {
        const resp = await fetch('/api/graphql', {
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

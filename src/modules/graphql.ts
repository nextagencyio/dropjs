/**
 * GraphQL module — equivalent to Drupal's graphql module.
 *
 * Provides a GraphQL API endpoint with auto-generated schema from entity types.
 * Includes queries, mutations, and a built-in playground.
 *
 * Enable/disable via the module system:
 *   await installModule(graphqlModule);
 *   await uninstallModule('graphql');
 */

import type { ModuleDefinition, ModuleRoute } from '../core/module-loader.js';
import { handleGraphQL, resetGraphQLSchema } from '../api/graphql.js';
import { authenticate } from '../auth/index.js';

function getRoutes(): ModuleRoute[] {
  const auth = [authenticate() as any];
  return [
    { method: 'GET', pattern: '/api/graphql', middleware: auth, skipCsrf: true, handler: handleGraphQL },
    { method: 'POST', pattern: '/api/graphql', middleware: auth, skipCsrf: true, handler: handleGraphQL },
  ];
}

export const graphqlModule: ModuleDefinition = {
  name: 'graphql',
  version: '0.1.0',
  label: 'GraphQL',
  description: 'GraphQL API with auto-generated schema from entity types. Provides queries, mutations, and a built-in playground at /api/graphql.',
  package: 'Web services',

  routes: getRoutes,

  events: {
    'entity_type:create': () => resetGraphQLSchema(),
    'entity_type:update': () => resetGraphQLSchema(),
    'entity_type:delete': () => resetGraphQLSchema(),
  },
};

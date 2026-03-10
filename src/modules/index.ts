/**
 * Built-in modules — Web services.
 *
 * These modules are equivalent to Drupal's graphql, jsonapi, and graphql_compose modules.
 * They are installed during server initialization and can be enabled/disabled via the module system.
 */

export { graphqlModule } from './graphql.js';
export { jsonapiModule } from './jsonapi.js';
export { graphqlComposeModule } from './graphql_compose.js';

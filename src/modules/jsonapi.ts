/**
 * JSON:API module — equivalent to Drupal's jsonapi module.
 *
 * Transforms REST API responses to JSON:API 1.0 format when clients
 * request it via Accept header or query parameter.
 *
 * Enable/disable via the module system:
 *   await installModule(jsonapiModule);
 *   await uninstallModule('jsonapi');
 */

import type { ModuleDefinition, ModuleMiddleware } from '../core/module-loader.js';
import { jsonApiMiddleware } from '../api/jsonapi.js';

export const jsonapiModule: ModuleDefinition = {
  name: 'jsonapi',
  version: '0.1.0',
  label: 'JSON:API',
  description: 'JSON:API 1.0 format for REST responses. Activated via Accept: application/vnd.api+json header or ?format=jsonapi query parameter.',
  package: 'Web services',

  middleware: [jsonApiMiddleware as ModuleMiddleware],
};

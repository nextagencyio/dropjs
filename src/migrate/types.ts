import type { DropDbConfig } from '../db/index.js';

/** Configuration loaded from migrate.config.js */
export interface MigrateConfig {
  source: DropDbConfig;
}

/** A parsed Drupal content type definition */
export interface DrupalContentType {
  type: string;
  name: string;
  description: string;
}

/** A parsed Drupal vocabulary definition */
export interface DrupalVocabulary {
  vid: string;
  name: string;
  description: string;
}

/** A parsed Drupal field storage config */
export interface DrupalFieldStorage {
  id: string;
  field_name: string;
  entity_type: string;
  type: string;
  cardinality: number;
  settings: Record<string, unknown>;
}

/** A parsed Drupal field instance config */
export interface DrupalFieldInstance {
  id: string;
  field_name: string;
  entity_type: string;
  bundle: string;
  label: string;
  required: boolean;
  field_type: string;
  settings: Record<string, unknown>;
}

/** Schema analysis report */
export interface AnalysisReport {
  contentTypes: Array<DrupalContentType & { nodeCount: number; fields: DrupalFieldInstance[] }>;
  vocabularies: Array<DrupalVocabulary & { termCount: number }>;
  paragraphTypes: Array<{ type: string; count: number; fields: DrupalFieldInstance[] }>;
  fieldStorages: DrupalFieldStorage[];
  totalNodes: number;
  totalTerms: number;
}

/** Migration progress callback */
export type ProgressCallback = (info: {
  phase: string;
  current: number;
  total: number;
  message: string;
}) => void;

/** ID mapping entry */
export interface IdMapEntry {
  sourceEntityType: string;
  sourceId: number;
  targetEntityType: string;
  targetId: number;
}

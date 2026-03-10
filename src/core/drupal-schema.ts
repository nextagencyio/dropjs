import type { TableDefinition } from '../db/index.js';

export const DRUPAL_NODE_TABLE: TableDefinition = {
  fields: {
    nid: { type: 'serial', primary: true },
    vid: { type: 'int', unsigned: true, nullable: true },
    type: { type: 'varchar', length: 32, nullable: false },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
  indexes: {
    node__type: ['type'],
  },
};

export const DRUPAL_NODE_FIELD_DATA_TABLE: TableDefinition = {
  fields: {
    nid: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'int', unsigned: true, nullable: false },
    type: { type: 'varchar', length: 32, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    title: { type: 'varchar', length: 255, nullable: true },
    uid: { type: 'int', unsigned: true, nullable: true, default: 0 },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    created: { type: 'int', unsigned: true, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
    promote: { type: 'int', unsigned: true, nullable: false, default: 1 },
    sticky: { type: 'int', unsigned: true, nullable: false, default: 0 },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['nid', 'langcode'],
};

export const DRUPAL_NODE_REVISION_TABLE: TableDefinition = {
  fields: {
    nid: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'serial', primary: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    revision_uid: { type: 'int', unsigned: true, nullable: true },
    revision_timestamp: { type: 'int', unsigned: true, nullable: true },
    revision_log: { type: 'text', nullable: true },
    revision_default: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  indexes: {
    node__nid: ['nid'],
  },
};

export const DRUPAL_NODE_FIELD_REVISION_TABLE: TableDefinition = {
  fields: {
    nid: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'int', unsigned: true, nullable: false },
    type: { type: 'varchar', length: 32, nullable: false, default: '' },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    title: { type: 'varchar', length: 255, nullable: true },
    uid: { type: 'int', unsigned: true, nullable: true, default: 0 },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    created: { type: 'int', unsigned: true, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
    promote: { type: 'int', unsigned: true, nullable: false, default: 1 },
    sticky: { type: 'int', unsigned: true, nullable: false, default: 0 },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['vid', 'langcode'],
};

export const DRUPAL_TAXONOMY_TERM_DATA_TABLE: TableDefinition = {
  fields: {
    tid: { type: 'serial', primary: true },
    revision_id: { type: 'int', unsigned: true, nullable: true },
    vid: { type: 'varchar', length: 32, nullable: true },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
};

export const DRUPAL_TAXONOMY_TERM_REVISION_TABLE: TableDefinition = {
  fields: {
    tid: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'serial', primary: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    revision_user: { type: 'int', unsigned: true, nullable: true },
    revision_created: { type: 'int', unsigned: true, nullable: true },
    revision_log_message: { type: 'text', nullable: true },
    revision_default: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  indexes: {
    taxonomy_term_revision__tid: ['tid'],
  },
};

export const DRUPAL_TAXONOMY_TERM_FIELD_REVISION_TABLE: TableDefinition = {
  fields: {
    tid: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    type: { type: 'varchar', length: 32, nullable: false, default: '' },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    name: { type: 'varchar', length: 255, nullable: false, default: '' },
    description__value: { type: 'text', nullable: true },
    description__format: { type: 'varchar', length: 255, nullable: true },
    weight: { type: 'int', nullable: false, default: 0 },
    changed: { type: 'int', unsigned: true, nullable: true },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['revision_id', 'langcode'],
};

export const DRUPAL_TAXONOMY_TERM_FIELD_DATA_TABLE: TableDefinition = {
  fields: {
    tid: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'varchar', length: 32, nullable: false },
    type: { type: 'varchar', length: 32, nullable: false, default: '' },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    name: { type: 'varchar', length: 255, nullable: false },
    description__value: { type: 'text', nullable: true },
    description__format: { type: 'varchar', length: 255, nullable: true },
    weight: { type: 'int', nullable: false, default: 0 },
    changed: { type: 'int', unsigned: true, nullable: true },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['tid', 'langcode'],
};

export const DRUPAL_TAXONOMY_TERM_PARENT_TABLE: TableDefinition = {
  fields: {
    bundle: { type: 'varchar', length: 128, nullable: false },
    deleted: { type: 'int', unsigned: true, nullable: false, default: 0 },
    entity_id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    delta: { type: 'int', unsigned: true, nullable: false },
    parent_target_id: { type: 'int', unsigned: true, nullable: false },
  },
  primaryKey: ['entity_id', 'deleted', 'delta', 'langcode'],
};

export const DRUPAL_TAXONOMY_TERM_REVISION_PARENT_TABLE: TableDefinition = {
  fields: {
    bundle: { type: 'varchar', length: 128, nullable: false },
    deleted: { type: 'int', unsigned: true, nullable: false, default: 0 },
    entity_id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    delta: { type: 'int', unsigned: true, nullable: false },
    parent_target_id: { type: 'int', unsigned: true, nullable: false },
  },
  primaryKey: ['entity_id', 'revision_id', 'deleted', 'delta', 'langcode'],
};

export const DRUPAL_MEDIA_TABLE: TableDefinition = {
  fields: {
    mid: { type: 'serial', primary: true },
    vid: { type: 'int', unsigned: true, nullable: true },
    bundle: { type: 'varchar', length: 32, nullable: false },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
  indexes: {
    media__bundle: ['bundle'],
  },
};

export const DRUPAL_MEDIA_FIELD_DATA_TABLE: TableDefinition = {
  fields: {
    mid: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'int', unsigned: true, nullable: false },
    bundle: { type: 'varchar', length: 32, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    name: { type: 'varchar', length: 255, nullable: true },
    uid: { type: 'int', unsigned: true, nullable: true, default: 0 },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    created: { type: 'int', unsigned: true, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['mid', 'langcode'],
};

export const DRUPAL_MEDIA_REVISION_TABLE: TableDefinition = {
  fields: {
    mid: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'serial', primary: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    revision_uid: { type: 'int', unsigned: true, nullable: true },
    revision_timestamp: { type: 'int', unsigned: true, nullable: true },
    revision_log: { type: 'text', nullable: true },
    revision_default: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  indexes: {
    media__mid: ['mid'],
  },
};

export const DRUPAL_MEDIA_FIELD_REVISION_TABLE: TableDefinition = {
  fields: {
    mid: { type: 'int', unsigned: true, nullable: false },
    vid: { type: 'int', unsigned: true, nullable: false },
    bundle: { type: 'varchar', length: 32, nullable: false, default: '' },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    name: { type: 'varchar', length: 255, nullable: true },
    uid: { type: 'int', unsigned: true, nullable: true, default: 0 },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    created: { type: 'int', unsigned: true, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['vid', 'langcode'],
};

export const DRUPAL_CONFIG_TABLE: TableDefinition = {
  fields: {
    collection: { type: 'varchar', length: 255, nullable: false, default: '' },
    name: { type: 'varchar', length: 255, nullable: false },
    data: { type: 'blob', nullable: true },
  },
  primaryKey: ['collection', 'name'],
};

export const DRUPAL_KEY_VALUE_TABLE: TableDefinition = {
  fields: {
    collection: { type: 'varchar', length: 128, nullable: false },
    name: { type: 'varchar', length: 128, nullable: false },
    value: { type: 'blob', nullable: true },
  },
  primaryKey: ['collection', 'name'],
};

export const DRUPAL_SEQUENCES_TABLE: TableDefinition = {
  fields: {
    value: { type: 'serial', primary: true },
  },
};

// ── Block Content entity (Drupal's block_content module) ─────────────

export const DRUPAL_BLOCK_CONTENT_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    revision_id: { type: 'int', unsigned: true, nullable: true },
    type: { type: 'varchar', length: 32, nullable: false },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
  indexes: { block_content__type: ['type'] },
};

export const DRUPAL_BLOCK_CONTENT_FIELD_DATA_TABLE: TableDefinition = {
  fields: {
    id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    type: { type: 'varchar', length: 32, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    info: { type: 'varchar', length: 255, nullable: true },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    changed: { type: 'int', unsigned: true, nullable: true },
    reusable: { type: 'int', unsigned: true, nullable: false, default: 1 },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['id', 'langcode'],
};

export const DRUPAL_BLOCK_CONTENT_REVISION_TABLE: TableDefinition = {
  fields: {
    id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'serial', primary: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    revision_user: { type: 'int', unsigned: true, nullable: true },
    revision_created: { type: 'int', unsigned: true, nullable: true },
    revision_log: { type: 'text', nullable: true },
    revision_default: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  indexes: { block_content_revision__id: ['id'] },
};

export const DRUPAL_BLOCK_CONTENT_FIELD_REVISION_TABLE: TableDefinition = {
  fields: {
    id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    type: { type: 'varchar', length: 32, nullable: false, default: '' },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    info: { type: 'varchar', length: 255, nullable: true },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
    changed: { type: 'int', unsigned: true, nullable: true },
    reusable: { type: 'int', unsigned: true, nullable: false, default: 1 },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['revision_id', 'langcode'],
};

// ── Menu Link Content entity (Drupal's menu_link_content module) ─────

export const DRUPAL_MENU_LINK_CONTENT_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    revision_id: { type: 'int', unsigned: true, nullable: true },
    bundle: { type: 'varchar', length: 32, nullable: false, default: 'menu_link_content' },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
};

export const DRUPAL_MENU_LINK_CONTENT_DATA_TABLE: TableDefinition = {
  fields: {
    id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    bundle: { type: 'varchar', length: 32, nullable: false, default: 'menu_link_content' },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    enabled: { type: 'int', unsigned: true, nullable: false, default: 1 },
    title: { type: 'varchar', length: 255, nullable: true },
    description: { type: 'varchar', length: 255, nullable: true },
    menu_name: { type: 'varchar', length: 255, nullable: false },
    link__uri: { type: 'varchar', length: 2048, nullable: true },
    link__title: { type: 'varchar', length: 255, nullable: true },
    link__options: { type: 'blob', nullable: true },
    external: { type: 'int', unsigned: true, nullable: false, default: 0 },
    rediscover: { type: 'int', unsigned: true, nullable: false, default: 0 },
    weight: { type: 'int', nullable: false, default: 0 },
    expanded: { type: 'int', unsigned: true, nullable: false, default: 0 },
    parent: { type: 'varchar', length: 255, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
    revision_translation_affected: { type: 'int', unsigned: true, nullable: true, default: 1 },
  },
  primaryKey: ['id', 'langcode'],
  indexes: { menu_link_content__menu: ['menu_name'] },
};

export const DRUPAL_MENU_LINK_CONTENT_REVISION_TABLE: TableDefinition = {
  fields: {
    id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'serial', primary: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    revision_user: { type: 'int', unsigned: true, nullable: true },
    revision_created: { type: 'int', unsigned: true, nullable: true },
    revision_log: { type: 'text', nullable: true },
    revision_default: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  indexes: { menu_link_content_revision__id: ['id'] },
};

// ── Additional Drupal core infrastructure tables ─────────────────────

export const DRUPAL_FLOOD_TABLE: TableDefinition = {
  fields: {
    fid: { type: 'serial', primary: true },
    event: { type: 'varchar', length: 64, nullable: false },
    identifier: { type: 'varchar', length: 128, nullable: false },
    timestamp: { type: 'int', nullable: false, default: 0 },
    expiration: { type: 'int', nullable: false, default: 0 },
  },
  indexes: {
    flood__event: ['event'],
    flood__allow: ['event', 'identifier', 'timestamp'],
    flood__purge: ['expiration'],
  },
};

export const DRUPAL_HISTORY_TABLE: TableDefinition = {
  fields: {
    uid: { type: 'int', unsigned: true, nullable: false, default: 0 },
    nid: { type: 'int', unsigned: true, nullable: false, default: 0 },
    timestamp: { type: 'int', nullable: false, default: 0 },
  },
  primaryKey: ['uid', 'nid'],
  indexes: { history__nid: ['nid'] },
};

export const DRUPAL_MENU_TREE_TABLE: TableDefinition = {
  fields: {
    menu_name: { type: 'varchar', length: 128, nullable: false, default: '' },
    mlid: { type: 'serial', primary: true },
    id: { type: 'varchar', length: 255, nullable: false },
    parent: { type: 'varchar', length: 255, nullable: false, default: '' },
    route_name: { type: 'varchar', length: 255, nullable: true },
    route_param_key: { type: 'varchar', length: 255, nullable: true },
    route_parameters: { type: 'blob', nullable: true },
    url: { type: 'varchar', length: 255, nullable: false, default: '' },
    title: { type: 'blob', nullable: true },
    description: { type: 'blob', nullable: true },
    class: { type: 'text', nullable: true },
    options: { type: 'blob', nullable: true },
    provider: { type: 'varchar', length: 50, nullable: false, default: 'system' },
    enabled: { type: 'int', unsigned: true, nullable: false, default: 1 },
    discovered: { type: 'int', unsigned: true, nullable: false, default: 0 },
    expanded: { type: 'int', unsigned: true, nullable: false, default: 0 },
    weight: { type: 'int', nullable: false, default: 0 },
    metadata: { type: 'blob', nullable: true },
    has_children: { type: 'int', unsigned: true, nullable: false, default: 0 },
    depth: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p1: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p2: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p3: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p4: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p5: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p6: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p7: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p8: { type: 'int', unsigned: true, nullable: false, default: 0 },
    p9: { type: 'int', unsigned: true, nullable: false, default: 0 },
    form_class: { type: 'varchar', length: 255, nullable: true },
  },
  indexes: {
    menu_tree__menu_name: ['menu_name'],
    menu_tree__route_values: ['route_name', 'route_param_key'],
  },
};

export const DRUPAL_BATCH_TABLE: TableDefinition = {
  fields: {
    bid: { type: 'serial', primary: true },
    token: { type: 'varchar', length: 64, nullable: false },
    timestamp: { type: 'int', nullable: false },
    batch: { type: 'blob', nullable: true },
  },
  indexes: { batch__token: ['token'] },
};

export const DRUPAL_WATCHDOG_TABLE: TableDefinition = {
  fields: {
    wid: { type: 'serial', primary: true },
    uid: { type: 'int', unsigned: true, nullable: false, default: 0 },
    type: { type: 'varchar', length: 64, nullable: false, default: '' },
    message: { type: 'text', nullable: false },
    variables: { type: 'blob', nullable: true },
    severity: { type: 'int', unsigned: true, nullable: false, default: 0 },
    link: { type: 'text', nullable: true },
    location: { type: 'text', nullable: true },
    referer: { type: 'text', nullable: true },
    hostname: { type: 'varchar', length: 128, nullable: false, default: '' },
    timestamp: { type: 'int', nullable: false, default: 0 },
  },
  indexes: {
    watchdog__type: ['type'],
    watchdog__uid: ['uid'],
    watchdog__severity: ['severity'],
  },
};

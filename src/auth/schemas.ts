import type { TableDefinition } from '../db/index.js';

/**
 * Drupal-compatible `users` base table.
 * In Drupal, this only stores uid, uuid, and langcode.
 */
export const USER_TABLE: TableDefinition = {
  fields: {
    uid: { type: 'serial', primary: true },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
};

/**
 * Drupal-compatible `users_field_data` table.
 * Stores all user profile data (name, pass, mail, status, etc.).
 */
export const USER_FIELD_DATA_TABLE: TableDefinition = {
  fields: {
    uid: { type: 'int', unsigned: true, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    preferred_langcode: { type: 'varchar', length: 12, nullable: true, default: 'en' },
    preferred_admin_langcode: { type: 'varchar', length: 12, nullable: true },
    name: { type: 'varchar', length: 60, nullable: false, unique: true },
    pass: { type: 'varchar', length: 255, nullable: true },
    mail: { type: 'varchar', length: 254, nullable: true },
    timezone: { type: 'varchar', length: 32, nullable: true, default: '' },
    status: { type: 'int', unsigned: true, nullable: false, default: 0 },
    created: { type: 'int', unsigned: true, nullable: false, default: 0 },
    changed: { type: 'int', unsigned: true, nullable: true, default: 0 },
    access: { type: 'int', unsigned: true, nullable: false, default: 0 },
    login: { type: 'int', unsigned: true, nullable: false, default: 0 },
    init: { type: 'varchar', length: 254, nullable: true },
    default_langcode: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  primaryKey: ['uid', 'langcode'],
  indexes: {
    user__mail: ['mail'],
    user__created: ['created'],
    user__access: ['access'],
  },
};

/**
 * Drupal-compatible `user__roles` field storage table.
 * Follows the standard Drupal entity field storage pattern.
 */
export const USER_ROLES_TABLE: TableDefinition = {
  fields: {
    bundle: { type: 'varchar', length: 128, nullable: false, default: 'user' },
    deleted: { type: 'int', unsigned: true, nullable: false, default: 0 },
    entity_id: { type: 'int', unsigned: true, nullable: false },
    revision_id: { type: 'int', unsigned: true, nullable: false },
    langcode: { type: 'varchar', length: 32, nullable: false, default: 'en' },
    delta: { type: 'int', unsigned: true, nullable: false },
    roles_target_id: { type: 'varchar', length: 255, nullable: false },
  },
  primaryKey: ['entity_id', 'deleted', 'delta', 'langcode'],
  indexes: {
    user__roles_bundle: ['bundle'],
    user__roles_revision_id: ['revision_id'],
    user__roles_target_id: ['roles_target_id'],
  },
};

export const SESSION_TABLE: TableDefinition = {
  fields: {
    sid: { type: 'varchar', length: 128, nullable: false },
    uid: { type: 'int', nullable: false, default: 0 },
    token: { type: 'varchar', length: 128, nullable: true, unique: true },
    created: { type: 'timestamp' },
    expires: { type: 'timestamp', nullable: true },
    // Drupal-compat columns (used by PHP session handler)
    hostname: { type: 'varchar', length: 128, nullable: true, default: '' },
    session: { type: 'blob', nullable: true },
    timestamp: { type: 'int', nullable: true, default: 0 },
  },
  primaryKey: ['sid'],
  indexes: {
    idx_sessions_uid: ['uid'],
    idx_sessions_timestamp: ['timestamp'],
  },
};

export const PASSWORD_RESET_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    uid: { type: 'int', nullable: false },
    token: { type: 'varchar', length: 128, nullable: false, unique: true },
    created: { type: 'timestamp' },
    expires: { type: 'timestamp' },
    used: { type: 'boolean', default: false },
  },
  indexes: {
    idx_password_reset_uid: ['uid'],
    idx_password_reset_token: ['token'],
  },
};

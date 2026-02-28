import { db, schema as dbSchema } from '../db/index.js';
import { fieldStorage, validateEntity } from '../field/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  getEntityTypeDefinition,
  NODE_BASE_FIELDS,
  MEDIA_BASE_FIELDS,
  type EntityTypeDefinition,
  type FieldDefinition,
} from './entity-type.js';
import { EntityQuery } from './entity-query.js';
import { EventBus } from './event-bus.js';
import { getCacheBin, entityCacheTags, cacheInvalidateTags } from './cache.js';
import {
  DRUPAL_NODE_TABLE,
  DRUPAL_NODE_FIELD_DATA_TABLE,
  DRUPAL_NODE_REVISION_TABLE,
  DRUPAL_NODE_FIELD_REVISION_TABLE,
  DRUPAL_CONFIG_TABLE,
  DRUPAL_KEY_VALUE_TABLE,
  DRUPAL_SEQUENCES_TABLE,
  DRUPAL_TAXONOMY_TERM_DATA_TABLE,
  DRUPAL_TAXONOMY_TERM_FIELD_DATA_TABLE,
  DRUPAL_TAXONOMY_TERM_PARENT_TABLE,
  DRUPAL_MEDIA_TABLE,
  DRUPAL_MEDIA_FIELD_DATA_TABLE,
  DRUPAL_MEDIA_REVISION_TABLE,
  DRUPAL_MEDIA_FIELD_REVISION_TABLE,
} from './drupal-schema.js';

export interface EntityData {
  [key: string]: unknown;
  nid?: number;
  vid?: number;
  uuid?: string;
  type?: string;
  title?: string;
  status?: boolean | number;
  uid?: number;
  created?: string | Date | number;
  changed?: string | Date | number;
  langcode?: string;
  promote?: number;
  sticky?: number;
}

export class Entity {
  private _data: EntityData;
  private _entityType: string;
  private _bundle: string;
  private _definition: EntityTypeDefinition;
  private _isNew: boolean;

  private constructor(
    entityType: string,
    bundle: string,
    data: EntityData,
    definition: EntityTypeDefinition,
    isNew: boolean
  ) {
    this._entityType = entityType;
    this._bundle = bundle;
    this._data = data;
    this._definition = definition;
    this._isNew = isNew;
  }

  // Property accessors for base fields
  get nid(): number | undefined { return this._data.nid as number | undefined; }
  get vid(): number | undefined { return this._data.vid as number | undefined; }
  get uuid(): string | undefined { return this._data.uuid as string | undefined; }
  get type(): string { return this._bundle; }
  get entityType(): string { return this._entityType; }
  get bundle(): string { return this._bundle; }

  get title(): string | undefined { return this._data.title as string | undefined; }
  set title(val: string | undefined) { this._data.title = val; }

  get status(): boolean {
    const s = this._data.status;
    if (typeof s === 'number') return s !== 0;
    return Boolean(s);
  }
  set status(val: boolean) { this._data.status = val; }

  get uid(): number | undefined { return this._data.uid as number | undefined; }
  set uid(val: number | undefined) { this._data.uid = val; }

  get created(): string | Date | number | undefined { return this._data.created as string | Date | number | undefined; }
  get changed(): string | Date | number | undefined { return this._data.changed as string | Date | number | undefined; }

  get langcode(): string { return (this._data.langcode as string) ?? 'en'; }

  // Dynamic field accessors
  get(field: string): unknown {
    return this._data[field];
  }

  set(field: string, value: unknown): void {
    this._data[field] = value;
  }

  toJSON(): EntityData {
    return { ...this._data };
  }

  /**
   * Validate field values against the entity type definition.
   * Throws an error with details if validation fails.
   */
  private static validateFields(
    definition: EntityTypeDefinition,
    values: Record<string, unknown>
  ): void {
    const result = validateEntity(definition.fields, values);
    if (!result.valid) {
      const err = new Error('Validation failed');
      (err as any).status = 422;
      (err as any).details = result.errors;
      throw err;
    }
  }

  // ─── Static API ────────────────────────────────────────────

  /**
   * Ensure the base entity table(s) exist.
   */
  static async ensureBaseTable(entityType: string): Promise<void> {
    if (entityType === 'node') {
      await dbSchema.createTable('node', DRUPAL_NODE_TABLE);
      await dbSchema.createTable('node_field_data', DRUPAL_NODE_FIELD_DATA_TABLE);
      await dbSchema.createTable('node_revision', DRUPAL_NODE_REVISION_TABLE);
      await dbSchema.createTable('node_field_revision', DRUPAL_NODE_FIELD_REVISION_TABLE);
      await dbSchema.createTable('config', DRUPAL_CONFIG_TABLE);
      await dbSchema.createTable('key_value', DRUPAL_KEY_VALUE_TABLE);
      await dbSchema.createTable('sequences', DRUPAL_SEQUENCES_TABLE);
      return;
    }

    if (entityType === 'taxonomy_term') {
      await dbSchema.createTable('taxonomy_term_data', DRUPAL_TAXONOMY_TERM_DATA_TABLE);
      await dbSchema.createTable('taxonomy_term_field_data', DRUPAL_TAXONOMY_TERM_FIELD_DATA_TABLE);
      await dbSchema.createTable('taxonomy_term__parent', DRUPAL_TAXONOMY_TERM_PARENT_TABLE);
      return;
    }

    if (entityType === 'media') {
      await dbSchema.createTable('media', DRUPAL_MEDIA_TABLE);
      await dbSchema.createTable('media_field_data', DRUPAL_MEDIA_FIELD_DATA_TABLE);
      await dbSchema.createTable('media_revision', DRUPAL_MEDIA_REVISION_TABLE);
      await dbSchema.createTable('media_field_revision', DRUPAL_MEDIA_FIELD_REVISION_TABLE);
      return;
    }

    // Generic fallback for other entity types
    const hasTable = await dbSchema.hasTable(entityType);
    if (hasTable) return;

    await dbSchema.createTable(entityType, {
      fields: {
        nid: { type: 'serial', primary: true },
        uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
        type: { type: 'varchar', length: 128, nullable: false },
        langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
        title: { type: 'varchar', length: 255, nullable: true },
        status: { type: 'int', unsigned: true, default: 1 },
        uid: { type: 'int', nullable: true },
        created: { type: 'int', unsigned: true, nullable: true },
        changed: { type: 'int', unsigned: true, nullable: true },
      },
      indexes: {
        [`idx_${entityType}_type`]: ['type'],
        [`idx_${entityType}_status`]: ['status'],
        [`idx_${entityType}_uid`]: ['uid'],
      },
    });
  }

  /**
   * Ensure field storage tables exist for an entity type definition.
   */
  static async ensureFieldTables(definition: EntityTypeDefinition): Promise<void> {
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      // Skip base fields
      if (fieldName in NODE_BASE_FIELDS) continue;
      if (fieldName in MEDIA_BASE_FIELDS) continue;
      if (['title', 'status', 'uid', 'name'].includes(fieldName)) continue;

      const tableName = `${definition.entity_type}__${fieldName}`;
      const hasTable = await dbSchema.hasTable(tableName);
      if (!hasTable) {
        await fieldStorage.createFieldTable(
          definition.entity_type,
          fieldName,
          fieldDef.type,
          fieldDef.settings
        );
      }
    }
  }

  /**
   * Create a new entity.
   */
  static async create(
    entityType: string,
    bundle: string,
    values: EntityData
  ): Promise<Entity> {
    const definition = getEntityTypeDefinition(entityType, bundle);
    if (!definition) {
      throw new Error(`Unknown entity type: ${entityType}:${bundle}`);
    }

    if (entityType === 'node') {
      return Entity._createNode(bundle, values, definition);
    }

    if (entityType === 'taxonomy_term') {
      return Entity._createTaxonomyTerm(bundle, values, definition);
    }

    if (entityType === 'media') {
      return Entity._createMedia(bundle, values, definition);
    }

    // Generic fallback
    return Entity._createGeneric(entityType, bundle, values, definition);
  }

  private static async _createNode(
    bundle: string,
    values: EntityData,
    definition: EntityTypeDefinition
  ): Promise<Entity> {
    const now = Math.floor(Date.now() / 1000);
    const uuid = uuidv4();

    const data: EntityData = {
      langcode: 'en',
      title: values.title ?? undefined,
      status: values.status !== undefined ? (values.status ? 1 : 0) : 1,
      uid: values.uid ?? 0,
      created: now,
      changed: now,
      promote: values.promote ?? 1,
      sticky: values.sticky ?? 0,
      ...values,
      // Ensure these are always set correctly
      uuid: values.uuid ?? uuid,
      type: bundle,
    };

    // Normalize status to int
    if (typeof data.status === 'boolean') {
      data.status = data.status ? 1 : 0;
    }

    // Validate field values
    Entity.validateFields(definition, data);

    const entity = new Entity('node', bundle, data, definition, true);

    // Fire presave event
    await EventBus.emit('entity:presave', entity);

    // 1. Insert into node table
    const [nid] = await db.insert('node').values({
      type: bundle,
      uuid: entity._data.uuid,
      langcode: 'en',
    }).execute();
    entity._data.nid = nid;

    // 2. Update node to set vid = nid (stub revision)
    await db.update('node').set({ vid: nid }).condition('nid', nid).execute();
    entity._data.vid = nid;

    // 3. Insert into node_field_data
    await db.insert('node_field_data').values({
      nid,
      vid: nid,
      type: bundle,
      langcode: 'en',
      title: entity._data.title ?? null,
      uid: entity._data.uid ?? 0,
      status: typeof entity._data.status === 'boolean' ? (entity._data.status ? 1 : 0) : (entity._data.status ?? 1),
      created: now,
      changed: now,
      promote: entity._data.promote ?? 1,
      sticky: entity._data.sticky ?? 0,
      default_langcode: 1,
      revision_translation_affected: 1,
    }).execute();

    // 4. Insert into node_revision
    const [vid] = await db.insert('node_revision').values({
      nid,
      langcode: 'en',
      revision_uid: entity._data.uid ?? 0,
      revision_timestamp: now,
    }).execute();
    // vid from node_revision is the auto-increment; update entity vid if different
    if (vid !== nid) {
      entity._data.vid = vid;
      await db.update('node').set({ vid }).condition('nid', nid).execute();
      await db.update('node_field_data').set({ vid }).condition('nid', nid).condition('langcode', 'en').execute();
    }

    // 5. Insert into node_field_revision (mirror of node_field_data)
    await db.insert('node_field_revision').values({
      nid,
      vid: entity._data.vid,
      type: bundle,
      langcode: 'en',
      title: entity._data.title ?? null,
      uid: entity._data.uid ?? 0,
      status: typeof entity._data.status === 'boolean' ? (entity._data.status ? 1 : 0) : (entity._data.status ?? 1),
      created: now,
      changed: now,
      promote: entity._data.promote ?? 1,
      sticky: entity._data.sticky ?? 0,
      default_langcode: 1,
      revision_translation_affected: 1,
    }).execute();

    entity._isNew = false;

    // Save field values
    await Entity.saveFields(entity);

    // Fire insert event
    await EventBus.emit('entity:insert', entity);

    return entity;
  }

  private static async _createTaxonomyTerm(
    bundle: string,
    values: EntityData,
    definition: EntityTypeDefinition
  ): Promise<Entity> {
    const now = Math.floor(Date.now() / 1000);
    const uuid = values.uuid ?? uuidv4();

    const data: EntityData = {
      langcode: 'en',
      title: values.title ?? undefined,
      status: values.status !== undefined ? (values.status ? 1 : 0) : 1,
      created: now,
      changed: now,
      ...values,
      uuid,
      type: bundle,
    };

    if (typeof data.status === 'boolean') {
      data.status = data.status ? 1 : 0;
    }

    // Validate field values
    Entity.validateFields(definition, data);

    const entity = new Entity('taxonomy_term', bundle, data, definition, true);

    await EventBus.emit('entity:presave', entity);

    // 1. Insert into taxonomy_term_data
    const [tid] = await db.insert('taxonomy_term_data').values({
      uuid,
      langcode: 'en',
    }).execute();
    entity._data.nid = tid; // nid maps to tid for taxonomy_terms

    // 2. Update to set vid = tid
    await db.update('taxonomy_term_data').set({ vid: tid }).condition('tid', tid).execute();
    entity._data.vid = tid;

    // Extract parent and weight from values
    const parentId = typeof entity._data.parent === 'number' ? entity._data.parent : 0;
    const weightVal = typeof entity._data.weight === 'number' ? entity._data.weight : 0;

    // 3. Insert into taxonomy_term_field_data
    await db.insert('taxonomy_term_field_data').values({
      tid,
      vid: tid,
      type: bundle,
      langcode: 'en',
      default_langcode: 1,
      name: entity._data.title ?? '',
      description__value: null,
      description__format: null,
      weight: weightVal,
      changed: now,
      status: typeof entity._data.status === 'boolean' ? (entity._data.status ? 1 : 0) : (entity._data.status ?? 1),
      revision_translation_affected: 1,
    }).execute();

    // 4. Insert into taxonomy_term__parent
    await db.insert('taxonomy_term__parent').values({
      bundle,
      deleted: 0,
      entity_id: tid,
      revision_id: tid,
      langcode: 'en',
      delta: 0,
      parent_target_id: parentId,
    }).execute();

    entity._isNew = false;

    // Save field values
    await Entity.saveFields(entity);

    await EventBus.emit('entity:insert', entity);

    return entity;
  }

  private static async _createMedia(
    bundle: string,
    values: EntityData,
    definition: EntityTypeDefinition
  ): Promise<Entity> {
    const now = Math.floor(Date.now() / 1000);
    const uuid = values.uuid ?? uuidv4();

    // Map 'title' to 'name' for API compatibility
    const mediaName = values.title ?? values.name ?? undefined;

    const data: EntityData = {
      langcode: 'en',
      title: mediaName as string | undefined, // Store as title in EntityData for API consistency
      status: values.status !== undefined ? (values.status ? 1 : 0) : 1,
      uid: values.uid ?? 0,
      created: now,
      changed: now,
      ...values,
      uuid,
      type: bundle,
    };

    // Normalize status to int
    if (typeof data.status === 'boolean') {
      data.status = data.status ? 1 : 0;
    }

    // Validate field values
    Entity.validateFields(definition, data);

    const entity = new Entity('media', bundle, data, definition, true);

    // Fire presave event
    await EventBus.emit('entity:presave', entity);

    // 1. Insert into media table
    const [mid] = await db.insert('media').values({
      bundle,
      uuid: entity._data.uuid,
      langcode: 'en',
    }).execute();
    entity._data.nid = mid; // nid maps to mid for consistent API

    // 2. Update media to set vid = mid (stub revision)
    await db.update('media').set({ vid: mid }).condition('mid', mid).execute();
    entity._data.vid = mid;

    // 3. Insert into media_field_data
    await db.insert('media_field_data').values({
      mid,
      vid: mid,
      bundle,
      langcode: 'en',
      name: entity._data.title ?? null,
      uid: entity._data.uid ?? 0,
      status: typeof entity._data.status === 'boolean' ? (entity._data.status ? 1 : 0) : (entity._data.status ?? 1),
      created: now,
      changed: now,
      default_langcode: 1,
      revision_translation_affected: 1,
    }).execute();

    // 4. Insert into media_revision
    const [vid] = await db.insert('media_revision').values({
      mid,
      langcode: 'en',
      revision_uid: entity._data.uid ?? 0,
      revision_timestamp: now,
    }).execute();
    // vid from media_revision is the auto-increment; update entity vid if different
    if (vid !== mid) {
      entity._data.vid = vid;
      await db.update('media').set({ vid }).condition('mid', mid).execute();
      await db.update('media_field_data').set({ vid }).condition('mid', mid).condition('langcode', 'en').execute();
    }

    // 5. Insert into media_field_revision (mirror of media_field_data)
    await db.insert('media_field_revision').values({
      mid,
      vid: entity._data.vid,
      bundle,
      langcode: 'en',
      name: entity._data.title ?? null,
      uid: entity._data.uid ?? 0,
      status: typeof entity._data.status === 'boolean' ? (entity._data.status ? 1 : 0) : (entity._data.status ?? 1),
      created: now,
      changed: now,
      default_langcode: 1,
      revision_translation_affected: 1,
    }).execute();

    entity._isNew = false;

    // Save field values
    await Entity.saveFields(entity);

    // Fire insert event
    await EventBus.emit('entity:insert', entity);

    return entity;
  }

  private static async _createGeneric(
    entityType: string,
    bundle: string,
    values: EntityData,
    definition: EntityTypeDefinition
  ): Promise<Entity> {
    const now = Math.floor(Date.now() / 1000);
    const data: EntityData = {
      uuid: uuidv4(),
      type: bundle,
      langcode: 'en',
      title: values.title ?? undefined,
      status: values.status !== undefined ? (values.status ? 1 : 0) : 1,
      uid: values.uid ?? undefined,
      created: now,
      changed: now,
      ...values,
    };

    if (typeof data.status === 'boolean') {
      data.status = data.status ? 1 : 0;
    }

    // Validate field values
    Entity.validateFields(definition, data);

    const entity = new Entity(entityType, bundle, data, definition, true);

    await EventBus.emit('entity:presave', entity);

    const baseRow: Record<string, unknown> = {
      uuid: entity._data.uuid,
      type: bundle,
      langcode: 'en',
      title: entity._data.title,
      status: typeof entity._data.status === 'boolean' ? (entity._data.status ? 1 : 0) : (entity._data.status ?? 1),
      uid: entity._data.uid,
      created: entity._data.created,
      changed: entity._data.changed,
    };

    const [nid] = await db.insert(entityType).values(baseRow).execute();
    entity._data.nid = nid;
    entity._isNew = false;

    await Entity.saveFields(entity);
    await EventBus.emit('entity:insert', entity);

    return entity;
  }

  /**
   * Load a single entity by ID.
   * Uses the entity cache bin for repeat loads.
   */
  static async load(
    entityType: string,
    id: number
  ): Promise<Entity | null> {
    const cacheKey = `${entityType}:${id}`;
    const cache = getCacheBin('entity');
    const cached = cache.get<Entity>(cacheKey);
    if (cached) return cached;

    let entity: Entity | null;
    if (entityType === 'node') {
      entity = await Entity._loadNode(id);
    } else if (entityType === 'taxonomy_term') {
      entity = await Entity._loadTaxonomyTerm(id);
    } else if (entityType === 'media') {
      entity = await Entity._loadMedia(id);
    } else {
      entity = await Entity._loadGeneric(entityType, id);
    }

    if (entity) {
      cache.set(cacheKey, entity, entityCacheTags(entityType, id, entity.bundle), 300);
    }
    return entity;
  }

  private static async _loadNode(id: number): Promise<Entity | null> {
    // Read from node_field_data
    const rows = await db
      .select('node_field_data', 'nfd')
      .fields('nfd', ['nid', 'vid', 'type', 'langcode', 'title', 'uid', 'status', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected'])
      .condition('nfd.nid', id)
      .condition('nfd.langcode', 'en')
      .execute<Record<string, unknown>>();

    if (rows.length === 0) return null;

    const row = rows[0];

    // Also get uuid from node table
    const nodeRows = await db
      .select('node')
      .fields(['uuid'])
      .condition('nid', id)
      .execute<{ uuid: string }>();

    const uuid = nodeRows.length > 0 ? nodeRows[0].uuid : undefined;

    const bundle = row.type as string;
    const definition = getEntityTypeDefinition('node', bundle);
    if (!definition) return null;

    const data: EntityData = {
      nid: row.nid as number,
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: row.langcode as string,
      title: row.title as string | undefined,
      uid: row.uid as number,
      status: row.status as number,
      created: row.created as number,
      changed: row.changed as number,
      promote: row.promote as number,
      sticky: row.sticky as number,
      default_langcode: row.default_langcode as number,
      revision_translation_affected: row.revision_translation_affected as number,
    };

    // Load field values
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValues(
        'node',
        data.nid as number,
        fieldName,
        fieldDef.type,
        fieldDef.settings
      );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (values[0] ?? null) : values;
    }

    const entity = new Entity('node', bundle, data, definition, false);
    await EventBus.emit('entity:load', entity);
    return entity;
  }

  private static async _loadTaxonomyTerm(id: number): Promise<Entity | null> {
    // Read from taxonomy_term_field_data
    const rows = await db
      .select('taxonomy_term_field_data', 'tfd')
      .fields('tfd', ['tid', 'vid', 'type', 'langcode', 'default_langcode', 'name', 'description__value', 'description__format', 'weight', 'changed', 'status', 'revision_translation_affected'])
      .condition('tfd.tid', id)
      .condition('tfd.langcode', 'en')
      .execute<Record<string, unknown>>();

    if (rows.length === 0) return null;

    const row = rows[0];

    // Get uuid from taxonomy_term_data
    const termRows = await db
      .select('taxonomy_term_data')
      .fields(['uuid'])
      .condition('tid', id)
      .execute<{ uuid: string }>();

    const uuid = termRows.length > 0 ? termRows[0].uuid : undefined;
    const bundle = (row.type as string) || 'default';

    const definition = getEntityTypeDefinition('taxonomy_term', bundle);
    if (!definition) return null;

    // Load parent from taxonomy_term__parent table
    const parentRows = await db
      .select('taxonomy_term__parent')
      .fields(['parent_target_id'])
      .condition('entity_id', id)
      .execute<{ parent_target_id: number }>();

    const parentTargetId = parentRows.length > 0 ? parentRows[0].parent_target_id : 0;

    const data: EntityData = {
      nid: row.tid as number, // Map tid to nid for consistent API
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: row.langcode as string,
      title: row.name as string, // Map name to title for consistent API
      status: row.status as number,
      changed: row.changed as number,
      weight: row.weight as number,
      parent: parentTargetId,
    };

    // Load field values
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValues(
        'taxonomy_term',
        data.nid as number,
        fieldName,
        fieldDef.type,
        fieldDef.settings
      );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (values[0] ?? null) : values;
    }

    const entity = new Entity('taxonomy_term', bundle, data, definition, false);
    await EventBus.emit('entity:load', entity);
    return entity;
  }

  private static async _loadMedia(id: number): Promise<Entity | null> {
    // Read from media_field_data
    const rows = await db
      .select('media_field_data', 'mfd')
      .fields('mfd', ['mid', 'vid', 'bundle', 'langcode', 'name', 'uid', 'status', 'created', 'changed', 'default_langcode', 'revision_translation_affected'])
      .condition('mfd.mid', id)
      .condition('mfd.langcode', 'en')
      .execute<Record<string, unknown>>();

    if (rows.length === 0) return null;

    const row = rows[0];

    // Also get uuid from media table
    const mediaRows = await db
      .select('media')
      .fields(['uuid'])
      .condition('mid', id)
      .execute<{ uuid: string }>();

    const uuid = mediaRows.length > 0 ? mediaRows[0].uuid : undefined;

    const bundle = row.bundle as string;
    const definition = getEntityTypeDefinition('media', bundle);
    if (!definition) return null;

    const data: EntityData = {
      nid: row.mid as number, // Map mid to nid for consistent API
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: row.langcode as string,
      title: row.name as string | undefined, // Map name back to title for API consistency
      uid: row.uid as number,
      status: row.status as number,
      created: row.created as number,
      changed: row.changed as number,
      default_langcode: row.default_langcode as number,
      revision_translation_affected: row.revision_translation_affected as number,
    };

    // Load field values
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || fieldName in MEDIA_BASE_FIELDS || ['title', 'status', 'uid', 'name'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValues(
        'media',
        data.nid as number,
        fieldName,
        fieldDef.type,
        fieldDef.settings
      );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (values[0] ?? null) : values;
    }

    const entity = new Entity('media', bundle, data, definition, false);
    await EventBus.emit('entity:load', entity);
    return entity;
  }

  private static async _loadGeneric(entityType: string, id: number): Promise<Entity | null> {
    const rows = await db
      .select(entityType)
      .fields(['nid', 'uuid', 'type', 'langcode', 'title', 'status', 'uid', 'created', 'changed'])
      .condition('nid', id)
      .execute<EntityData>();

    if (rows.length === 0) return null;

    const row = rows[0];
    const bundle = row.type as string;
    const definition = getEntityTypeDefinition(entityType, bundle);
    if (!definition) return null;

    const data: EntityData = { ...row };

    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValues(
        entityType,
        data.nid as number,
        fieldName,
        fieldDef.type,
        fieldDef.settings
      );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (values[0] ?? null) : values;
    }

    const entity = new Entity(entityType, bundle, data, definition, false);
    await EventBus.emit('entity:load', entity);
    return entity;
  }

  /**
   * Load multiple entities by IDs.
   */
  static async loadMultiple(
    entityType: string,
    ids: number[]
  ): Promise<Entity[]> {
    if (ids.length === 0) return [];

    const entities: Entity[] = [];
    for (const id of ids) {
      const entity = await Entity.load(entityType, id);
      if (entity) entities.push(entity);
    }
    return entities;
  }

  /**
   * Load an entity in a specific language (translation).
   * Falls back to the default language if the translation doesn't exist.
   */
  static async loadTranslation(
    entityType: string,
    id: number,
    langcode: string
  ): Promise<Entity | null> {
    if (langcode === 'en') {
      return Entity.load(entityType, id);
    }

    if (entityType === 'node') {
      return Entity._loadNodeTranslation(id, langcode);
    } else if (entityType === 'taxonomy_term') {
      return Entity._loadTaxonomyTermTranslation(id, langcode);
    } else if (entityType === 'media') {
      return Entity._loadMediaTranslation(id, langcode);
    }

    // Generic types don't support translations — return default
    return Entity.load(entityType, id);
  }

  private static async _loadNodeTranslation(id: number, langcode: string): Promise<Entity | null> {
    // Try the requested langcode first
    let rows = await db
      .select('node_field_data', 'nfd')
      .fields('nfd', ['nid', 'vid', 'type', 'langcode', 'title', 'uid', 'status', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected'])
      .condition('nfd.nid', id)
      .condition('nfd.langcode', langcode)
      .execute<Record<string, unknown>>();

    // Fallback to default language
    if (rows.length === 0) {
      rows = await db
        .select('node_field_data', 'nfd')
        .fields('nfd', ['nid', 'vid', 'type', 'langcode', 'title', 'uid', 'status', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected'])
        .condition('nfd.nid', id)
        .condition('nfd.default_langcode', 1)
        .execute<Record<string, unknown>>();
    }

    if (rows.length === 0) return null;

    const row = rows[0];
    const actualLangcode = row.langcode as string;

    const nodeRows = await db
      .select('node')
      .fields(['uuid'])
      .condition('nid', id)
      .execute<{ uuid: string }>();

    const uuid = nodeRows.length > 0 ? nodeRows[0].uuid : undefined;
    const bundle = row.type as string;
    const definition = getEntityTypeDefinition('node', bundle);
    if (!definition) return null;

    const data: EntityData = {
      nid: row.nid as number,
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: actualLangcode,
      title: row.title as string | undefined,
      uid: row.uid as number,
      status: row.status as number,
      created: row.created as number,
      changed: row.changed as number,
      promote: row.promote as number,
      sticky: row.sticky as number,
      default_langcode: row.default_langcode as number,
      revision_translation_affected: row.revision_translation_affected as number,
    };

    // Load field values for this langcode
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValuesWithLangcode(
        'node',
        data.nid as number,
        fieldName,
        fieldDef.type,
        actualLangcode,
        fieldDef.settings
      );

      // Fall back to default language field values if none for this langcode
      const finalValues = values.length > 0
        ? values
        : await fieldStorage.loadFieldValues(
            'node',
            data.nid as number,
            fieldName,
            fieldDef.type,
            fieldDef.settings
          );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (finalValues[0] ?? null) : finalValues;
    }

    return new Entity('node', bundle, data, definition, false);
  }

  private static async _loadTaxonomyTermTranslation(id: number, langcode: string): Promise<Entity | null> {
    let rows = await db
      .select('taxonomy_term_field_data', 'tfd')
      .fields('tfd', ['tid', 'vid', 'type', 'langcode', 'default_langcode', 'name', 'description__value', 'description__format', 'weight', 'changed', 'status', 'revision_translation_affected'])
      .condition('tfd.tid', id)
      .condition('tfd.langcode', langcode)
      .execute<Record<string, unknown>>();

    if (rows.length === 0) {
      rows = await db
        .select('taxonomy_term_field_data', 'tfd')
        .fields('tfd', ['tid', 'vid', 'type', 'langcode', 'default_langcode', 'name', 'description__value', 'description__format', 'weight', 'changed', 'status', 'revision_translation_affected'])
        .condition('tfd.tid', id)
        .condition('tfd.default_langcode', 1)
        .execute<Record<string, unknown>>();
    }

    if (rows.length === 0) return null;

    const row = rows[0];
    const actualLangcode = row.langcode as string;

    const termRows = await db
      .select('taxonomy_term_data')
      .fields(['uuid'])
      .condition('tid', id)
      .execute<{ uuid: string }>();

    const uuid = termRows.length > 0 ? termRows[0].uuid : undefined;
    const bundle = (row.type as string) || 'default';
    const definition = getEntityTypeDefinition('taxonomy_term', bundle);
    if (!definition) return null;

    const parentRows = await db
      .select('taxonomy_term__parent')
      .fields(['parent_target_id'])
      .condition('entity_id', id)
      .execute<{ parent_target_id: number }>();

    const parentTargetId = parentRows.length > 0 ? parentRows[0].parent_target_id : 0;

    const data: EntityData = {
      nid: row.tid as number,
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: actualLangcode,
      title: row.name as string,
      status: row.status as number,
      changed: row.changed as number,
      weight: row.weight as number,
      parent: parentTargetId,
    };

    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValuesWithLangcode(
        'taxonomy_term',
        data.nid as number,
        fieldName,
        fieldDef.type,
        actualLangcode,
        fieldDef.settings
      );

      const finalValues = values.length > 0
        ? values
        : await fieldStorage.loadFieldValues(
            'taxonomy_term',
            data.nid as number,
            fieldName,
            fieldDef.type,
            fieldDef.settings
          );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (finalValues[0] ?? null) : finalValues;
    }

    return new Entity('taxonomy_term', bundle, data, definition, false);
  }

  private static async _loadMediaTranslation(id: number, langcode: string): Promise<Entity | null> {
    // Try the requested langcode first
    let rows = await db
      .select('media_field_data', 'mfd')
      .fields('mfd', ['mid', 'vid', 'bundle', 'langcode', 'name', 'uid', 'status', 'created', 'changed', 'default_langcode', 'revision_translation_affected'])
      .condition('mfd.mid', id)
      .condition('mfd.langcode', langcode)
      .execute<Record<string, unknown>>();

    // Fallback to default language
    if (rows.length === 0) {
      rows = await db
        .select('media_field_data', 'mfd')
        .fields('mfd', ['mid', 'vid', 'bundle', 'langcode', 'name', 'uid', 'status', 'created', 'changed', 'default_langcode', 'revision_translation_affected'])
        .condition('mfd.mid', id)
        .condition('mfd.default_langcode', 1)
        .execute<Record<string, unknown>>();
    }

    if (rows.length === 0) return null;

    const row = rows[0];
    const actualLangcode = row.langcode as string;

    const mediaRows = await db
      .select('media')
      .fields(['uuid'])
      .condition('mid', id)
      .execute<{ uuid: string }>();

    const uuid = mediaRows.length > 0 ? mediaRows[0].uuid : undefined;
    const bundle = row.bundle as string;
    const definition = getEntityTypeDefinition('media', bundle);
    if (!definition) return null;

    const data: EntityData = {
      nid: row.mid as number,
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: actualLangcode,
      title: row.name as string | undefined,
      uid: row.uid as number,
      status: row.status as number,
      created: row.created as number,
      changed: row.changed as number,
      default_langcode: row.default_langcode as number,
      revision_translation_affected: row.revision_translation_affected as number,
    };

    // Load field values for this langcode
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || fieldName in MEDIA_BASE_FIELDS || ['title', 'status', 'uid', 'name'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldValuesWithLangcode(
        'media',
        data.nid as number,
        fieldName,
        fieldDef.type,
        actualLangcode,
        fieldDef.settings
      );

      // Fall back to default language field values if none for this langcode
      const finalValues = values.length > 0
        ? values
        : await fieldStorage.loadFieldValues(
            'media',
            data.nid as number,
            fieldName,
            fieldDef.type,
            fieldDef.settings
          );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (finalValues[0] ?? null) : finalValues;
    }

    return new Entity('media', bundle, data, definition, false);
  }

  /**
   * Delete an entity by ID.
   */
  static async delete(entityType: string, id: number): Promise<void> {
    const entity = await Entity.load(entityType, id);
    if (!entity) return;

    // Fire delete event before deleting
    await EventBus.emit('entity:delete', entity);

    // Delete field values
    for (const fieldName of Object.keys(entity._definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      await fieldStorage.deleteFieldValues(entityType, id, fieldName);
    }

    if (entityType === 'node') {
      await db.delete('node_field_revision').condition('nid', id).execute();
      await db.delete('node_field_data').condition('nid', id).execute();
      await db.delete('node_revision').condition('nid', id).execute();
      await db.delete('node').condition('nid', id).execute();
    } else if (entityType === 'taxonomy_term') {
      await db.delete('taxonomy_term__parent').condition('entity_id', id).execute();
      await db.delete('taxonomy_term_field_data').condition('tid', id).execute();
      await db.delete('taxonomy_term_data').condition('tid', id).execute();
    } else if (entityType === 'media') {
      await db.delete('media_field_revision').condition('mid', id).execute();
      await db.delete('media_field_data').condition('mid', id).execute();
      await db.delete('media_revision').condition('mid', id).execute();
      await db.delete('media').condition('mid', id).execute();
    } else {
      // Generic fallback
      await db.delete(entityType).condition('nid', id).execute();
    }

    // Invalidate entity cache after delete
    cacheInvalidateTags(entityCacheTags(entityType, id, entity.bundle));
  }

  /**
   * Save (update) an existing entity.
   */
  async save(): Promise<void> {
    if (this._isNew || !this._data.nid) {
      throw new Error('Cannot save a new entity. Use Entity.create() instead.');
    }

    const now = Math.floor(Date.now() / 1000);
    this._data.changed = now;

    // Validate field values
    Entity.validateFields(this._definition, this._data);

    // Fire presave event
    await EventBus.emit('entity:presave', this);

    if (this._entityType === 'node') {
      const statusInt = typeof this._data.status === 'boolean' ? (this._data.status ? 1 : 0) : (this._data.status ?? 1);
      const nid = this._data.nid as number;

      // 1. Insert a new revision row in node_revision
      const [newVid] = await db.insert('node_revision').values({
        nid,
        langcode: 'en',
        revision_uid: this._data.uid ?? 0,
        revision_timestamp: now,
      }).execute();

      this._data.vid = newVid;

      // 2. Update node table to point to the new revision
      await db.update('node').set({ vid: newVid }).condition('nid', nid).execute();

      // 3. Update node_field_data with new vid and field values
      await db
        .update('node_field_data')
        .set({
          vid: newVid,
          title: this._data.title,
          status: statusInt,
          uid: this._data.uid,
          changed: now,
          promote: this._data.promote ?? 1,
          sticky: this._data.sticky ?? 0,
        })
        .condition('nid', nid)
        .condition('langcode', 'en')
        .execute();

      // 4. Insert a new row in node_field_revision for this revision
      await db.insert('node_field_revision').values({
        nid,
        vid: newVid,
        type: this._bundle,
        langcode: 'en',
        title: this._data.title ?? null,
        uid: this._data.uid ?? 0,
        status: statusInt,
        created: this._data.created ?? now,
        changed: now,
        promote: this._data.promote ?? 1,
        sticky: this._data.sticky ?? 0,
        default_langcode: 1,
        revision_translation_affected: 1,
      }).execute();
    } else if (this._entityType === 'taxonomy_term') {
      const statusInt = typeof this._data.status === 'boolean' ? (this._data.status ? 1 : 0) : (this._data.status ?? 1);
      const weightVal = typeof this._data.weight === 'number' ? this._data.weight : 0;

      await db
        .update('taxonomy_term_field_data')
        .set({
          name: this._data.title,
          changed: now,
          status: statusInt,
          weight: weightVal,
        })
        .condition('tid', this._data.nid)
        .condition('langcode', 'en')
        .execute();

      // Update parent in taxonomy_term__parent
      if (this._data.parent !== undefined) {
        const parentId = typeof this._data.parent === 'number' ? this._data.parent : 0;
        await db
          .update('taxonomy_term__parent')
          .set({ parent_target_id: parentId })
          .condition('entity_id', this._data.nid)
          .execute();
      }
    } else if (this._entityType === 'media') {
      const statusInt = typeof this._data.status === 'boolean' ? (this._data.status ? 1 : 0) : (this._data.status ?? 1);
      const mid = this._data.nid as number; // nid maps to mid

      // 1. Insert a new revision row in media_revision
      const [newVid] = await db.insert('media_revision').values({
        mid,
        langcode: 'en',
        revision_uid: this._data.uid ?? 0,
        revision_timestamp: now,
      }).execute();

      this._data.vid = newVid;

      // 2. Update media table to point to the new revision
      await db.update('media').set({ vid: newVid }).condition('mid', mid).execute();

      // 3. Update media_field_data with new vid and field values
      await db
        .update('media_field_data')
        .set({
          vid: newVid,
          name: this._data.title,
          status: statusInt,
          uid: this._data.uid,
          changed: now,
        })
        .condition('mid', mid)
        .condition('langcode', 'en')
        .execute();

      // 4. Insert a new row in media_field_revision for this revision
      await db.insert('media_field_revision').values({
        mid,
        vid: newVid,
        bundle: this._bundle,
        langcode: 'en',
        name: this._data.title ?? null,
        uid: this._data.uid ?? 0,
        status: statusInt,
        created: this._data.created ?? now,
        changed: now,
        default_langcode: 1,
        revision_translation_affected: 1,
      }).execute();
    } else {
      // Generic fallback
      await db
        .update(this._entityType)
        .set({
          title: this._data.title,
          status: typeof this._data.status === 'boolean' ? (this._data.status ? 1 : 0) : (this._data.status ?? 1),
          uid: this._data.uid,
          changed: now,
        })
        .condition('nid', this._data.nid)
        .execute();
    }

    // Save field values
    await Entity.saveFields(this);

    // Invalidate entity cache after update
    cacheInvalidateTags(entityCacheTags(this._entityType, this._data.nid as number, this._bundle));

    // Fire update event
    await EventBus.emit('entity:update', this);
  }

  /**
   * List all revisions for a node entity.
   */
  static async listRevisions(
    entityType: string,
    nid: number
  ): Promise<Array<{ vid: number; revision_uid: number; revision_timestamp: number }>> {
    if (entityType === 'node') {
      const rows = await db
        .select('node_revision')
        .fields(['vid', 'revision_uid', 'revision_timestamp'])
        .condition('nid', nid)
        .orderBy('vid', 'DESC')
        .execute<{ vid: number; revision_uid: number; revision_timestamp: number }>();
      return rows;
    }

    if (entityType === 'media') {
      const rows = await db
        .select('media_revision')
        .fields(['vid', 'revision_uid', 'revision_timestamp'])
        .condition('mid', nid)
        .orderBy('vid', 'DESC')
        .execute<{ vid: number; revision_uid: number; revision_timestamp: number }>();
      return rows;
    }

    return [];
  }

  /**
   * Load a specific revision of a node entity.
   */
  static async loadRevision(
    entityType: string,
    nid: number,
    vid: number
  ): Promise<Entity | null> {
    if (entityType === 'node') {
      return Entity._loadNodeRevision(nid, vid);
    }
    if (entityType === 'media') {
      return Entity._loadMediaRevision(nid, vid);
    }
    return null;
  }

  private static async _loadNodeRevision(nid: number, vid: number): Promise<Entity | null> {
    // Read from node_field_revision for this specific vid
    const rows = await db
      .select('node_field_revision', 'nfr')
      .fields('nfr', ['nid', 'vid', 'type', 'langcode', 'title', 'uid', 'status', 'created', 'changed', 'promote', 'sticky'])
      .condition('nfr.nid', nid)
      .condition('nfr.vid', vid)
      .condition('nfr.langcode', 'en')
      .execute<Record<string, unknown>>();

    if (rows.length === 0) return null;

    const row = rows[0];

    // Get uuid from node table
    const nodeRows = await db
      .select('node')
      .fields(['uuid'])
      .condition('nid', nid)
      .execute<{ uuid: string }>();

    const uuid = nodeRows.length > 0 ? nodeRows[0].uuid : undefined;

    const bundle = row.type as string;
    const definition = getEntityTypeDefinition('node', bundle);
    if (!definition) return null;

    const data: EntityData = {
      nid: row.nid as number,
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: row.langcode as string,
      title: row.title as string | undefined,
      uid: row.uid as number,
      status: row.status as number,
      created: row.created as number,
      changed: row.changed as number,
      promote: row.promote as number,
      sticky: row.sticky as number,
    };

    // Load field values from revision tables
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || ['title', 'status', 'uid'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldRevisionValues(
        'node',
        nid,
        vid,
        fieldName,
        fieldDef.type,
        fieldDef.settings
      );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (values[0] ?? null) : values;
    }

    const entity = new Entity('node', bundle, data, definition, false);
    return entity;
  }

  private static async _loadMediaRevision(mid: number, vid: number): Promise<Entity | null> {
    // Read from media_field_revision for this specific vid
    const rows = await db
      .select('media_field_revision', 'mfr')
      .fields('mfr', ['mid', 'vid', 'bundle', 'langcode', 'name', 'uid', 'status', 'created', 'changed'])
      .condition('mfr.mid', mid)
      .condition('mfr.vid', vid)
      .condition('mfr.langcode', 'en')
      .execute<Record<string, unknown>>();

    if (rows.length === 0) return null;

    const row = rows[0];

    // Get uuid from media table
    const mediaRows = await db
      .select('media')
      .fields(['uuid'])
      .condition('mid', mid)
      .execute<{ uuid: string }>();

    const uuid = mediaRows.length > 0 ? mediaRows[0].uuid : undefined;

    const bundle = row.bundle as string;
    const definition = getEntityTypeDefinition('media', bundle);
    if (!definition) return null;

    const data: EntityData = {
      nid: row.mid as number, // Map mid to nid for consistent API
      vid: row.vid as number,
      uuid,
      type: bundle,
      langcode: row.langcode as string,
      title: row.name as string | undefined, // Map name to title for API consistency
      uid: row.uid as number,
      status: row.status as number,
      created: row.created as number,
      changed: row.changed as number,
    };

    // Load field values from revision tables
    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || fieldName in MEDIA_BASE_FIELDS || ['title', 'status', 'uid', 'name'].includes(fieldName)) continue;

      const values = await fieldStorage.loadFieldRevisionValues(
        'media',
        mid,
        vid,
        fieldName,
        fieldDef.type,
        fieldDef.settings
      );

      const cardinality = fieldDef.cardinality ?? 1;
      data[fieldName] = cardinality === 1 ? (values[0] ?? null) : values;
    }

    const entity = new Entity('media', bundle, data, definition, false);
    return entity;
  }

  /**
   * Revert a node to a previous revision by creating a new revision with the old data.
   */
  static async revertToRevision(
    entityType: string,
    nid: number,
    vid: number
  ): Promise<Entity> {
    if (entityType !== 'node' && entityType !== 'media') {
      throw new Error('Revisions are only supported for node and media entities');
    }

    // Load the old revision
    const oldRevision = await Entity.loadRevision(entityType, nid, vid);
    if (!oldRevision) {
      throw new Error(`Revision ${vid} not found for entity ${nid}`);
    }

    // Load the current entity to update it
    const current = await Entity.load(entityType, nid);
    if (!current) {
      throw new Error(`Entity ${nid} not found`);
    }

    // Copy data from old revision to current entity
    current._data.title = oldRevision._data.title;
    current._data.status = oldRevision._data.status;
    if (entityType === 'node') {
      current._data.promote = oldRevision._data.promote;
      current._data.sticky = oldRevision._data.sticky;
    }

    // Copy field values from old revision
    const baseFields = entityType === 'media' ? { ...NODE_BASE_FIELDS, ...MEDIA_BASE_FIELDS } : NODE_BASE_FIELDS;
    const skipFields = entityType === 'media' ? ['title', 'status', 'uid', 'name'] : ['title', 'status', 'uid'];
    for (const fieldName of Object.keys(current._definition.fields)) {
      if (fieldName in baseFields || skipFields.includes(fieldName)) continue;
      current._data[fieldName] = oldRevision._data[fieldName];
    }

    // Save creates a new revision
    await current.save();

    return current;
  }

  /**
   * Query entities.
   */
  static query(entityType: string): EntityQuery {
    return new EntityQuery(entityType);
  }

  // ─── Private helpers ───────────────────────────────────────

  private static async saveFields(entity: Entity): Promise<void> {
    const nid = entity._data.nid as number;
    const vid = entity._data.vid ?? nid;
    const definition = entity._definition;

    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldName in NODE_BASE_FIELDS || fieldName in MEDIA_BASE_FIELDS || ['title', 'status', 'uid', 'name'].includes(fieldName)) continue;

      let value = entity._data[fieldName];
      if (value === undefined) continue;

      // Normalize to array
      const values = Array.isArray(value) ? value : (value !== null ? [value] : []);

      await fieldStorage.saveFieldValues(
        entity._entityType,
        nid,
        entity._bundle,
        fieldName,
        fieldDef.type,
        values,
        fieldDef.settings,
        vid
      );
    }
  }
}

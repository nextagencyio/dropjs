import { db, schema as dbSchema } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword } from './password.js';
import {
  USER_TABLE,
  USER_FIELD_DATA_TABLE,
  USER_ROLES_TABLE,
  SESSION_TABLE,
  PASSWORD_RESET_TABLE,
} from './schemas.js';

export interface UserData {
  uid?: number;
  uuid?: string;
  name: string;
  email: string;
  status?: boolean;
  created?: string;
  changed?: string;
  roles?: string[];
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  status?: boolean;
  roles?: string[];
}

export async function ensureAuthTables(): Promise<void> {
  await dbSchema.createTable('users', USER_TABLE);
  await dbSchema.createTable('users_field_data', USER_FIELD_DATA_TABLE);
  await dbSchema.createTable('user__roles', USER_ROLES_TABLE);
  await dbSchema.createTable('sessions', SESSION_TABLE);
  await dbSchema.createTable('password_resets', PASSWORD_RESET_TABLE);
}

export async function createUser(input: UserCreateInput): Promise<UserData> {
  const now = Math.floor(Date.now() / 1000);
  const passwordHash = await hashPassword(input.password);
  const uuid = uuidv4();

  // Insert into users base table (Drupal format: uid, uuid, langcode)
  const [uid] = await db
    .insert('users')
    .values({
      uuid,
      langcode: 'en',
    })
    .execute();

  // Insert into users_field_data (Drupal format)
  await db
    .insert('users_field_data')
    .values({
      uid,
      langcode: 'en',
      preferred_langcode: 'en',
      preferred_admin_langcode: null,
      name: input.name,
      pass: passwordHash,
      mail: input.email,
      timezone: '',
      status: input.status !== false ? 1 : 0,
      created: now,
      changed: now,
      access: 0,
      login: 0,
      init: input.email,
      default_langcode: 1,
    })
    .execute();

  // Assign roles using Drupal field storage pattern (user__roles)
  const roles = input.roles ?? ['authenticated'];
  for (let delta = 0; delta < roles.length; delta++) {
    await db
      .insert('user__roles')
      .values({
        bundle: 'user',
        deleted: 0,
        entity_id: uid,
        revision_id: uid,
        langcode: 'en',
        delta,
        roles_target_id: roles[delta],
      })
      .execute();
  }

  return {
    uid,
    uuid,
    name: input.name,
    email: input.email,
    status: input.status !== false,
    roles,
    created: new Date(now * 1000).toISOString(),
    changed: new Date(now * 1000).toISOString(),
  };
}

async function loadUserRoles(uid: number): Promise<string[]> {
  const rows = await db
    .select('user__roles')
    .fields(['roles_target_id', 'delta'])
    .condition('entity_id', uid)
    .condition('deleted', 0)
    .orderBy('delta', 'ASC')
    .execute<{ roles_target_id: string }>();

  return rows.map((r) => r.roles_target_id);
}

function rowToUserData(
  row: Record<string, unknown>,
  roles: string[]
): UserData {
  const created = row.created as number;
  const changed = row.changed as number;
  return {
    uid: row.uid as number,
    uuid: row.uuid as string,
    name: row.name as string,
    email: row.mail as string,
    status: (row.status as number) === 1,
    created: new Date(created * 1000).toISOString(),
    changed: new Date((changed || created) * 1000).toISOString(),
    roles,
  };
}

export async function loadUser(uid: number): Promise<UserData | null> {
  const rows = await db
    .select('users', 'u')
    .join('users_field_data', 'ufd', 'u.uid = ufd.uid')
    .fields('u', ['uid', 'uuid'])
    .fields('ufd', ['name', 'mail', 'status', 'created', 'changed'])
    .condition('u.uid', uid)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const roles = await loadUserRoles(uid);
  return rowToUserData(rows[0], roles);
}

export async function loadUserByName(name: string): Promise<UserData | null> {
  const rows = await db
    .select('users', 'u')
    .join('users_field_data', 'ufd', 'u.uid = ufd.uid')
    .fields('u', ['uid', 'uuid'])
    .fields('ufd', ['name', 'mail', 'status', 'created', 'changed'])
    .condition('ufd.name', name)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const uid = rows[0].uid as number;
  const roles = await loadUserRoles(uid);
  return rowToUserData(rows[0], roles);
}

export async function loadUserByEmail(email: string): Promise<UserData | null> {
  const rows = await db
    .select('users', 'u')
    .join('users_field_data', 'ufd', 'u.uid = ufd.uid')
    .fields('u', ['uid', 'uuid'])
    .fields('ufd', ['name', 'mail', 'status', 'created', 'changed'])
    .condition('ufd.mail', email)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const uid = rows[0].uid as number;
  const roles = await loadUserRoles(uid);
  return rowToUserData(rows[0], roles);
}

export async function updateUser(
  uid: number,
  changes: Partial<UserCreateInput>
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const updates: Record<string, unknown> = {
    changed: now,
  };

  if (changes.name !== undefined) updates.name = changes.name;
  if (changes.email !== undefined) updates.mail = changes.email;
  if (changes.status !== undefined) updates.status = changes.status ? 1 : 0;
  if (changes.password !== undefined) {
    updates.pass = await hashPassword(changes.password);
  }

  await db.update('users_field_data').set(updates).condition('uid', uid).execute();

  if (changes.roles) {
    await db.delete('user__roles').condition('entity_id', uid).execute();
    for (let delta = 0; delta < changes.roles.length; delta++) {
      await db
        .insert('user__roles')
        .values({
          bundle: 'user',
          deleted: 0,
          entity_id: uid,
          revision_id: uid,
          langcode: 'en',
          delta,
          roles_target_id: changes.roles[delta],
        })
        .execute();
    }
  }
}

export async function deleteUser(uid: number): Promise<void> {
  await db.delete('sessions').condition('uid', uid).execute();
  await db.delete('user__roles').condition('entity_id', uid).execute();
  await db.delete('users_field_data').condition('uid', uid).execute();
  await db.delete('users').condition('uid', uid).execute();
}

export async function authenticateUser(
  name: string,
  password: string
): Promise<UserData | null> {
  const rows = await db
    .select('users', 'u')
    .join('users_field_data', 'ufd', 'u.uid = ufd.uid')
    .fields('u', ['uid', 'uuid'])
    .fields('ufd', ['name', 'pass', 'mail', 'status', 'created', 'changed'])
    .condition('ufd.name', name)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const row = rows[0];
  if ((row.status as number) !== 1) return null;

  const valid = await verifyPassword(
    password,
    row.pass as string
  );
  if (!valid) return null;

  // Update last login timestamp
  const now = Math.floor(Date.now() / 1000);
  await db.update('users_field_data').set({ login: now, access: now }).condition('uid', row.uid).execute();

  const roles = await loadUserRoles(row.uid as number);
  return rowToUserData(row, roles);
}

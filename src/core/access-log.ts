import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';

const ACCESS_LOG_TABLE: TableDefinition = {
  fields: {
    aid: { type: 'serial', primary: true },
    path: { type: 'varchar', length: 255, nullable: false },
    uid: { type: 'int', nullable: true, default: 0 },
    timestamp: { type: 'int', nullable: false },
  },
  indexes: {
    idx_access_log_path: ['path'],
    idx_access_log_timestamp: ['timestamp'],
  },
};

export async function ensureAccessLogTable(): Promise<void> {
  await dbSchema.createTable('access_log', ACCESS_LOG_TABLE);
}

export async function logAccess(path: string, uid: number = 0): Promise<void> {
  try {
    await db.insert('access_log').values({
      path,
      uid,
      timestamp: Math.floor(Date.now() / 1000),
    }).execute();
  } catch {
    // Silently fail
  }
}

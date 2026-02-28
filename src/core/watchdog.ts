import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';

export type WatchdogSeverity = 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';

const SEVERITY_LEVELS: Record<WatchdogSeverity, number> = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
};

const WATCHDOG_TABLE: TableDefinition = {
  fields: {
    wid: { type: 'serial', primary: true },
    uid: { type: 'int', nullable: true, default: 0 },
    type: { type: 'varchar', length: 64, nullable: false },
    message: { type: 'text', nullable: false },
    variables: { type: 'text', nullable: true },
    severity: { type: 'int', nullable: false, default: 6 },
    link: { type: 'varchar', length: 255, nullable: true, default: '' },
    location: { type: 'text', nullable: true, default: '' },
    referer: { type: 'text', nullable: true, default: '' },
    hostname: { type: 'varchar', length: 128, nullable: true, default: '' },
    timestamp: { type: 'int', nullable: false },
  },
  indexes: {
    idx_watchdog_type: ['type'],
    idx_watchdog_severity: ['severity'],
    idx_watchdog_timestamp: ['timestamp'],
    idx_watchdog_uid: ['uid'],
  },
};

export async function ensureWatchdogTable(): Promise<void> {
  await dbSchema.createTable('watchdog', WATCHDOG_TABLE);
}

export interface WatchdogEntry {
  wid: number;
  uid: number;
  type: string;
  message: string;
  variables: string | null;
  severity: number;
  link: string;
  location: string;
  referer: string;
  hostname: string;
  timestamp: number;
}

export interface WatchdogOptions {
  uid?: number;
  link?: string;
  location?: string;
  referer?: string;
  hostname?: string;
  variables?: Record<string, unknown>;
}

export async function watchdog(
  type: string,
  message: string,
  severity: WatchdogSeverity = 'notice',
  options: WatchdogOptions = {},
): Promise<void> {
  try {
    await db.insert('watchdog').values({
      type,
      message,
      severity: SEVERITY_LEVELS[severity],
      uid: options.uid ?? 0,
      link: options.link ?? '',
      location: options.location ?? '',
      referer: options.referer ?? '',
      hostname: options.hostname ?? '',
      variables: options.variables ? JSON.stringify(options.variables) : null,
      timestamp: Math.floor(Date.now() / 1000),
    }).execute();
  } catch {
    // Silently fail — watchdog should never crash the app
  }
}

export function severityLabel(level: number): WatchdogSeverity {
  for (const [label, val] of Object.entries(SEVERITY_LEVELS)) {
    if (val === level) return label as WatchdogSeverity;
  }
  return 'notice';
}

export { SEVERITY_LEVELS };

import { db } from '../db/index.js';
import { serialize, unserialize } from 'php-serialize';

/**
 * Export all configuration entries from the database.
 *
 * @returns Map of config name to config data
 */
export async function exportAllConfig(): Promise<Record<string, Record<string, unknown>>> {
  const rows = await db
    .select('config')
    .fields(['name', 'data'])
    .condition('collection', '')
    .execute<{ name: string; data: Buffer | string | null }>();

  const result: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    if (!row.data) continue;
    const str = typeof row.data === 'string' ? row.data : row.data.toString('utf-8');
    // Some config entries (e.g. user.role.*) are stored as raw JSON
    // rather than PHP-serialized data.  Try unserialize first, fall back to JSON.parse.
    try {
      result[row.name] = unserialize(str) as Record<string, unknown>;
    } catch {
      try {
        result[row.name] = JSON.parse(str) as Record<string, unknown>;
      } catch {
        // Skip unparseable config entries
      }
    }
  }
  return result;
}

/**
 * Import configuration entries into the database.
 * Overwrites any existing config with the same name.
 *
 * @param configs - Map of config name to config data
 */
export async function importConfig(configs: Record<string, Record<string, unknown>>): Promise<void> {
  for (const [name, data] of Object.entries(configs)) {
    const serialized = Buffer.from(serialize(data));

    const existing = await db
      .select('config')
      .fields(['name'])
      .condition('collection', '')
      .condition('name', name)
      .execute<{ name: string }>();

    if (existing.length > 0) {
      await db
        .update('config')
        .set({ data: serialized })
        .condition('collection', '')
        .condition('name', name)
        .execute();
    } else {
      await db.insert('config').values({
        collection: '',
        name,
        data: serialized,
      }).execute();
    }
  }
}

/**
 * Export all configuration as a YAML-like string format.
 * Uses JSON with section headers for simplicity.
 *
 * @returns String containing all config entries
 */
export async function exportConfigYaml(): Promise<string> {
  const configs = await exportAllConfig();
  const sections: string[] = [];

  for (const [name, data] of Object.entries(configs)) {
    const json = JSON.stringify(data, null, 2);
    sections.push(`--- name: ${name}\n${json}`);
  }

  return sections.join('\n\n');
}

/**
 * Import configuration from a YAML-like string format.
 * Parses the sectioned format and imports each config entry.
 *
 * @param yaml - String containing sectioned config data
 */
export async function importConfigYaml(yaml: string): Promise<void> {
  const configs: Record<string, Record<string, unknown>> = {};

  // Split by section headers (--- name: config.name)
  const sections = yaml.split(/\n--- name: /);

  for (const section of sections) {
    if (!section.trim()) continue;

    // First line is the config name, rest is JSON
    const lines = section.split('\n');
    const name = lines[0].trim().replace(/^---\s*name:\s*/, '');
    const jsonStr = lines.slice(1).join('\n').trim();

    if (!name || !jsonStr) continue;

    try {
      const data = JSON.parse(jsonStr) as Record<string, unknown>;
      configs[name] = data;
    } catch (err) {
      throw new Error(`Failed to parse config "${name}": ${err}`);
    }
  }

  await importConfig(configs);
}

/**
 * Compare two configuration sets and identify differences.
 *
 * @param current - Current configuration state
 * @param incoming - Incoming configuration to compare
 * @returns Object containing arrays of added, changed, and removed config names
 */
export function diffConfig(
  current: Record<string, Record<string, unknown>>,
  incoming: Record<string, Record<string, unknown>>
): { added: string[]; changed: string[]; removed: string[] } {
  const currentKeys = new Set(Object.keys(current));
  const incomingKeys = new Set(Object.keys(incoming));

  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  // Find added and changed
  for (const key of incomingKeys) {
    if (!currentKeys.has(key)) {
      added.push(key);
    } else {
      // Compare by JSON serialization
      const currentJson = JSON.stringify(current[key]);
      const incomingJson = JSON.stringify(incoming[key]);
      if (currentJson !== incomingJson) {
        changed.push(key);
      }
    }
  }

  // Find removed
  for (const key of currentKeys) {
    if (!incomingKeys.has(key)) {
      removed.push(key);
    }
  }

  return { added, changed, removed };
}

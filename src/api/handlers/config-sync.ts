import type { Request, Response } from '../types.js';
import { exportAllConfig, importConfig, diffConfig } from '../../core/index.js';
import { BadRequestError } from '../errors.js';

/**
 * Export all configuration from the database.
 * GET /api/config/export
 */
export async function handleExportConfig(
  _req: Request,
  res: Response
): Promise<void> {
  const data = await exportAllConfig();
  res.json({ data });
}

/**
 * Import configuration into the database.
 * POST /api/config/import
 * Body: { configs: Record<string, Record<string, unknown>> }
 */
export async function handleImportConfig(
  req: Request,
  res: Response
): Promise<void> {
  const { configs } = req.body as { configs?: Record<string, Record<string, unknown>> };

  if (!configs || typeof configs !== 'object') {
    throw new BadRequestError('configs must be an object mapping config names to data');
  }

  await importConfig(configs);

  const imported = Object.keys(configs).length;
  res.json({ data: { imported } });
}

/**
 * Compare incoming configuration with current state.
 * POST /api/config/diff
 * Body: { configs: Record<string, Record<string, unknown>> }
 */
export async function handleDiffConfig(
  req: Request,
  res: Response
): Promise<void> {
  const { configs } = req.body as { configs?: Record<string, Record<string, unknown>> };

  if (!configs || typeof configs !== 'object') {
    throw new BadRequestError('configs must be an object mapping config names to data');
  }

  const current = await exportAllConfig();
  const diff = diffConfig(current, configs);

  res.json({ data: diff });
}

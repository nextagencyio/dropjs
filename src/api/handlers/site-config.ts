import type { Request, Response } from '../types.js';
import { saveConfig, loadConfig } from '../../core/index.js';

const SITE_CONFIG_NAME = 'system.site';

const DEFAULT_SITE_CONFIG: Record<string, unknown> = {
  name: 'drop.js',
  slogan: '',
  mail: 'admin@example.com',
  front_page: '/',
};

export async function getSiteConfig(
  _req: Request,
  res: Response
): Promise<void> {
  const config = await loadConfig(SITE_CONFIG_NAME);
  res.json({ data: { ...DEFAULT_SITE_CONFIG, ...config } });
}

export async function updateSiteConfig(
  req: Request,
  res: Response
): Promise<void> {
  const existing = await loadConfig(SITE_CONFIG_NAME);
  const merged = { ...DEFAULT_SITE_CONFIG, ...existing, ...req.body };
  await saveConfig(SITE_CONFIG_NAME, merged);
  res.json({ data: merged });
}

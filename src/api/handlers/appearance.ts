import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { Request, Response } from '../types.js';
import { loadConfig, saveConfig } from '../../core/index.js';

interface ThemeYaml {
  name: string;
  description?: string;
  version?: string;
  engine?: string;
  admin?: boolean;
  regions?: Record<string, string>;
  core_version_requirement?: string;
}

interface ThemeInfo {
  name: string;
  label: string;
  description: string;
  version: string;
  status: string;
  default: boolean;
  admin: boolean;
  engine: string;
}

const CONFIG_NAME = 'system.theme';

let themesDir = path.resolve('themes');

export function setThemesDir(dir: string): void {
  themesDir = dir;
}

function discoverThemes(): ThemeInfo[] {
  if (!fs.existsSync(themesDir)) {
    return [];
  }

  const entries = fs.readdirSync(themesDir, { withFileTypes: true });
  const themes: ThemeInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const infoPath = path.join(themesDir, entry.name, 'theme.info.yml');
    if (!fs.existsSync(infoPath)) continue;

    const raw = fs.readFileSync(infoPath, 'utf-8');
    const info = yaml.load(raw) as ThemeYaml;

    if (!info || typeof info !== 'object' || !info.name) continue;

    themes.push({
      name: entry.name,
      label: info.name,
      description: info.description ?? '',
      version: info.version ?? '0.0.0',
      status: 'installed',
      default: false,
      admin: info.admin === true,
      engine: info.engine ?? 'react',
    });
  }

  return themes;
}

async function getActiveThemeName(): Promise<string | null> {
  const config = await loadConfig(CONFIG_NAME);
  if (config && typeof config.default === 'string') {
    return config.default;
  }
  return null;
}

export async function listThemes(
  _req: Request,
  res: Response
): Promise<void> {
  const themes = discoverThemes();
  const activeThemeName = await getActiveThemeName();

  // Mark the active theme, or fall back to the first non-admin theme
  let hasDefault = false;
  for (const theme of themes) {
    if (activeThemeName && theme.name === activeThemeName) {
      theme.status = 'active';
      theme.default = true;
      hasDefault = true;
    }
  }

  // If no active theme is persisted, default to first non-admin theme
  if (!hasDefault && themes.length > 0) {
    const fallback = themes.find((t) => !t.admin) ?? themes[0];
    fallback.status = 'active';
    fallback.default = true;
  }

  res.json({ data: themes });
}

export async function setActiveTheme(
  req: Request,
  res: Response
): Promise<void> {
  const { theme } = req.body as { theme?: string };
  if (!theme || typeof theme !== 'string') {
    res.status(400).json({
      error: { status: 400, message: 'theme name is required' },
    });
    return;
  }

  // Verify the theme exists on disk
  const themes = discoverThemes();
  const match = themes.find((t) => t.name === theme);
  if (!match) {
    res.status(404).json({
      error: { status: 404, message: `Theme "${theme}" not found` },
    });
    return;
  }

  await saveConfig(CONFIG_NAME, { default: theme });

  res.json({ data: { active: theme } });
}

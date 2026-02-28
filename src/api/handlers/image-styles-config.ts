import type { Request, Response } from '../types.js';
import { saveConfig, loadConfig } from '../../core/index.js';

const CONFIG_NAME = 'image.styles';

export interface ImageStyleEffect {
  type: 'resize' | 'crop' | 'scale';
  width: number;
  height: number;
}

export interface ImageStyle {
  id: string;
  label: string;
  effects: ImageStyleEffect[];
}

const DEFAULT_STYLES: ImageStyle[] = [
  {
    id: 'thumbnail',
    label: 'Thumbnail (150x150)',
    effects: [{ type: 'crop', width: 150, height: 150 }],
  },
  {
    id: 'medium',
    label: 'Medium (480x480)',
    effects: [{ type: 'scale', width: 480, height: 480 }],
  },
  {
    id: 'large',
    label: 'Large (1024x1024)',
    effects: [{ type: 'scale', width: 1024, height: 1024 }],
  },
];

async function loadStyles(): Promise<ImageStyle[]> {
  const config = await loadConfig(CONFIG_NAME);
  if (config && Array.isArray(config.styles)) {
    return config.styles as ImageStyle[];
  }
  return DEFAULT_STYLES;
}

export async function getImageStyles(
  _req: Request,
  res: Response
): Promise<void> {
  const styles = await loadStyles();
  res.json({ data: styles });
}

export async function createImageStyle(
  req: Request,
  res: Response
): Promise<void> {
  const { id, label, effects } = req.body;

  if (!id || !label) {
    res.status(400).json({ error: { status: 400, message: 'id and label are required' } });
    return;
  }

  const styles = await loadStyles();
  if (styles.some((s) => s.id === id)) {
    res.status(409).json({ error: { status: 409, message: `Image style "${id}" already exists` } });
    return;
  }

  const newStyle: ImageStyle = {
    id,
    label,
    effects: Array.isArray(effects) ? effects : [],
  };

  styles.push(newStyle);
  await saveConfig(CONFIG_NAME, { styles });
  res.status(201).json({ data: newStyle });
}

export async function updateImageStyle(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { label, effects } = req.body;

  const styles = await loadStyles();
  const idx = styles.findIndex((s) => s.id === id);
  if (idx === -1) {
    res.status(404).json({ error: { status: 404, message: `Image style "${id}" not found` } });
    return;
  }

  if (label !== undefined) styles[idx].label = label;
  if (effects !== undefined) styles[idx].effects = effects;

  await saveConfig(CONFIG_NAME, { styles });
  res.json({ data: styles[idx] });
}

export async function deleteImageStyle(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const styles = await loadStyles();
  const filtered = styles.filter((s) => s.id !== id);

  if (filtered.length === styles.length) {
    res.status(404).json({ error: { status: 404, message: `Image style "${id}" not found` } });
    return;
  }

  await saveConfig(CONFIG_NAME, { styles: filtered });
  res.status(204).send();
}

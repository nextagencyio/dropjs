import type { Request, Response } from '../types.js';
import { saveConfig, loadConfig } from '../../core/index.js';

const CONFIG_NAME = 'filter.formats';

export interface TextFormat {
  id: string;
  label: string;
  weight: number;
  allowed_tags: string;
}

const DEFAULT_FORMATS: TextFormat[] = [
  {
    id: 'plain_text',
    label: 'Plain text',
    weight: 0,
    allowed_tags: '',
  },
  {
    id: 'basic_html',
    label: 'Basic HTML',
    weight: 1,
    allowed_tags: '<a> <em> <strong> <p> <br> <ul> <ol> <li> <blockquote> <h2> <h3> <h4> <h5> <h6>',
  },
  {
    id: 'full_html',
    label: 'Full HTML',
    weight: 2,
    allowed_tags: '<a> <abbr> <address> <article> <aside> <b> <blockquote> <br> <caption> <cite> <code> <col> <colgroup> <dd> <del> <details> <dfn> <div> <dl> <dt> <em> <figcaption> <figure> <footer> <h1> <h2> <h3> <h4> <h5> <h6> <header> <hr> <i> <img> <ins> <kbd> <li> <mark> <nav> <ol> <p> <pre> <q> <s> <samp> <section> <small> <span> <strong> <sub> <summary> <sup> <table> <tbody> <td> <tfoot> <th> <thead> <time> <tr> <u> <ul> <var>',
  },
];

async function loadFormats(): Promise<TextFormat[]> {
  const config = await loadConfig(CONFIG_NAME);
  if (config && Array.isArray(config.formats)) {
    return config.formats as TextFormat[];
  }
  return DEFAULT_FORMATS;
}

export async function getTextFormats(
  _req: Request,
  res: Response
): Promise<void> {
  const formats = await loadFormats();
  res.json({ data: formats });
}

export async function updateTextFormat(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { label, allowed_tags } = req.body;

  const formats = await loadFormats();
  const idx = formats.findIndex((f) => f.id === id);
  if (idx === -1) {
    res.status(404).json({ error: { status: 404, message: `Text format "${id}" not found` } });
    return;
  }

  if (label !== undefined) formats[idx].label = label;
  if (allowed_tags !== undefined) formats[idx].allowed_tags = allowed_tags;

  await saveConfig(CONFIG_NAME, { formats });
  res.json({ data: formats[idx] });
}

export async function createTextFormat(
  req: Request,
  res: Response
): Promise<void> {
  const { id, label, allowed_tags } = req.body;

  if (!id || !label) {
    res.status(400).json({ error: { status: 400, message: 'id and label are required' } });
    return;
  }

  const formats = await loadFormats();
  if (formats.some((f) => f.id === id)) {
    res.status(409).json({ error: { status: 409, message: `Text format "${id}" already exists` } });
    return;
  }

  const newFormat: TextFormat = {
    id,
    label,
    weight: formats.length,
    allowed_tags: allowed_tags ?? '',
  };

  formats.push(newFormat);
  await saveConfig(CONFIG_NAME, { formats });
  res.status(201).json({ data: newFormat });
}

export async function deleteTextFormat(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const formats = await loadFormats();
  const filtered = formats.filter((f) => f.id !== id);

  if (filtered.length === formats.length) {
    res.status(404).json({ error: { status: 404, message: `Text format "${id}" not found` } });
    return;
  }

  await saveConfig(CONFIG_NAME, { formats: filtered });
  res.status(204).send();
}

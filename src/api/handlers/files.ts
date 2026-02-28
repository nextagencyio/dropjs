import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type { Request, Response } from '../types.js';
import { db, schema } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../errors.js';

const FILE_MANAGED_TABLE = 'file_managed';

export const FILE_MANAGED_SCHEMA = {
  fields: {
    fid: { type: 'serial' as const, primary: true },
    uuid: { type: 'varchar' as const, length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar' as const, length: 12, nullable: false, default: 'en' },
    uid: { type: 'int' as const, unsigned: true, nullable: true, default: 0 },
    filename: { type: 'varchar' as const, length: 255, nullable: false },
    uri: { type: 'varchar' as const, length: 255, nullable: false },
    filemime: { type: 'varchar' as const, length: 255, nullable: false },
    filesize: { type: 'int' as const, unsigned: true, nullable: false },
    status: { type: 'int' as const, unsigned: true, nullable: false, default: 1 },
    created: { type: 'int' as const, unsigned: true, nullable: true },
    changed: { type: 'int' as const, unsigned: true, nullable: true },
  },
  indexes: {
    file_managed__status: ['status'],
    file_managed__filemime: ['filemime'],
    file_managed__uid: ['uid'],
  },
};

export const FILE_USAGE_SCHEMA = {
  fields: {
    fid: { type: 'int' as const, unsigned: true, nullable: false },
    module: { type: 'varchar' as const, length: 255, nullable: false, default: '' },
    type: { type: 'varchar' as const, length: 64, nullable: false, default: '' },
    id: { type: 'varchar' as const, length: 64, nullable: false, default: '0' },
    count: { type: 'int' as const, unsigned: true, nullable: false, default: 0 },
  },
  primaryKey: ['fid', 'type', 'id', 'module'] as string[],
};

let uploadsDir = path.resolve('data/files');

export function setUploadsDir(dir: string): void {
  uploadsDir = path.resolve(dir);
}

export function getUploadsDir(): string {
  return uploadsDir;
}

export async function ensureFileTable(): Promise<void> {
  await schema.createTable(FILE_MANAGED_TABLE, FILE_MANAGED_SCHEMA);
  await schema.createTable('file_usage', FILE_USAGE_SCHEMA);
}

export async function handleFileUpload(req: Request, res: Response): Promise<void> {
  const file = (req as any).file;
  if (!file) {
    throw new ValidationError('No file uploaded. Send a file in the "file" field.');
  }

  const now = Math.floor(Date.now() / 1000);
  const uuid = crypto.randomUUID();

  const relativePath = path.relative(uploadsDir, file.path);

  const [insertId] = await db.insert(FILE_MANAGED_TABLE).values({
    uuid,
    filename: file.originalname,
    uri: `public://${relativePath}`,
    filemime: file.mimetype,
    filesize: file.size,
    status: 1,
    created: now,
    changed: now,
  }).execute();

  const fid = insertId;

  res.status(201).json({
    data: {
      fid,
      uuid,
      filename: file.originalname,
      filemime: file.mimetype,
      filesize: file.size,
      uri: `public://${relativePath}`,
      url: `/api/files/${fid}/download`,
      created: now,
    },
  });
}

export async function handleFileGet(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const rows = await db.select(FILE_MANAGED_TABLE)
    .condition('fid', parseInt(id, 10))
    .execute<Record<string, unknown>>();

  if (rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = rows[0];
  res.json({
    data: {
      ...file,
      url: `/api/files/${file.fid}/download`,
      thumbnail_url: isImage(file.filemime as string)
        ? `/api/files/${file.fid}/style/thumbnail`
        : null,
    },
  });
}

export async function handleFileDownload(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const rows = await db.select(FILE_MANAGED_TABLE)
    .condition('fid', parseInt(id, 10))
    .execute<Record<string, unknown>>();

  if (rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = rows[0];
  const filePath = uriToPath(file.uri as string);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('File not found on disk');
  }

  res.sendFile!(filePath);
}

export async function handleFileStyleDownload(req: Request, res: Response): Promise<void> {
  const { id, style } = req.params;
  const validStyles = ['thumbnail', 'medium', 'large'];

  if (!validStyles.includes(style)) {
    throw new NotFoundError(`Unknown image style: ${style}`);
  }

  const rows = await db.select(FILE_MANAGED_TABLE)
    .condition('fid', parseInt(id, 10))
    .execute<Record<string, unknown>>();

  if (rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = rows[0];

  if (!isImage(file.filemime as string)) {
    throw new ValidationError('File is not an image');
  }

  const originalPath = uriToPath(file.uri as string);
  const stylePath = getStylePath(originalPath, style);

  if (!fs.existsSync(stylePath)) {
    // Try to generate on demand
    const { generateImageStyle } = await import('./image-styles.js');
    await generateImageStyle(originalPath, style);
  }

  if (!fs.existsSync(stylePath)) {
    throw new NotFoundError('Image style derivative not found');
  }

  res.sendFile!(stylePath);
}

export async function handleFileDelete(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const rows = await db.select(FILE_MANAGED_TABLE)
    .condition('fid', parseInt(id, 10))
    .execute<Record<string, unknown>>();

  if (rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = rows[0];
  const filePath = uriToPath(file.uri as string);

  // Delete physical file
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete style derivatives
  const stylesBaseDir = path.join(uploadsDir, 'styles');
  for (const style of ['thumbnail', 'medium', 'large']) {
    const stylePath = getStylePath(filePath, style);
    if (fs.existsSync(stylePath)) {
      fs.unlinkSync(stylePath);
    }
  }

  // Delete DB record
  await db.delete(FILE_MANAGED_TABLE)
    .condition('fid', parseInt(id, 10))
    .execute();

  res.status(204).send();
}

// Media library handlers
export async function handleMediaList(req: Request, res: Response): Promise<void> {
  // Count total matching rows first (for pagination)
  const countQuery = db.select(FILE_MANAGED_TABLE);
  countQuery.condition('status', 1);

  const query = db.select(FILE_MANAGED_TABLE);
  query.condition('status', 1);

  // Filter by mimetype
  const mimeFilter = req.query.mimetype as string | undefined;
  if (mimeFilter) {
    query.condition('filemime', `${mimeFilter}%`, 'LIKE');
    countQuery.condition('filemime', `${mimeFilter}%`, 'LIKE');
  }

  // Search by filename
  const search = req.query.search as string | undefined;
  if (search) {
    query.condition('filename', `%${search}%`, 'LIKE');
    countQuery.condition('filename', `%${search}%`, 'LIKE');
  }

  // Date range filters
  const dateFrom = req.query.from as string | undefined;
  if (dateFrom) {
    const ts = Math.floor(new Date(dateFrom).getTime() / 1000);
    query.condition('created', ts, '>=');
    countQuery.condition('created', ts, '>=');
  }
  const dateTo = req.query.to as string | undefined;
  if (dateTo) {
    const ts = Math.floor(new Date(dateTo).getTime() / 1000);
    query.condition('created', ts, '<=');
    countQuery.condition('created', ts, '<=');
  }

  // Get total count
  const allRows = await countQuery.execute<Record<string, unknown>>();
  const total = allRows.length;

  // Pagination
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 24));
  const offset = (page - 1) * limit;

  query.orderBy('created', 'DESC');
  query.range(offset, limit);

  const rows = await query.execute<Record<string, unknown>>();

  const data = rows.map((file) => ({
    ...file,
    url: `/api/files/${file.fid}/download`,
    thumbnail_url: isImage(file.filemime as string)
      ? `/api/files/${file.fid}/style/thumbnail`
      : null,
  }));

  res.json({
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function handleMediaUpload(req: Request, res: Response): Promise<void> {
  await handleFileUpload(req, res);
}

export async function handleMediaDelete(req: Request, res: Response): Promise<void> {
  // Delegate to the file delete handler, mapping :id param
  req.params.id = req.params.id;
  await handleFileDelete(req, res);
}

export async function handleMediaImages(req: Request, res: Response): Promise<void> {
  const query = db.select(FILE_MANAGED_TABLE);
  query.condition('status', 1);
  query.condition('filemime', 'image/%', 'LIKE');
  query.orderBy('created', 'DESC');

  const rows = await query.execute<Record<string, unknown>>();

  const data = rows.map((file) => ({
    ...file,
    url: `/api/files/${file.fid}/download`,
    thumbnail_url: `/api/files/${file.fid}/style/thumbnail`,
    medium_url: `/api/files/${file.fid}/style/medium`,
    large_url: `/api/files/${file.fid}/style/large`,
  }));

  res.json({ data, meta: { total: data.length } });
}

// Utilities
function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

function uriToPath(uri: string): string {
  // Convert public://path/to/file to absolute path
  const relativePath = uri.replace('public://', '');
  return path.resolve(uploadsDir, relativePath);
}

function getStylePath(originalPath: string, style: string): string {
  const relative = path.relative(uploadsDir, originalPath);
  return path.resolve(uploadsDir, 'styles', style, relative);
}

'use server';

import { revalidatePath } from 'next/cache';
import { ensureInitialized } from '../../../api/init';
import { getSessionUser } from '../../../lib/server/auth';
import { userHasPermission } from '../../../auth/access';

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

async function requirePerm(permission: string) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: 'Authentication required' };
  const allowed = await userHasPermission(user, permission);
  if (!allowed) return { success: false as const, error: 'Access denied' };
  return { success: true as const, user };
}

export async function deleteFile(fid: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer files');
  if (!auth.success) return auth;

  try {
    const { getConnection } = await import('../../../db/index');
    const conn = getConnection();
    await conn('file_managed').where('fid', fid).del();
    revalidatePath('/media');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * File upload via Server Action (accepts FormData).
 * Note: For the admin UI, this replaces the client-side fetch to /api/media/upload.
 */
export async function uploadFile(formData: FormData): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('upload files');
  if (!auth.success) return auth;

  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file provided' };

    const { randomUUID } = await import('node:crypto');
    const path = await import('node:path');
    const fs = await import('node:fs');
    const { getUploadsDir } = await import('../../../api/handlers/files');
    const { db } = await import('../../../db/index');

    const uploadsDir = getUploadsDir();
    fs.mkdirSync(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const now = Math.floor(Date.now() / 1000);
    const uuid = randomUUID();
    const relativePath = path.relative(uploadsDir, filePath);

    const [fid] = await db.insert('file_managed').values({
      uuid,
      filename: file.name,
      uri: `public://${relativePath}`,
      filemime: file.type,
      filesize: file.size,
      uid: auth.user.uid,
      status: 1,
      created: now,
      changed: now,
    }).execute();

    revalidatePath('/media');
    return { success: true, data: { fid, uuid, filename: file.name, uri: `public://${relativePath}` } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

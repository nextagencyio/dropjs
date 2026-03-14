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

export async function loadContactFormsAction(): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { listContactForms } = await import('../../../core/contact');
    const forms = await listContactForms();
    return { success: true, data: forms };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createContactFormAction(data: {
  machine_name: string;
  label: string;
  description?: string;
  recipients?: string[];
  auto_reply?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { loadContactForm, createContactForm } = await import('../../../core/contact');
    const existing = await loadContactForm(data.machine_name);
    if (existing) return { success: false, error: `Form "${data.machine_name}" already exists` };
    const form = await createContactForm(data);
    revalidatePath('/config/contact');
    return { success: true, data: form };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateContactFormAction(machineName: string, data: {
  label?: string;
  description?: string;
  recipients?: string[];
  auto_reply?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { loadContactForm, updateContactForm } = await import('../../../core/contact');
    const existing = await loadContactForm(machineName);
    if (!existing) return { success: false, error: `Form "${machineName}" not found` };
    await updateContactForm(machineName, data);
    revalidatePath('/config/contact');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteContactFormAction(machineName: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { loadContactForm, deleteContactForm } = await import('../../../core/contact');
    const existing = await loadContactForm(machineName);
    if (!existing) return { success: false, error: `Form "${machineName}" not found` };
    await deleteContactForm(machineName);
    revalidatePath('/config/contact');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadContactMessagesAction(formId?: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { listContactMessages } = await import('../../../core/contact');
    const messages = await listContactMessages(formId);
    return { success: true, data: messages };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateContactMessageStatusAction(id: number, status: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { loadContactMessage, updateMessageStatus } = await import('../../../core/contact');
    const msg = await loadContactMessage(id);
    if (!msg) return { success: false, error: `Message #${id} not found` };
    await updateMessageStatus(id, status);
    revalidatePath('/config/contact');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteContactMessageAction(id: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer contact forms');
  if (!auth.success) return auth;

  try {
    const { loadContactMessage, deleteContactMessage } = await import('../../../core/contact');
    const msg = await loadContactMessage(id);
    if (!msg) return { success: false, error: `Message #${id} not found` };
    await deleteContactMessage(id);
    revalidatePath('/config/contact');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { EventBus } from './event-bus.js';

// ─── Table Constants ──────────────────────────────────────────

const CONTACT_FORMS_TABLE = 'contact_forms';
const CONTACT_MESSAGES_TABLE = 'contact_messages';

// ─── Table Definitions ────────────────────────────────────────

const CONTACT_FORMS_TABLE_DEFINITION: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    machine_name: { type: 'varchar', length: 128, nullable: false, unique: true },
    label: { type: 'varchar', length: 255, nullable: false },
    description: { type: 'text', nullable: true },
    recipients: { type: 'text', nullable: false }, // JSON array of email addresses
    message: { type: 'text', nullable: true }, // Auto-reply message
    weight: { type: 'int', nullable: false, default: 0 },
    status: { type: 'int', nullable: false, default: 1 },
  },
  indexes: {
    idx_contact_forms_weight: ['weight'],
    idx_contact_forms_status: ['status'],
  },
};

const CONTACT_MESSAGES_TABLE_DEFINITION: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    form_id: { type: 'varchar', length: 128, nullable: false },
    name: { type: 'varchar', length: 255, nullable: false },
    email: { type: 'varchar', length: 255, nullable: false },
    subject: { type: 'varchar', length: 255, nullable: false },
    message: { type: 'text', nullable: false },
    uid: { type: 'int', nullable: true },
    created: { type: 'int', nullable: false },
    status: { type: 'varchar', length: 32, nullable: false, default: 'new' },
  },
  indexes: {
    idx_contact_messages_form: ['form_id'],
    idx_contact_messages_status: ['status'],
    idx_contact_messages_created: ['created'],
  },
};

// ─── Types ────────────────────────────────────────────────────

export interface ContactForm {
  id: number;
  machine_name: string;
  label: string;
  description?: string;
  recipients: string[];
  message?: string;
  weight: number;
  status: boolean;
}

export interface ContactMessage {
  id: number;
  form_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  uid?: number;
  created: number;
  status: 'new' | 'read' | 'replied';
}

// ─── Row Types (DB representation) ───────────────────────────

interface ContactFormRow {
  id: number;
  machine_name: string;
  label: string;
  description: string | null;
  recipients: string;
  message: string | null;
  weight: number;
  status: number;
}

interface ContactMessageRow {
  id: number;
  form_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  uid: number | null;
  created: number;
  status: string;
}

// ─── Row Converters ──────────────────────────────────────────

function rowToContactForm(row: ContactFormRow): ContactForm {
  let recipients: string[];
  try {
    recipients = JSON.parse(row.recipients);
  } catch {
    recipients = [];
  }
  return {
    id: row.id,
    machine_name: row.machine_name,
    label: row.label,
    description: row.description ?? undefined,
    recipients,
    message: row.message ?? undefined,
    weight: row.weight,
    status: Boolean(row.status),
  };
}

function rowToContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    form_id: row.form_id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    uid: row.uid ?? undefined,
    created: row.created,
    status: row.status as 'new' | 'read' | 'replied',
  };
}

// ─── Schema Setup ─────────────────────────────────────────────

/**
 * Ensure both contact tables exist in the database and seed default form.
 */
export async function ensureContactTables(): Promise<void> {
  await dbSchema.createTable(CONTACT_FORMS_TABLE, CONTACT_FORMS_TABLE_DEFINITION);
  await dbSchema.createTable(CONTACT_MESSAGES_TABLE, CONTACT_MESSAGES_TABLE_DEFINITION);

  // Seed default 'website_feedback' form if it doesn't exist
  const existing = await loadContactForm('website_feedback');
  if (!existing) {
    await createContactForm({
      machine_name: 'website_feedback',
      label: 'Website feedback',
      recipients: [],
    });
  }
}

// ─── Contact Form CRUD ───────────────────────────────────────

/**
 * Create a new contact form.
 */
export async function createContactForm(data: {
  machine_name: string;
  label: string;
  description?: string;
  recipients?: string[];
  message?: string;
  weight?: number;
  status?: boolean;
}): Promise<ContactForm> {
  const [id] = await db.insert(CONTACT_FORMS_TABLE).values({
    machine_name: data.machine_name,
    label: data.label,
    description: data.description ?? null,
    recipients: JSON.stringify(data.recipients ?? []),
    message: data.message ?? null,
    weight: data.weight ?? 0,
    status: (data.status ?? true) ? 1 : 0,
  }).execute();

  return {
    id,
    machine_name: data.machine_name,
    label: data.label,
    description: data.description,
    recipients: data.recipients ?? [],
    message: data.message,
    weight: data.weight ?? 0,
    status: Boolean(data.status ?? true),
  };
}

/**
 * Load a single contact form by machine name.
 */
export async function loadContactForm(machineName: string): Promise<ContactForm | null> {
  const rows = await db.select(CONTACT_FORMS_TABLE)
    .fields(['id', 'machine_name', 'label', 'description', 'recipients', 'message', 'weight', 'status'])
    .condition('machine_name', machineName)
    .execute<ContactFormRow>();

  if (rows.length === 0) return null;
  return rowToContactForm(rows[0]);
}

/**
 * List all contact forms, ordered by weight then label.
 */
export async function listContactForms(): Promise<ContactForm[]> {
  const rows = await db.select(CONTACT_FORMS_TABLE)
    .fields(['id', 'machine_name', 'label', 'description', 'recipients', 'message', 'weight', 'status'])
    .orderBy('weight', 'ASC')
    .orderBy('label', 'ASC')
    .execute<ContactFormRow>();

  return rows.map(rowToContactForm);
}

/**
 * Update an existing contact form by machine name.
 */
export async function updateContactForm(
  machineName: string,
  data: Partial<{ label: string; description: string; recipients: string[]; message: string; weight: number; status: boolean }>
): Promise<ContactForm | null> {
  const updates: Record<string, unknown> = {};

  if (data.label !== undefined) updates.label = data.label;
  if (data.description !== undefined) updates.description = data.description;
  if (data.recipients !== undefined) updates.recipients = JSON.stringify(data.recipients);
  if (data.message !== undefined) updates.message = data.message;
  if (data.weight !== undefined) updates.weight = data.weight;
  if (data.status !== undefined) updates.status = data.status ? 1 : 0;

  await db.update(CONTACT_FORMS_TABLE).set(updates).condition('machine_name', machineName).execute();
  return loadContactForm(machineName);
}

/**
 * Delete a contact form by machine name.
 */
export async function deleteContactForm(machineName: string): Promise<void> {
  await db.delete(CONTACT_FORMS_TABLE).condition('machine_name', machineName).execute();
}

// ─── Contact Message Operations ──────────────────────────────

/**
 * Submit a new contact message. Fires 'contact:submit' event via EventBus.
 */
export async function submitContactMessage(data: {
  form_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  uid?: number;
}): Promise<ContactMessage> {
  const now = Math.floor(Date.now() / 1000);

  const [id] = await db.insert(CONTACT_MESSAGES_TABLE).values({
    form_id: data.form_id,
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    uid: data.uid ?? null,
    created: now,
    status: 'new',
  }).execute();

  const contactMessage: ContactMessage = {
    id,
    form_id: data.form_id,
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    uid: data.uid,
    created: now,
    status: 'new',
  };

  // Fire the contact:submit event
  EventBus.emit('contact:submit', contactMessage).catch(() => {});

  return contactMessage;
}

/**
 * Load a single contact message by ID.
 */
export async function loadContactMessage(id: number): Promise<ContactMessage | null> {
  const rows = await db.select(CONTACT_MESSAGES_TABLE)
    .fields(['id', 'form_id', 'name', 'email', 'subject', 'message', 'uid', 'created', 'status'])
    .condition('id', id)
    .execute<ContactMessageRow>();

  if (rows.length === 0) return null;
  return rowToContactMessage(rows[0]);
}

/**
 * List contact messages, optionally filtered by form_id and/or status.
 */
export async function listContactMessages(
  formId?: string,
  options?: { status?: string; limit?: number; offset?: number }
): Promise<ContactMessage[]> {
  let query = db.select(CONTACT_MESSAGES_TABLE)
    .fields(['id', 'form_id', 'name', 'email', 'subject', 'message', 'uid', 'created', 'status'])
    .orderBy('created', 'DESC');

  if (formId) {
    query = query.condition('form_id', formId);
  }

  if (options?.status) {
    query = query.condition('status', options.status);
  }

  if (options?.limit !== undefined || options?.offset !== undefined) {
    query = query.range(options?.offset ?? 0, options?.limit ?? 50);
  }

  const rows = await query.execute<ContactMessageRow>();
  return rows.map(rowToContactMessage);
}

/**
 * Update the status of a contact message.
 */
export async function updateMessageStatus(id: number, status: string): Promise<void> {
  await db.update(CONTACT_MESSAGES_TABLE)
    .set({ status })
    .condition('id', id)
    .execute();
}

/**
 * Delete a contact message by ID.
 */
export async function deleteContactMessage(id: number): Promise<void> {
  await db.delete(CONTACT_MESSAGES_TABLE).condition('id', id).execute();
}

/**
 * Count contact messages, optionally filtered by form_id and/or status.
 */
export async function countContactMessages(formId?: string, status?: string): Promise<number> {
  let query = db.select(CONTACT_MESSAGES_TABLE)
    .fields(['id']);

  if (formId) {
    query = query.condition('form_id', formId);
  }

  if (status) {
    query = query.condition('status', status);
  }

  const rows = await query.execute<{ id: number }>();
  return rows.length;
}

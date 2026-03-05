import type { Request, Response } from '../types.js';
import {
  listContactForms,
  loadContactForm,
  createContactForm,
  updateContactForm,
  deleteContactForm,
  submitContactMessage,
  loadContactMessage,
  listContactMessages,
  updateMessageStatus,
  deleteContactMessage,
  countContactMessages,
  sendContactNotification,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

// ─── Contact Form Handlers ───────────────────────────────────

/**
 * GET /api/contact/forms
 * List all contact forms.
 */
export async function handleListContactForms(
  _req: Request,
  res: Response
): Promise<void> {
  const forms = await listContactForms();
  res.json({ data: forms });
}

/**
 * GET /api/contact/forms/:machineName
 * Get a single contact form by machine name.
 */
export async function handleGetContactForm(
  req: Request,
  res: Response
): Promise<void> {
  const { machineName } = req.params;
  const form = await loadContactForm(machineName);
  if (!form) {
    throw new NotFoundError(`Contact form "${machineName}" not found`);
  }
  res.json({ data: form });
}

/**
 * POST /api/contact/forms
 * Create a new contact form. Requires machine_name and label.
 */
export async function handleCreateContactForm(
  req: Request,
  res: Response
): Promise<void> {
  const { machine_name, label, description, recipients, message, weight, status } = req.body;

  if (!machine_name || !label) {
    throw new BadRequestError('machine_name and label are required');
  }

  if (!/^[a-z][a-z0-9_]*$/.test(machine_name)) {
    throw new BadRequestError('machine_name must start with a letter and contain only lowercase letters, numbers, and underscores');
  }

  const existing = await loadContactForm(machine_name);
  if (existing) {
    throw new BadRequestError(`Contact form "${machine_name}" already exists`);
  }

  const form = await createContactForm({
    machine_name,
    label,
    description,
    recipients,
    message,
    weight,
    status,
  });

  res.status(201).json({ data: form });
}

/**
 * PATCH /api/contact/forms/:machineName
 * Update an existing contact form.
 */
export async function handleUpdateContactForm(
  req: Request,
  res: Response
): Promise<void> {
  const { machineName } = req.params;

  const existing = await loadContactForm(machineName);
  if (!existing) {
    throw new NotFoundError(`Contact form "${machineName}" not found`);
  }

  const { label, description, recipients, message, weight, status } = req.body;

  const updated = await updateContactForm(machineName, {
    label,
    description,
    recipients,
    message,
    weight,
    status,
  });

  res.json({ data: updated });
}

/**
 * DELETE /api/contact/forms/:machineName
 * Delete a contact form.
 */
export async function handleDeleteContactForm(
  req: Request,
  res: Response
): Promise<void> {
  const { machineName } = req.params;

  const existing = await loadContactForm(machineName);
  if (!existing) {
    throw new NotFoundError(`Contact form "${machineName}" not found`);
  }

  await deleteContactForm(machineName);
  res.status(204).send();
}

// ─── Contact Submission Handler ──────────────────────────────

/**
 * POST /api/contact/forms/:machineName/submit
 * Submit a contact message. Requires name, email, subject, message.
 */
export async function handleSubmitContact(
  req: Request,
  res: Response
): Promise<void> {
  const { machineName } = req.params;

  const form = await loadContactForm(machineName);
  if (!form) {
    throw new NotFoundError(`Contact form "${machineName}" not found`);
  }

  if (!form.status) {
    throw new BadRequestError(`Contact form "${machineName}" is disabled`);
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new BadRequestError('name, email, subject, and message are required');
  }

  // Get uid from authenticated user if available
  const user = (req as any).user;
  const uid = user?.uid ?? undefined;

  const contactMessage = await submitContactMessage({
    form_id: machineName,
    name,
    email,
    subject,
    message,
    uid,
  });

  // Send email notification (fire-and-forget)
  sendContactNotification({
    formName: form.label || machineName,
    name,
    email,
    subject,
    message,
  }).catch(() => {});

  res.status(201).json({ data: contactMessage });
}

// ─── Contact Message Handlers ────────────────────────────────

/**
 * GET /api/contact/messages
 * List contact messages. Optional query params: form_id, status, limit, offset.
 */
export async function handleListContactMessages(
  req: Request,
  res: Response
): Promise<void> {
  const formId = req.query.form_id as string | undefined;
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const offset = parseInt(req.query.offset as string, 10) || 0;

  const messages = await listContactMessages(formId, { status, limit, offset });
  const total = await countContactMessages(formId, status);

  res.json({
    data: messages,
    meta: {
      count: messages.length,
      total,
      offset,
      limit,
    },
  });
}

/**
 * GET /api/contact/messages/:id
 * Get a single contact message by ID.
 */
export async function handleGetContactMessage(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid message ID');
  }

  const message = await loadContactMessage(id);
  if (!message) {
    throw new NotFoundError('Contact message not found');
  }

  res.json({ data: message });
}

/**
 * PATCH /api/contact/messages/:id
 * Update a contact message status. Body: { status: 'new' | 'read' | 'replied' }
 */
export async function handleUpdateContactMessageStatus(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid message ID');
  }

  const existing = await loadContactMessage(id);
  if (!existing) {
    throw new NotFoundError('Contact message not found');
  }

  const { status } = req.body;
  if (!status || !['new', 'read', 'replied'].includes(status)) {
    throw new BadRequestError('status must be one of: new, read, replied');
  }

  await updateMessageStatus(id, status);

  const updated = await loadContactMessage(id);
  res.json({ data: updated });
}

/**
 * DELETE /api/contact/messages/:id
 * Delete a contact message.
 */
export async function handleDeleteContactMessage(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid message ID');
  }

  const existing = await loadContactMessage(id);
  if (!existing) {
    throw new NotFoundError('Contact message not found');
  }

  await deleteContactMessage(id);
  res.status(204).send();
}

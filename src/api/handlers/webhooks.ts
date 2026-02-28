import type { Request, Response } from '../types.js';
import {
  createWebhook,
  loadWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export async function handleListWebhooks(
  _req: Request,
  res: Response
): Promise<void> {
  const webhooks = await listWebhooks();
  // Don't expose secrets in list view
  const data = webhooks.map(({ secret, ...rest }) => rest);
  res.json({ data });
}

export async function handleGetWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid webhook ID');

  const webhook = await loadWebhook(id);
  if (!webhook) throw new NotFoundError('Webhook not found');

  res.json({ data: webhook });
}

export async function handleCreateWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const { url, events, secret, active } = req.body;

  if (!url || !events || !Array.isArray(events)) {
    throw new BadRequestError('url and events (array) are required');
  }

  const webhook = await createWebhook({ url, events, secret, active });
  res.status(201).json({ data: webhook });
}

export async function handleUpdateWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid webhook ID');

  const existing = await loadWebhook(id);
  if (!existing) throw new NotFoundError('Webhook not found');

  const webhook = await updateWebhook(id, req.body);
  res.json({ data: webhook });
}

export async function handleDeleteWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid webhook ID');

  const existing = await loadWebhook(id);
  if (!existing) throw new NotFoundError('Webhook not found');

  await deleteWebhook(id);
  res.status(204).send();
}

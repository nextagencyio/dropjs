/**
 * Translation/multilingual API handlers.
 */

import type { Request, Response } from '../types.js';
import {
  getLanguages,
  getEnabledLanguages,
  getDefaultLanguage,
  setLanguageEnabled,
  addLanguage,
  removeLanguage,
  getTranslationStatus,
  getExistingTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  Entity,
} from '../../core/index.js';
import type { Language } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

// ── Language CRUD ──────────────────────────────────────────────────────────

/**
 * GET /api/languages
 * List all languages.
 */
export async function handleListLanguages(_req: Request, res: Response): Promise<void> {
  const languages = await getLanguages();
  res.json({ data: languages });
}

/**
 * GET /api/languages/enabled
 * List only enabled languages.
 */
export async function handleListEnabledLanguages(_req: Request, res: Response): Promise<void> {
  const languages = await getEnabledLanguages();
  res.json({ data: languages });
}

/**
 * GET /api/languages/default
 * Get the default site language.
 */
export async function handleGetDefaultLanguage(_req: Request, res: Response): Promise<void> {
  const lang = await getDefaultLanguage();
  res.json({ data: lang });
}

/**
 * POST /api/languages
 * Add a new language.
 */
export async function handleAddLanguage(req: Request, res: Response): Promise<void> {
  const { id, label, direction, weight, enabled } = req.body;

  if (!id || !label) {
    throw new BadRequestError('id and label are required');
  }

  if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)?$/.test(id)) {
    throw new BadRequestError('Language id must be a valid ISO 639 code (e.g. en, fr, pt-BR)');
  }

  const language: Language = {
    id,
    label,
    direction: direction ?? 'ltr',
    weight: weight ?? 100,
    enabled: enabled !== false,
  };

  try {
    await addLanguage(language);
    res.status(201).json({ data: language });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

/**
 * PATCH /api/languages/:id
 * Enable/disable or update a language.
 */
export async function handleUpdateLanguage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { enabled, label, weight, direction } = req.body;

  try {
    if (enabled !== undefined) {
      await setLanguageEnabled(id, enabled);
    }

    // Update other properties via the core function
    const { updateLanguage: coreUpdate } = await import('../../core/index.js');
    const updates: Partial<Omit<Language, 'id'>> = {};
    if (label !== undefined) updates.label = label;
    if (weight !== undefined) updates.weight = weight;
    if (direction !== undefined) updates.direction = direction;
    if (Object.keys(updates).length > 0) {
      await coreUpdate(id, updates);
    }

    const languages = await getLanguages();
    const updated = languages.find((l) => l.id === id);
    res.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

/**
 * DELETE /api/languages/:id
 * Remove a language.
 */
export async function handleRemoveLanguage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await removeLanguage(id);
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

// ── Entity Translation CRUD ────────────────────────────────────────────────

/**
 * GET /api/:entityType/:bundle/:id/translations
 * Get translation status for an entity.
 */
export async function handleGetTranslations(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const entity = await Entity.load(entityType, entityId);
  if (!entity) {
    throw new NotFoundError(`Entity ${entityType}:${entityId} not found`);
  }

  const translations = await getTranslationStatus(entityType, entityId);
  const existing = await getExistingTranslations(entityType, entityId);

  res.json({
    data: {
      entity_id: entityId,
      entity_type: entityType,
      bundle,
      default_langcode: entity.langcode,
      translations,
      existing_languages: existing,
    },
  });
}

/**
 * GET /api/:entityType/:bundle/:id/translations/:langcode
 * Get a specific translation of an entity.
 */
export async function handleGetTranslation(req: Request, res: Response): Promise<void> {
  const { entityType, id, langcode } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const entity = await Entity.loadTranslation(entityType, entityId, langcode);
  if (!entity) {
    throw new NotFoundError(`Entity ${entityType}:${entityId} not found`);
  }

  // Check if we got the actual requested language or a fallback
  const actualLangcode = entity.langcode;
  if (actualLangcode !== langcode) {
    // The requested translation doesn't exist — return 404
    const existing = await getExistingTranslations(entityType, entityId);
    if (!existing.includes(langcode)) {
      throw new NotFoundError(`No translation for language "${langcode}"`);
    }
  }

  res.json({ data: entity.toJSON() });
}

/**
 * POST /api/:entityType/:bundle/:id/translations/:langcode
 * Create a translation for an entity.
 */
export async function handleCreateTranslation(req: Request, res: Response): Promise<void> {
  const { entityType, id, langcode } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  try {
    const entity = await createTranslation(entityType, entityId, langcode, req.body);
    if (!entity) {
      throw new NotFoundError(`Entity ${entityType}:${entityId} not found`);
    }
    res.status(201).json({ data: entity.toJSON() });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

/**
 * PATCH /api/:entityType/:bundle/:id/translations/:langcode
 * Update a translation.
 */
export async function handleUpdateTranslation(req: Request, res: Response): Promise<void> {
  const { entityType, id, langcode } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  try {
    const entity = await updateTranslation(entityType, entityId, langcode, req.body);
    if (!entity) {
      throw new NotFoundError(`Entity ${entityType}:${entityId} not found`);
    }
    res.json({ data: entity.toJSON() });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

/**
 * DELETE /api/:entityType/:bundle/:id/translations/:langcode
 * Delete a translation.
 */
export async function handleDeleteTranslation(req: Request, res: Response): Promise<void> {
  const { entityType, id, langcode } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  try {
    await deleteTranslation(entityType, entityId, langcode);
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

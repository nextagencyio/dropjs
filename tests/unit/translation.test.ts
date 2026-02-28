import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  Entity,
  registerEntityType,
  clearEntityTypeRegistry,
  ensureConfigTable,
  ensureKeyValueTable,
  getLanguages,
  getEnabledLanguages,
  getDefaultLanguage,
  setLanguageEnabled,
  removeLanguage,
  getTranslationStatus,
  getExistingTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  negotiateLanguage,
} from '../../src/core/index.js';
import type { EntityTypeDefinition } from '../../src/core/index.js';

const articleDef: EntityTypeDefinition = {
  entity_type: 'node',
  bundle: 'article',
  label: 'Article',
  fields: {
    field_body: { type: 'text_long', label: 'Body', required: false },
  },
};

describe('Translation System', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });
    await ensureConfigTable();
    await ensureKeyValueTable();
    await Entity.ensureBaseTable('node');
    await Entity.ensureFieldTables(articleDef);
    registerEntityType(articleDef);
  });

  afterAll(async () => {
    clearEntityTypeRegistry();
    await destroyConnection();
  });

  describe('Language Configuration', () => {
    it('should return default languages', async () => {
      const languages = await getLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThanOrEqual(1);

      const en = languages.find((l) => l.id === 'en');
      expect(en).toBeDefined();
      expect(en!.label).toBe('English');
      expect(en!.enabled).toBe(true);
    });

    it('should return enabled languages', async () => {
      const enabled = await getEnabledLanguages();
      expect(enabled.length).toBeGreaterThanOrEqual(1);
      expect(enabled.every((l) => l.enabled)).toBe(true);
    });

    it('should return default language', async () => {
      const lang = await getDefaultLanguage();
      expect(lang).toBeDefined();
      expect(lang.id).toBeDefined();
    });

    it('should enable a language', async () => {
      await setLanguageEnabled('fr', true);
      const enabled = await getEnabledLanguages();
      const fr = enabled.find((l) => l.id === 'fr');
      expect(fr).toBeDefined();
      expect(fr!.enabled).toBe(true);
    });

    it('should disable a language', async () => {
      await setLanguageEnabled('fr', false);
      const enabled = await getEnabledLanguages();
      const fr = enabled.find((l) => l.id === 'fr');
      expect(fr).toBeUndefined();
    });

    it('should reject disabling the last enabled language', async () => {
      await expect(setLanguageEnabled('en', false)).rejects.toThrow(
        'Cannot disable the last enabled language'
      );
    });

    it('should reject removing English', async () => {
      await expect(removeLanguage('en')).rejects.toThrow(
        'Cannot remove the English language'
      );
    });
  });

  describe('Language Negotiation', () => {
    beforeEach(async () => {
      await setLanguageEnabled('fr', true);
    });

    it('should negotiate from query parameter', async () => {
      const lang = await negotiateLanguage('fr');
      expect(lang).toBe('fr');
    });

    it('should negotiate from Accept-Language header', async () => {
      const lang = await negotiateLanguage(undefined, 'fr-FR,fr;q=0.9,en;q=0.8');
      expect(lang).toBe('fr');
    });

    it('should fall back to default for unknown language', async () => {
      const lang = await negotiateLanguage('xx');
      expect(lang).toBe('en');
    });

    it('should fall back to default with no parameters', async () => {
      const lang = await negotiateLanguage();
      expect(lang).toBe('en');
    });
  });

  describe('Entity Translation CRUD', () => {
    let entityNid: number;

    beforeEach(async () => {
      // Enable French
      await setLanguageEnabled('fr', true);

      // Create a test entity
      const entity = await Entity.create('node', 'article', {
        title: 'English Title',
        status: true,
        uid: 1,
      });
      entityNid = entity.nid!;
    });

    it('should get existing translations (only en initially)', async () => {
      const translations = await getExistingTranslations('node', entityNid);
      expect(translations).toContain('en');
      expect(translations).not.toContain('fr');
    });

    it('should get translation status', async () => {
      const status = await getTranslationStatus('node', entityNid);
      expect(Array.isArray(status)).toBe(true);

      const en = status.find((s) => s.langcode === 'en');
      expect(en?.status).toBe('translated');

      const fr = status.find((s) => s.langcode === 'fr');
      if (fr) {
        expect(fr.status).toBe('untranslated');
      }
    });

    it('should create a translation', async () => {
      const translated = await createTranslation('node', entityNid, 'fr', {
        title: 'Titre en Français',
      });

      expect(translated).not.toBeNull();
      expect(translated!.langcode).toBe('fr');
      expect(translated!.title).toBe('Titre en Français');
      expect(translated!.nid).toBe(entityNid);
    });

    it('should load a translation', async () => {
      await createTranslation('node', entityNid, 'fr', {
        title: 'Titre Chargé',
      });

      const entity = await Entity.loadTranslation('node', entityNid, 'fr');
      expect(entity).not.toBeNull();
      expect(entity!.langcode).toBe('fr');
      expect(entity!.title).toBe('Titre Chargé');
    });

    it('should fall back to default language when translation missing', async () => {
      // No Spanish translation exists
      const entity = await Entity.loadTranslation('node', entityNid, 'es');
      expect(entity).not.toBeNull();
      // Should fall back to English
      expect(entity!.langcode).toBe('en');
      expect(entity!.title).toBe('English Title');
    });

    it('should update a translation', async () => {
      await createTranslation('node', entityNid, 'fr', {
        title: 'Original Titre',
      });

      const updated = await updateTranslation('node', entityNid, 'fr', {
        title: 'Titre Mis à Jour',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Titre Mis à Jour');
    });

    it('should delete a translation', async () => {
      await createTranslation('node', entityNid, 'fr', {
        title: 'À Supprimer',
      });

      await deleteTranslation('node', entityNid, 'fr');

      const translations = await getExistingTranslations('node', entityNid);
      expect(translations).not.toContain('fr');
    });

    it('should reject deleting the default language translation', async () => {
      await expect(
        deleteTranslation('node', entityNid, 'en')
      ).rejects.toThrow('Cannot delete the default language translation');
    });

    it('should reject creating duplicate translation', async () => {
      await createTranslation('node', entityNid, 'fr', {
        title: 'Première',
      });

      await expect(
        createTranslation('node', entityNid, 'fr', {
          title: 'Deuxième',
        })
      ).rejects.toThrow('already exists');
    });

    it('should reject translation for disabled language', async () => {
      // German is disabled by default
      await expect(
        createTranslation('node', entityNid, 'de', {
          title: 'Deutsch',
        })
      ).rejects.toThrow('not enabled');
    });

    it('should preserve English entity after translation operations', async () => {
      // Create French translation
      await createTranslation('node', entityNid, 'fr', {
        title: 'Titre Français',
      });

      // English should still be intact
      const enEntity = await Entity.load('node', entityNid);
      expect(enEntity).not.toBeNull();
      expect(enEntity!.title).toBe('English Title');
    });
  });
});

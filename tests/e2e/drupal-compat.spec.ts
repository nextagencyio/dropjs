/**
 * Drupal Compatibility E2E Test
 *
 * Verifies that a dropjs-generated SQLite database can be used as-is
 * by a real Drupal 11 site. The test:
 *   1. Seeds content in dropjs via the API
 *   2. Copies the SQLite DB to a Drupal project
 *   3. Configures Drupal to use SQLite via settings.local.php
 *   4. Runs drush commands inside DDEV to verify Drupal boots
 *   5. Cleans up all changes to the Drupal project
 *
 * Prerequisites:
 *   - ~/ddev/decoupled-project must exist (Drupal 11 + DDEV)
 *   - `ddev` CLI must be installed
 *   - Docker must be running
 *
 * Skips gracefully if prerequisites are not met.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ── Paths ──────────────────────────────────────────────────────────

const DRUPAL_ROOT = path.resolve(process.env.HOME!, 'ddev/decoupled-project');
const DRUPAL_SITE = path.join(DRUPAL_ROOT, 'web/sites/default');
const DRUPAL_SETTINGS = path.join(DRUPAL_SITE, 'settings.php');
const DRUPAL_SETTINGS_BAK = path.join(DRUPAL_SITE, 'settings.php.dropjs-bak');
const DRUPAL_LOCAL_SETTINGS = path.join(DRUPAL_SITE, 'settings.local.php');
const SQLITE_DEST = path.join(DRUPAL_SITE, 'files/.ht.sqlite');
const DROPJS_DB = path.resolve('./e2e-data/drop.db');

const SETTINGS_LOCAL_PHP = `<?php
/**
 * dropjs E2E test — SQLite override.
 * This file is auto-generated and will be deleted after the test.
 */
$databases['default']['default'] = [
  'driver'    => 'sqlite',
  'namespace' => 'Drupal\\\\sqlite\\\\Driver\\\\Database\\\\sqlite',
  'autoload'  => 'core/modules/sqlite/src/Driver/Database/sqlite/',
  'database'  => __DIR__ . '/files/.ht.sqlite',
  'prefix'    => '',
];
$settings['hash_salt'] = 'dropjs-e2e-test-salt-' . md5(__FILE__);
$settings['skip_permissions_hardening'] = TRUE;
$settings['trusted_host_patterns'] = ['.*'];
$settings['state_cache'] = TRUE;
$settings['config_sync_directory'] = 'sites/default/files/sync';
`;

const SETTINGS_INCLUDE_MARKER = '\n// dropjs-e2e-test: SQLite override\nif (file_exists(__DIR__ . \'/settings.local.php\')) {\n  require __DIR__ . \'/settings.local.php\';\n}\n';

// ── Helpers ────────────────────────────────────────────────────────

function hasDdev(): boolean {
  try {
    execSync('which ddev', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function ddev(cmd: string, opts?: { timeout?: number }): string {
  return execSync(`ddev ${cmd}`, {
    cwd: DRUPAL_ROOT,
    stdio: 'pipe',
    timeout: opts?.timeout ?? 120_000,
  }).toString().trim();
}

// ── Test suite ─────────────────────────────────────────────────────

const drupalExists = fs.existsSync(DRUPAL_ROOT);
const ddevInstalled = hasDdev();

test.describe('Drupal 11 compatibility', () => {
  // Skip the entire suite if prerequisites are missing
  test.skip(!drupalExists, `Drupal project not found at ${DRUPAL_ROOT}`);
  test.skip(!ddevInstalled, 'ddev CLI not installed');

  let token: string;
  let ddevWasRunning = false;

  test.beforeAll(async ({ request }) => {
    // ── 1. Authenticate with dropjs ──
    await request.post('/api/auth/register', {
      data: { name: 'admin', email: 'admin@test.com', password: 'DropJs2024Admin' },
    }).catch(() => {}); // may already exist
    const loginRes = await request.post('/api/auth/login', {
      data: { name: 'admin', password: 'DropJs2024Admin' },
    });
    const loginBody = await loginRes.json();
    token = loginBody.data?.token ?? loginBody.token;

    // ── 2. Seed some content via the API ──
    const headers = { Authorization: `Bearer ${token}` };

    // Create a taxonomy term
    await request.post('/api/taxonomy_term/tags', {
      headers,
      data: { name: 'E2E Test Tag' },
    });

    // Create a node with body content
    await request.post('/api/node/article', {
      headers,
      data: {
        title: 'Drupal Compat Test Article',
        field_body: { value: '<p>Created by dropjs E2E test.</p>', format: 'full_html' },
        status: true,
      },
    });

    // ── 3. Wait for DB to be fully flushed ──
    // SQLite WAL mode may have pending writes
    await new Promise((r) => setTimeout(r, 1000));

    // ── 4. Verify the dropjs DB exists ──
    if (!fs.existsSync(DROPJS_DB)) {
      throw new Error(`dropjs database not found at ${DROPJS_DB}`);
    }

    // ── 5. Copy DB to Drupal site ──
    const filesDir = path.dirname(SQLITE_DEST);
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    fs.copyFileSync(DROPJS_DB, SQLITE_DEST);
    // Also copy any WAL/SHM files
    for (const ext of ['-wal', '-shm']) {
      const src = DROPJS_DB + ext;
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, SQLITE_DEST + ext);
      }
    }

    // ── 6. Back up settings.php and create SQLite override ──
    fs.copyFileSync(DRUPAL_SETTINGS, DRUPAL_SETTINGS_BAK);
    fs.writeFileSync(DRUPAL_LOCAL_SETTINGS, SETTINGS_LOCAL_PHP);

    // Append include to settings.php (at the very end, after settings.ddev.php)
    const currentSettings = fs.readFileSync(DRUPAL_SETTINGS, 'utf-8');
    if (!currentSettings.includes('dropjs-e2e-test')) {
      fs.appendFileSync(DRUPAL_SETTINGS, SETTINGS_INCLUDE_MARKER);
    }

    // ── 7. Start DDEV ──
    try {
      const status = ddev('status -j', { timeout: 10_000 });
      ddevWasRunning = status.includes('"running"') || status.includes('"ok"');
    } catch {
      ddevWasRunning = false;
    }

    ddev('start', { timeout: 180_000 });
  });

  test.afterAll(async () => {
    // Always clean up, even if tests failed
    try {
      // Restore settings.php from backup
      if (fs.existsSync(DRUPAL_SETTINGS_BAK)) {
        fs.copyFileSync(DRUPAL_SETTINGS_BAK, DRUPAL_SETTINGS);
        fs.unlinkSync(DRUPAL_SETTINGS_BAK);
      }

      // Delete settings.local.php
      if (fs.existsSync(DRUPAL_LOCAL_SETTINGS)) {
        fs.unlinkSync(DRUPAL_LOCAL_SETTINGS);
      }

      // Delete the SQLite database (and WAL/SHM)
      for (const f of [SQLITE_DEST, SQLITE_DEST + '-wal', SQLITE_DEST + '-shm']) {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      }

      // If DDEV wasn't running before we started it, stop it
      if (!ddevWasRunning) {
        try {
          ddev('stop', { timeout: 60_000 });
        } catch {
          // Best effort
        }
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  test('drush status shows Drupal bootstrapped with SQLite', () => {
    const output = ddev('exec drush status --format=json');
    const status = JSON.parse(output);

    expect(status['db-driver']).toBe('sqlite');
    expect(status['drupal-version']).toMatch(/^11\./);
    expect(status['bootstrap']).toBe('Successful');
  });

  test('Drupal can read seeded node content', () => {
    const output = ddev('exec drush sql:query "SELECT title FROM node_field_data ORDER BY nid"');

    // Should contain both the default seed content and our test article
    expect(output).toContain('Welcome to drop.js');
    expect(output).toContain('Drupal Compat Test Article');
  });

  test('Drupal can read system.site config', () => {
    const output = ddev('exec drush config:get system.site name --format=string');
    expect(output).toContain('drop.js');
  });

  test('Drupal can read node type config', () => {
    const output = ddev('exec drush config:get node.type.article --format=json');
    const config = JSON.parse(output);

    expect(config.type).toBe('article');
    expect(config.name).toBe('Article');
  });

  test('drush cache-rebuild succeeds', () => {
    // This is the most comprehensive test — it forces Drupal to
    // rebuild its entire container and cache layer using our tables.
    // If any required table/column/config is missing, this will fail.
    // execSync throws on non-zero exit code, so reaching the next line = success.
    expect(() => ddev('exec drush cr', { timeout: 120_000 })).not.toThrow();
  });
});

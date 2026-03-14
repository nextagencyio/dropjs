import * as path from 'node:path';
import * as fs from 'node:fs';
import { ensureInitialized } from '../../api/init.js';
import { Entity } from '../../core/index.js';
import { createUser, loadUserByName } from '../../auth/index.js';

/**
 * Seed default admin user and sample content.
 * Only runs if no admin user exists (fresh install).
 */
export async function seed(): Promise<void> {
  // Clean DB before init when DROP_CLEAN_DB=1 (E2E testing).
  // This must happen BEFORE ensureInitialized() opens the DB connection.
  if (process.env.DROP_CLEAN_DB === '1') {
    const dataDir = process.env.DROP_DATA_DIR || './data';
    const dbPath = path.resolve(path.join(dataDir, 'drop.db'));
    const dir = path.dirname(dbPath);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  await ensureInitialized();

  const existing = await loadUserByName('admin');
  if (existing) {
    console.log('Admin user already exists — skipping seed.');
    return;
  }

  console.log('First run detected — seeding defaults...');

  const admin = await createUser({
    name: 'admin',
    email: 'admin@example.com',
    password: 'DropJs2024Admin',
    status: true,
    roles: ['authenticated', 'admin'],
  });
  console.log('  Created admin user (admin / DropJs2024Admin)');

  const articles = [
    {
      title: 'Welcome to drop.js',
      field_body: { value: '<p>Congratulations! You have successfully installed drop.js, a modern Node.js CMS inspired by Drupal.</p><p>This is your first article. You can edit or delete it, then start creating your own content.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
    {
      title: 'Getting started with content types',
      field_body: { value: '<p>Content types define the structure of your content. drop.js ships with two defaults:</p><ul><li><strong>Article</strong> — For time-sensitive content like news and blog posts</li><li><strong>Basic page</strong> — For static content like "About us" or "Contact"</li></ul><p>You can create new content types under Structure > Content types.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
    {
      title: 'Working with the REST API',
      field_body: { value: '<p>Every content type in drop.js automatically gets a full REST API. Try these endpoints:</p><ul><li><code>GET /api/node/article</code> — List articles</li><li><code>GET /api/node/page</code> — List pages</li><li><code>GET /api/entity-types</code> — List all content types</li></ul><p>Full API documentation is available at <code>/api/docs</code>.</p>', format: 'full_html' },
      status: false,
      uid: admin.uid,
    },
  ];

  for (const data of articles) {
    await Entity.create('node', 'article', data);
  }
  console.log(`  Created ${articles.length} sample articles`);

  const pages = [
    {
      title: 'About',
      field_body: { value: '<p>This is a sample "About" page. Edit this content to tell visitors about your site.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
    {
      title: 'Contact',
      field_body: { value: '<p>You can reach us at <a href="mailto:info@example.com">info@example.com</a>.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
  ];

  for (const data of pages) {
    await Entity.create('node', 'page', data);
  }
  console.log(`  Created ${pages.length} sample pages`);
}

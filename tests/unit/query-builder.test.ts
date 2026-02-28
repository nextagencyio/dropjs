import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/connection.js';
import { db } from '../../src/db/query-builder.js';
import { schema } from '../../src/db/schema.js';

describe('@dropjs/db query builder', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });

    await schema.createTable('posts', {
      fields: {
        id: { type: 'serial', primary: true },
        title: { type: 'varchar', length: 255, nullable: false },
        body: { type: 'text' },
        status: { type: 'boolean', default: false },
        created: { type: 'timestamp', default: 'now' },
      },
      indexes: {
        idx_status: ['status'],
      },
    });

    await schema.createTable('tags', {
      fields: {
        id: { type: 'serial', primary: true },
        name: { type: 'varchar', length: 100, nullable: false },
      },
    });

    await schema.createTable('post_tags', {
      fields: {
        post_id: { type: 'int', nullable: false, references: { table: 'posts', column: 'id' } },
        tag_id: { type: 'int', nullable: false, references: { table: 'tags', column: 'id' } },
      },
    });
  });

  afterAll(async () => {
    await destroyConnection();
  });

  beforeEach(async () => {
    await db.raw('DELETE FROM post_tags');
    await db.raw('DELETE FROM tags');
    await db.raw('DELETE FROM posts');
  });

  describe('insert', () => {
    it('should insert a row and return the id', async () => {
      const result = await db.insert('posts')
        .values({ title: 'Hello World', body: 'First post', status: true })
        .execute();

      expect(result).toBeDefined();
      expect(result[0]).toBeGreaterThan(0);
    });

    it('should insert multiple rows', async () => {
      await db.insert('posts')
        .values([
          { title: 'Post 1', status: true },
          { title: 'Post 2', status: false },
        ])
        .execute();

      const posts = await db.select('posts').fields(['title']).execute();
      expect(posts).toHaveLength(2);
    });
  });

  describe('select', () => {
    beforeEach(async () => {
      await db.insert('posts')
        .values([
          { title: 'Published Post', body: 'Content A', status: true },
          { title: 'Draft Post', body: 'Content B', status: false },
          { title: 'Another Published', body: 'Content C', status: true },
        ])
        .execute();
    });

    it('should select all rows', async () => {
      const rows = await db.select('posts').fields(['title', 'status']).execute();
      expect(rows).toHaveLength(3);
    });

    it('should filter with condition', async () => {
      const rows = await db.select('posts')
        .fields(['title'])
        .condition('status', true)
        .execute<{ title: string }>();

      expect(rows).toHaveLength(2);
      expect(rows[0].title).toBe('Published Post');
    });

    it('should support ordering', async () => {
      const rows = await db.select('posts')
        .fields(['title'])
        .orderBy('title', 'DESC')
        .execute<{ title: string }>();

      expect(rows[0].title).toBe('Published Post');
    });

    it('should support range (offset/limit)', async () => {
      const rows = await db.select('posts')
        .fields(['title'])
        .orderBy('title', 'ASC')
        .range(0, 2)
        .execute();

      expect(rows).toHaveLength(2);
    });

    it('should support LIKE conditions', async () => {
      const rows = await db.select('posts')
        .fields(['title'])
        .condition('title', '%Published%', 'LIKE')
        .execute();

      expect(rows).toHaveLength(2);
    });

    it('should support IN conditions', async () => {
      const rows = await db.select('posts')
        .fields(['title'])
        .condition('title', ['Published Post', 'Draft Post'], 'IN')
        .execute();

      expect(rows).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update rows matching condition', async () => {
      await db.insert('posts')
        .values({ title: 'Old Title', status: false })
        .execute();

      await db.update('posts')
        .set({ title: 'New Title', status: true })
        .condition('title', 'Old Title')
        .execute();

      const rows = await db.select('posts')
        .fields(['title', 'status'])
        .execute<{ title: string; status: number }>();

      expect(rows[0].title).toBe('New Title');
      expect(rows[0].status).toBe(1); // SQLite stores booleans as 0/1
    });
  });

  describe('delete', () => {
    it('should delete rows matching condition', async () => {
      await db.insert('posts')
        .values([
          { title: 'Keep', status: true },
          { title: 'Remove', status: false },
        ])
        .execute();

      await db.delete('posts')
        .condition('status', false)
        .execute();

      const rows = await db.select('posts').fields(['title']).execute();
      expect(rows).toHaveLength(1);
      expect((rows[0] as any).title).toBe('Keep');
    });
  });

  describe('joins', () => {
    it('should support joins', async () => {
      const [postId] = await db.insert('posts')
        .values({ title: 'Tagged Post', status: true })
        .execute();

      const [tagId] = await db.insert('tags')
        .values({ name: 'javascript' })
        .execute();

      await db.insert('post_tags')
        .values({ post_id: postId, tag_id: tagId })
        .execute();

      const rows = await db.select('posts', 'p')
        .join('post_tags', 'pt', 'p.id = pt.post_id')
        .join('tags', 't', 'pt.tag_id = t.id')
        .fields('p', ['title'])
        .fields('t', ['name'])
        .execute<{ title: string; name: string }>();

      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Tagged Post');
      expect(rows[0].name).toBe('javascript');
    });
  });

  describe('transactions', () => {
    it('should commit on success', async () => {
      await db.transaction(async (trx) => {
        await trx.insert('posts')
          .values({ title: 'Tx Post', status: true })
          .execute();

        await trx.insert('tags')
          .values({ name: 'tx-tag' })
          .execute();
      });

      const posts = await db.select('posts').fields(['title']).execute();
      const tags = await db.select('tags').fields(['name']).execute();

      expect(posts).toHaveLength(1);
      expect(tags).toHaveLength(1);
    });

    it('should rollback on error', async () => {
      try {
        await db.transaction(async (trx) => {
          await trx.insert('posts')
            .values({ title: 'Will Rollback', status: true })
            .execute();

          throw new Error('Intentional failure');
        });
      } catch {
        // Expected
      }

      const posts = await db.select('posts').fields(['title']).execute();
      expect(posts).toHaveLength(0);
    });
  });

  describe('raw queries', () => {
    it('should execute raw SQL with bindings', async () => {
      await db.insert('posts')
        .values({ title: 'Raw Test', status: true })
        .execute();

      const result = await db.raw<any[]>(
        'SELECT title FROM posts WHERE status = ?',
        [true]
      );

      expect(result).toBeDefined();
    });
  });
});

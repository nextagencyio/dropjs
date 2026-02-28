import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

// Helper to create an image media entity with required fields
function imageData(name: string, extra: Record<string, unknown> = {}) {
  return { name, field_media_image: { uri: 'public://test.jpg', alt: name }, ...extra };
}

test.describe('Media Entity API', () => {
  test('should create a media entity (image bundle)', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/media/image', imageData('Test Image'));
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.title).toBe('Test Image');
    expect(body.data.type).toBe('image');
    expect(body.data.nid).toBeGreaterThan(0);
    expect(body.data.vid).toBeGreaterThan(0);
    expect(body.data.uuid).toBeTruthy();
  });

  test('should create a media entity (document bundle)', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/media/document', {
      name: 'Test Document',
      field_media_file: { uri: 'public://report.pdf' },
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.title).toBe('Test Document');
    expect(body.data.type).toBe('document');
  });

  test('should create a media entity (video bundle)', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/media/video', {
      name: 'Test Video',
      field_media_video_url: 'https://example.com/sample.mp4',
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.title).toBe('Test Video');
    expect(body.data.type).toBe('video');
  });

  test('should create a media entity (audio bundle)', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/media/audio', {
      name: 'Test Audio',
      field_media_audio_file: { uri: 'public://podcast.mp3' },
    });
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.title).toBe('Test Audio');
    expect(body.data.type).toBe('audio');
  });

  test('should list media entities by bundle', async ({ authenticatedPage: page }) => {
    // Create two images
    await apiPost(page, '/api/media/image', imageData('Image A'));
    await apiPost(page, '/api/media/image', imageData('Image B'));

    const resp = await apiGet(page, '/api/media/image');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
    for (const item of body.data) {
      expect(item.type).toBe('image');
    }
  });

  test('should get a single media entity by ID', async ({ authenticatedPage: page }) => {
    const createResp = await apiPost(page, '/api/media/image', imageData('Fetch Me'));
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const mid = created.data.nid;

    const resp = await apiGet(page, `/api/media/image/${mid}`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.title).toBe('Fetch Me');
  });

  test('should get a media entity via generic entity endpoint', async ({ authenticatedPage: page }) => {
    const createResp = await apiPost(page, '/api/media/image', imageData('Generic Load'));
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const mid = created.data.nid;

    const resp = await apiGet(page, `/api/entity/media/${mid}`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.title).toBe('Generic Load');
  });

  test('should update a media entity', async ({ authenticatedPage: page }) => {
    const createResp = await apiPost(page, '/api/media/image', imageData('Original Name'));
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const mid = created.data.nid;

    const updateResp = await apiPatch(page, `/api/media/image/${mid}`, { name: 'Updated Name' });
    expect(updateResp.status()).toBe(200);

    // Verify the update persisted
    const getResp = await apiGet(page, `/api/media/image/${mid}`);
    const body = await getResp.json();
    expect(body.data.title).toBe('Updated Name');
  });

  test('should delete a media entity', async ({ authenticatedPage: page }) => {
    const createResp = await apiPost(page, '/api/media/image', imageData('Delete Me'));
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const mid = created.data.nid;

    const deleteResp = await apiDelete(page, `/api/media/image/${mid}`);
    expect(deleteResp.status()).toBe(204);

    // Verify deleted
    const getResp = await apiGet(page, `/api/media/image/${mid}`);
    expect(getResp.status()).toBe(404);
  });

  test('should create revisions on update', async ({ authenticatedPage: page }) => {
    const createResp = await apiPost(page, '/api/media/image', imageData('Rev Test'));
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const mid = created.data.nid;
    const vid1 = created.data.vid;

    // Update to create revision
    const updateResp = await apiPatch(page, `/api/media/image/${mid}`, { name: 'Rev Test Updated' });
    const updated = await updateResp.json();
    const vid2 = updated.data.vid;
    expect(vid2).toBeGreaterThan(vid1);
  });

  test('should list revisions for a media entity', async ({ authenticatedPage: page }) => {
    const createResp = await apiPost(page, '/api/media/image', imageData('Rev List'));
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const mid = created.data.nid;

    // Update twice
    await apiPatch(page, `/api/media/image/${mid}`, { name: 'Rev List v2' });
    await apiPatch(page, `/api/media/image/${mid}`, { name: 'Rev List v3' });

    const revResp = await apiGet(page, `/api/media/image/${mid}/revisions`);
    expect(revResp.status()).toBe(200);
    const body = await revResp.json();
    expect(body.data.length).toBe(3);
  });

  test('should return 404 for non-existent media', async ({ authenticatedPage: page }) => {
    const resp = await apiGet(page, '/api/media/image/99999');
    expect(resp.status()).toBe(404);
  });

  test('should reject creation without required fields', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/media/image', { name: 'No Image Field' });
    expect(resp.status()).toBe(422);
    const body = await resp.json();
    expect(body.error.details.field_media_image).toBeTruthy();
  });
});

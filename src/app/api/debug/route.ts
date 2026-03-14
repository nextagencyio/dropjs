import { ensureInitialized } from '@/api/init';

export const maxDuration = 60;

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push('Starting init...');
    const start = Date.now();
    await ensureInitialized();
    steps.push(`Init complete in ${Date.now() - start}ms`);

    // Use dynamic imports for server-only modules
    const { getAllEntityTypes } = await import('../../../core/entity-type');
    const types = getAllEntityTypes();
    steps.push(`Entity types: ${types.length}`);

    const { loadUserByName } = await import('@/auth/user');
    const admin = await loadUserByName('admin');
    steps.push(`Admin user: ${admin ? 'found uid=' + admin.uid : 'NOT FOUND'}`);

    return Response.json({ ok: true, steps });
  } catch (err: any) {
    steps.push(`ERROR: ${err.message}`);
    steps.push(`Stack: ${err.stack?.split('\n').slice(0, 5).join(' | ')}`);
    return Response.json({ ok: false, steps, error: err.message }, { status: 500 });
  }
}

import { ensureInitialized } from '@/api/init';
import { loadUserByName } from '@/auth/user';
import { getAllEntityTypes } from '@/core/entity-types';

export const maxDuration = 60;

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push('Starting init...');
    await ensureInitialized();
    steps.push('Init complete');

    const types = getAllEntityTypes();
    steps.push(`Entity types: ${types.length}`);

    const admin = await loadUserByName('admin');
    steps.push(`Admin user: ${admin ? 'found uid=' + admin.uid : 'NOT FOUND'}`);

    return Response.json({ ok: true, steps });
  } catch (err: any) {
    steps.push(`ERROR: ${err.message}`);
    steps.push(`Stack: ${err.stack?.split('\n').slice(0, 5).join(' | ')}`);
    return Response.json({ ok: false, steps, error: err.message }, { status: 500 });
  }
}

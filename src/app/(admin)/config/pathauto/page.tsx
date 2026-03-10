import { getPatterns } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import PathautoClient from './pathauto-client';

export default async function PathautoPage() {
  await requirePermission('administer url aliases');
  const patterns = await getPatterns();

  return <PathautoClient initialPatterns={patterns} />;
}

import { requirePermission } from '@/lib/server/auth';
import ActionsClient from './actions-client';

export default async function ActionsPage() {
  await requirePermission('administer actions');

  return <ActionsClient />;
}

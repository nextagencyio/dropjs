import { requirePermission } from '@/lib/server/auth';
import RestResourcesClient from './rest-resources-client';

export default async function RestResourcesPage() {
  await requirePermission('administer site configuration');

  return <RestResourcesClient />;
}

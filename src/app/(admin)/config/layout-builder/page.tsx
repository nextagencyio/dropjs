import { requirePermission } from '@/lib/server/auth';
import LayoutBuilderClient from './layout-builder-client';

export default async function LayoutBuilderPage() {
  await requirePermission('administer site configuration');

  return <LayoutBuilderClient />;
}

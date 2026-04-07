import { requireAuth } from '@/lib/server/auth';
import { getEntityTypes } from '@/lib/server/data';
import ImportExportClient from './import-export-client';

export default async function ImportExportPage() {
  await requireAuth();
  const allTypes = await getEntityTypes();
  const nodeTypes = allTypes
    .filter((t) => t.entity_type === 'node')
    .map((t) => ({ bundle: t.bundle, label: t.label }));

  return <ImportExportClient nodeTypes={nodeTypes} />;
}

import { getEntityTypesFor } from '@/lib/server/data';
import { NodeAddList } from './node-add-list';

export default async function NodeAddPage() {
  const allTypes = await getEntityTypesFor('node');
  const types = allTypes.map((t) => ({
    bundle: t.bundle,
    label: t.label,
    description: t.description,
  }));

  return <NodeAddList types={types} />;
}

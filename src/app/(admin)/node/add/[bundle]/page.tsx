import { notFound } from 'next/navigation';
import { getEntityType } from '@/lib/server/data';
import { NodeCreateForm } from './node-create-form';

export default async function NodeAddBundlePage({
  params,
}: {
  params: Promise<{ bundle: string }>;
}) {
  const { bundle } = await params;

  const typeDef = await getEntityType('node', bundle);
  if (!typeDef) notFound();

  const bundleLabel = typeDef.label;

  return <NodeCreateForm bundle={bundle} bundleLabel={bundleLabel} />;
}

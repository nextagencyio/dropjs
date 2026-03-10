import { notFound } from 'next/navigation';
import { loadEntity } from '@/lib/server/data';
import { NodeEditForm } from './node-edit-form';

export default async function NodeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nid = parseInt(id, 10);

  const entity = await loadEntity('node', nid);
  if (!entity) notFound();

  const bundle = entity.type as string;
  const bundleLabel = bundle.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return <NodeEditForm id={nid} bundle={bundle} bundleLabel={bundleLabel} />;
}

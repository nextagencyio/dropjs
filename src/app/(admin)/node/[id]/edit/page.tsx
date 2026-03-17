import { notFound } from 'next/navigation';
import { loadEntity } from '@/lib/server/data';
import { getSessionUser } from '@/lib/server/auth';
import { userHasPermission } from '../../../../../auth/access';
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

  const user = await getSessionUser();
  const isAdmin = user ? await userHasPermission(user, 'administer nodes') : false;

  return <NodeEditForm id={nid} bundle={bundle} bundleLabel={bundleLabel} isAdmin={isAdmin} />;
}

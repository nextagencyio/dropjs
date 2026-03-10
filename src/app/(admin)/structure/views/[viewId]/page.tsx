import { notFound } from 'next/navigation';
import { getView } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import ViewEditClient from './_components/view-edit-client';

export default async function ViewEditPage({
  params,
}: {
  params: Promise<{ viewId: string }>;
}) {
  await requirePermission('administer views');
  const { viewId } = await params;
  const view = await getView(viewId);
  if (!view) notFound();

  return <ViewEditClient view={view} />;
}

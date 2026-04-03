import { requireAuth } from '@/lib/server/auth';
import { getEntityType, getViewDisplay, getViewModes } from '@/lib/server/data';
import { notFound } from 'next/navigation';
import ManageDisplayClient from './manage-display-client';

export default async function ManageDisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();

  const { entityType, bundle } = await params;
  const sp = await searchParams;
  const mode = typeof sp.mode === 'string' ? sp.mode : 'default';

  const entityTypeDef = await getEntityType(entityType, bundle);
  if (!entityTypeDef) notFound();

  const [viewDisplay, viewModes] = await Promise.all([
    getViewDisplay(entityType, bundle, mode),
    getViewModes(entityType),
  ]);

  return (
    <ManageDisplayClient
      entityType={entityType}
      bundle={bundle}
      label={entityTypeDef.label}
      currentMode={mode}
      viewModes={viewModes}
      viewDisplay={viewDisplay}
      fieldDefinitions={entityTypeDef.fields}
    />
  );
}

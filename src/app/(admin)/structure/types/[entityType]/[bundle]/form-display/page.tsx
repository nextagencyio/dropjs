import { requireAuth } from '@/lib/server/auth';
import { getEntityType, getFormDisplay } from '@/lib/server/data';
import { notFound } from 'next/navigation';
import ManageFormDisplayClient from './manage-form-display-client';

export default async function ManageFormDisplayPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
}) {
  await requireAuth();

  const { entityType, bundle } = await params;
  const entityTypeDef = await getEntityType(entityType, bundle);
  if (!entityTypeDef) notFound();

  const formDisplay = await getFormDisplay(entityType, bundle, 'default');

  return (
    <ManageFormDisplayClient
      entityType={entityType}
      bundle={bundle}
      label={entityTypeDef.label}
      formDisplay={formDisplay}
      fieldDefinitions={entityTypeDef.fields}
    />
  );
}

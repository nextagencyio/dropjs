import { notFound } from 'next/navigation';
import { getEntityType } from '@/lib/server/data';
import { EditFieldForm } from './edit-field-form';

export default async function EditFieldPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string; fieldName: string }>;
}) {
  const { entityType, bundle, fieldName } = await params;

  const typeDef = await getEntityType(entityType, bundle);
  if (!typeDef) notFound();

  const fieldDef = typeDef.fields[fieldName];
  if (!fieldDef) notFound();

  return (
    <EditFieldForm
      entityType={entityType}
      bundle={bundle}
      fieldName={fieldName}
      fieldDef={fieldDef}
    />
  );
}

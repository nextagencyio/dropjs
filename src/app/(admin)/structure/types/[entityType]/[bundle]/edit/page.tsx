import { notFound } from 'next/navigation';
import { getEntityType } from '@/lib/server/data';
import { ContentTypeEditForm } from './content-type-edit-form';

export default async function ContentTypeEditPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
}) {
  const { entityType, bundle } = await params;

  const typeDef = await getEntityType(entityType, bundle);
  if (!typeDef) notFound();

  const initialData = {
    label: typeDef.label,
    bundle: typeDef.bundle,
    description: typeDef.description || '',
  };

  return (
    <ContentTypeEditForm
      entityType={entityType}
      bundle={bundle}
      initialData={initialData}
    />
  );
}

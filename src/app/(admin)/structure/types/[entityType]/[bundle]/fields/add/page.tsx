import { notFound } from 'next/navigation';
import { getEntityType } from '@/lib/server/data';
import { AddFieldForm } from './add-field-form';

export default async function AddFieldPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
}) {
  const { entityType, bundle } = await params;

  const typeDef = await getEntityType(entityType, bundle);
  if (!typeDef) notFound();

  return <AddFieldForm entityType={entityType} bundle={bundle} />;
}

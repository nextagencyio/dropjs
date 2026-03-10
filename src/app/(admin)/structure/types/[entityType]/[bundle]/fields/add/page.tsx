import { notFound } from 'next/navigation';
import { getEntityType, getEntityTypes, getVocabularies } from '@/lib/server/data';
import { AddFieldForm } from './add-field-form';

export default async function AddFieldPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
}) {
  const { entityType, bundle } = await params;

  const [typeDef, allTypes, vocabs] = await Promise.all([
    getEntityType(entityType, bundle),
    getEntityTypes(),
    getVocabularies(),
  ]);
  if (!typeDef) notFound();

  const nodeTypes = allTypes
    .filter((t) => t.entity_type === 'node')
    .map((t) => ({ value: t.bundle, label: t.label }));
  const vocabularies = vocabs.map((v) => ({ value: v.bundle, label: v.label }));

  return (
    <AddFieldForm
      entityType={entityType}
      bundle={bundle}
      nodeTypes={nodeTypes}
      vocabularies={vocabularies}
    />
  );
}

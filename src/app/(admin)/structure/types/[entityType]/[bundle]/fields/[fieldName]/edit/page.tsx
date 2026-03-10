import { notFound } from 'next/navigation';
import { getEntityType, getEntityTypes, getVocabularies } from '@/lib/server/data';
import { EditFieldForm } from './edit-field-form';

export default async function EditFieldPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string; fieldName: string }>;
}) {
  const { entityType, bundle, fieldName } = await params;

  const [typeDef, allTypes, vocabs] = await Promise.all([
    getEntityType(entityType, bundle),
    getEntityTypes(),
    getVocabularies(),
  ]);
  if (!typeDef) notFound();

  const fieldDef = typeDef.fields[fieldName];
  if (!fieldDef) notFound();

  const nodeTypes = allTypes
    .filter((t) => t.entity_type === 'node')
    .map((t) => ({ value: t.bundle, label: t.label }));
  const vocabularies = vocabs.map((v) => ({ value: v.bundle, label: v.label }));

  return (
    <EditFieldForm
      entityType={entityType}
      bundle={bundle}
      fieldName={fieldName}
      fieldDef={fieldDef}
      nodeTypes={nodeTypes}
      vocabularies={vocabularies}
    />
  );
}

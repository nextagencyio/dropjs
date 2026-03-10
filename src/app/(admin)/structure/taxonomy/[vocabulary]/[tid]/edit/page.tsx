import { notFound } from 'next/navigation';
import { getEntityType, loadEntity } from '@/lib/server/data';
import { TermEditForm } from './term-edit-form';

export default async function TaxonomyTermEditPage({
  params,
}: {
  params: Promise<{ vocabulary: string; tid: string }>;
}) {
  const { vocabulary, tid } = await params;
  const termId = parseInt(tid, 10);

  const vocabDef = await getEntityType('taxonomy_term', vocabulary);
  const vocabLabel = vocabDef?.label ?? vocabulary;

  const entity = await loadEntity('taxonomy_term', termId);
  if (!entity) notFound();

  const initialData = {
    title: (entity.title as string) ?? '',
    description: (entity.description__value as string) ?? '',
    weight: (entity.weight as number) ?? 0,
    parent: (entity.parent as number) ?? 0,
    published: Boolean(entity.status),
  };

  return (
    <TermEditForm
      vocabulary={vocabulary}
      vocabLabel={vocabLabel}
      tid={termId}
      initialData={initialData}
    />
  );
}

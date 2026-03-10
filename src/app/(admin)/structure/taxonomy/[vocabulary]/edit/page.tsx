import { notFound } from 'next/navigation';
import { getEntityType } from '@/lib/server/data';
import { VocabularyEditForm } from './vocabulary-edit-form';

export default async function TaxonomyVocabularyEditPage({
  params,
}: {
  params: Promise<{ vocabulary: string }>;
}) {
  const { vocabulary } = await params;

  const vocabDef = await getEntityType('taxonomy_term', vocabulary);
  if (!vocabDef) notFound();

  const initialData = {
    label: vocabDef.label,
    bundle: vocabDef.bundle,
    description: vocabDef.description || '',
  };

  return <VocabularyEditForm vocabulary={vocabulary} initialData={initialData} />;
}

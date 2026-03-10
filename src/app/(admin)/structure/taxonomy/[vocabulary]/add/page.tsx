import { getEntityType } from '@/lib/server/data';
import { TermAddForm } from './term-add-form';

export default async function TaxonomyTermAddPage({
  params,
}: {
  params: Promise<{ vocabulary: string }>;
}) {
  const { vocabulary } = await params;

  const vocabDef = await getEntityType('taxonomy_term', vocabulary);
  const vocabLabel = vocabDef?.label ?? vocabulary;

  return <TermAddForm vocabulary={vocabulary} vocabLabel={vocabLabel} />;
}

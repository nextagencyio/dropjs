import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/server/auth';
import { loadEntity, getTranslationStatusForEntity, getEnabledLanguagesList } from '@/lib/server/data';
import TranslationsClient from './translations-client';

export default async function TranslationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const nid = parseInt(id, 10);

  const entity = await loadEntity('node', nid);
  if (!entity) notFound();

  const [translationStatus, enabledLanguages] = await Promise.all([
    getTranslationStatusForEntity('node', nid),
    getEnabledLanguagesList(),
  ]);

  const bundle = entity.type as string;
  const bundleLabel = bundle.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <TranslationsClient
      entityType="node"
      id={nid}
      title={entity.title as string}
      bundle={bundle}
      bundleLabel={bundleLabel}
      translationStatus={translationStatus}
      enabledLanguages={enabledLanguages}
    />
  );
}

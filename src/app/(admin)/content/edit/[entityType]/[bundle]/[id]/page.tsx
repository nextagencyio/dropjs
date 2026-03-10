import { ContentFormPage } from '@/components/content-form';

export default async function ContentEditPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string; id: string }>;
}) {
  const { entityType, bundle, id } = await params;
  return <ContentFormPage />;
}

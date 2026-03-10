import { ContentFormPage } from '@/components/content-form';

export default async function ContentAddPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
}) {
  const { entityType, bundle } = await params;
  return <ContentFormPage />;
}

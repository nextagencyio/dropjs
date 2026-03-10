import { PreviewContent } from './preview-content';

export default async function ContentPreviewPage({
  params,
}: {
  params: Promise<{ previewId: string }>;
}) {
  const { previewId } = await params;

  return <PreviewContent previewId={previewId} />;
}

import { requirePermission } from '@/lib/server/auth';
import { getMediaList } from '@/lib/server/data';
import { MediaLibraryClient } from './_components/media-client';

export default async function MediaLibraryPage() {
  await requirePermission('upload files');

  const result = await getMediaList({ page: 1, limit: 24 });

  return (
    <MediaLibraryClient
      initialFiles={result.data}
      initialMeta={result.meta}
    />
  );
}

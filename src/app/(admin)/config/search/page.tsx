import { requireAuth } from '@/lib/server/auth';
import { getSearchStatus } from '@/lib/server/data';
import SearchConfigClient from './search-config-client';

export default async function SearchConfigPage() {
  await requireAuth();
  const status = await getSearchStatus();

  return (
    <SearchConfigClient
      backend={status.backend}
      available={status.available}
      indexedCount={status.indexedCount}
    />
  );
}

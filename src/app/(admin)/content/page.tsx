import { getEntityTypes, listEntities, type EntityData } from '@/lib/server/data';
import { requireAuth } from '@/lib/server/auth';
import ContentListClient, { type ContentEntity } from './_components/content-list-client';

export default async function ContentListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();

  const params = await searchParams;
  const typeFilter = (typeof params.type === 'string' ? params.type : '') ?? '';
  const statusFilter = (typeof params.status === 'string' ? params.status : '') ?? '';
  const search = (typeof params.search === 'string' ? params.search : '') ?? '';
  const offset = parseInt(typeof params.offset === 'string' ? params.offset : '0', 10) || 0;
  const limit = 50;

  const allTypes = await getEntityTypes();
  const nodeTypes = allTypes.filter((t) => t.entity_type === 'node');

  const typesToFetch = typeFilter
    ? nodeTypes.filter((t) => t.bundle === typeFilter)
    : nodeTypes;

  let allData: ContentEntity[] = [];
  let allTotal = 0;

  for (const t of typesToFetch) {
    const filters: Record<string, string> = {};
    if (statusFilter === '1') filters.status = '1';
    if (statusFilter === '0') filters.status = '0';

    const res = await listEntities(t.entity_type, t.bundle, {
      offset: typesToFetch.length === 1 ? offset : 0,
      limit: typesToFetch.length === 1 ? limit : 100,
      sort: '-changed',
      filters,
      search: search || undefined,
    });

    allData = allData.concat(
      res.data.map((d: EntityData) => ({
        ...d,
        _entityType: t.entity_type,
        _bundle: t.bundle,
        _label: t.label,
      })),
    );
    allTotal += res.meta.total;
  }

  // Sort all results by changed date descending
  allData.sort((a, b) => {
    const aDate = a.changed ? new Date(a.changed as string).getTime() : 0;
    const bDate = b.changed ? new Date(b.changed as string).getTime() : 0;
    return bDate - aDate;
  });

  // Paginate if fetching across multiple types
  const entities = typesToFetch.length > 1
    ? allData.slice(offset, offset + limit)
    : allData;

  return (
    <ContentListClient
      types={allTypes}
      entities={entities}
      total={allTotal}
      searchParams={{
        type: typeFilter,
        status: statusFilter,
        search,
        offset,
      }}
    />
  );
}

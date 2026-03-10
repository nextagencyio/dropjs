import { getBlockPlacement, getBlocks, getRegions } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import BlockEditClient, { type BlockPlacementData } from './_components/block-edit-client';

const DEFAULT_REGIONS = [
  { id: 'header', label: 'Header' },
  { id: 'pre_content', label: 'Pre-content' },
  { id: 'highlighted', label: 'Highlighted' },
  { id: 'help', label: 'Help' },
  { id: 'content', label: 'Content' },
  { id: 'sidebar_first', label: 'Sidebar first' },
  { id: 'sidebar_second', label: 'Sidebar second' },
  { id: 'footer', label: 'Footer' },
];

function toClientPlacement(p: NonNullable<Awaited<ReturnType<typeof getBlockPlacement>>>): BlockPlacementData {
  // Map server-side camelCase to client snake_case format
  const visibility: BlockPlacementData['visibility'] = {};
  if (Array.isArray(p.visibility)) {
    for (const cond of p.visibility) {
      if (cond.type === 'path') {
        visibility.paths = cond.value;
        visibility.paths_negate = cond.negate ?? false;
      } else if (cond.type === 'role') {
        visibility.roles = cond.value;
        visibility.roles_negate = cond.negate ?? false;
      }
    }
  }
  return {
    id: p.id,
    block_id: p.blockId,
    region: p.region,
    weight: p.weight,
    status: p.status,
    theme: p.theme,
    settings: p.settings,
    visibility,
  };
}

export default async function BlockEditPage({
  params,
}: {
  params: Promise<{ placementId: string }>;
}) {
  await requirePermission('administer blocks');
  const { placementId } = await params;
  const isNew = placementId === 'add';

  const [blocks, regions, rawPlacement] = await Promise.all([
    getBlocks(),
    getRegions().catch(() => DEFAULT_REGIONS),
    isNew ? Promise.resolve(null) : getBlockPlacement(placementId),
  ]);

  const effectiveRegions = regions.length > 0 ? regions : DEFAULT_REGIONS;
  const placement = rawPlacement ? toClientPlacement(rawPlacement) : null;

  return (
    <BlockEditClient
      placement={placement}
      blocks={blocks}
      regions={effectiveRegions}
      isNew={isNew}
      placementId={placementId}
    />
  );
}

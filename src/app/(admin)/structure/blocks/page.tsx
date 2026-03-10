import Link from 'next/link';
import { getBlockPlacements } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteBlockButton, ToggleBlockStatusButton } from './_components/blocks-client';
import type { BlockPlacement } from '@/lib/server/data';

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

export default async function BlockListPage() {
  await requirePermission('administer blocks');
  const placements = await getBlockPlacements();

  // Group placements by region
  const placementsByRegion: Record<string, BlockPlacement[]> = {};
  for (const region of DEFAULT_REGIONS) {
    placementsByRegion[region.id] = [];
  }
  for (const placement of placements) {
    if (!placementsByRegion[placement.region]) {
      placementsByRegion[placement.region] = [];
    }
    placementsByRegion[placement.region].push(placement);
  }
  // Sort each region's placements by weight
  for (const regionId of Object.keys(placementsByRegion)) {
    placementsByRegion[regionId].sort((a, b) => a.weight - b.weight);
  }

  // Build regions list: default regions + any extra regions from placements
  const allRegions = [...DEFAULT_REGIONS];
  for (const regionId of Object.keys(placementsByRegion)) {
    if (!allRegions.find((r) => r.id === regionId)) {
      allRegions.push({ id: regionId, label: regionId });
    }
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link
          href="/structure"
          className="text-gin-primary hover:underline text-sm"
        >
          Structure
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Block layout</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Block layout</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage block placements across page regions.
          </p>
        </div>
        <Link
          href="/structure/blocks/add"
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          Add block placement
        </Link>
      </div>

      {allRegions.map((region) => (
        <div key={region.id} className="mb-6">
          <h2 className="text-base font-semibold text-gin-title mb-2">{region.label}</h2>
          <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Block</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Region</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Theme</th>
                  <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Weight</th>
                  <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
                </tr>
              </thead>
              <tbody>
                {(placementsByRegion[region.id] || []).map((placement) => (
                  <tr key={placement.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border font-medium">
                      {(placement as any).label || placement.blockId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{placement.region}</td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{placement.theme}</td>
                    <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">{placement.weight}</td>
                    <td className="px-4 py-3 text-sm text-center border-t border-gin-border">
                      <ToggleBlockStatusButton
                        placementId={placement.id}
                        status={!!placement.status}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-right border-t border-gin-border space-x-3">
                      <Link
                        href={`/structure/blocks/${placement.id}`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteBlockButton
                        placementId={placement.id}
                        label={(placement as any).label}
                      />
                    </td>
                  </tr>
                ))}
                {(!placementsByRegion[region.id] || placementsByRegion[region.id].length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gin-text-light border-t border-gin-border">
                      No blocks in this region.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

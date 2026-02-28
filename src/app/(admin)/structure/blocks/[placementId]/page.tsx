'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  fetchBlockPlacement,
  createBlockPlacement,
  updateBlockPlacement,
  fetchBlocks,
  fetchRegions,
  type BlockDefinition,
  type RegionDefinition,
} from '@/lib/api-system';

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

export default function BlockEditPage() {
  const params = useParams<{ placementId: string }>();
  const router = useRouter();
  const placementId = params.placementId;
  const isNew = placementId === 'add';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
  const [regions, setRegions] = useState<RegionDefinition[]>([]);

  // Form state
  const [formId, setFormId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [region, setRegion] = useState('content');
  const [weight, setWeight] = useState(0);
  const [theme, setTheme] = useState('claro');
  const [status, setStatus] = useState(true);
  const [pathConditions, setPathConditions] = useState('');
  const [pathNegate, setPathNegate] = useState(false);
  const [roleConditions, setRoleConditions] = useState('');
  const [roleNegate, setRoleNegate] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [blocksData, regionsData] = await Promise.all([
          fetchBlocks(),
          fetchRegions().catch(() => [] as RegionDefinition[]),
        ]);
        setBlocks(blocksData);
        if (regionsData.length > 0) {
          setRegions(regionsData);
        } else {
          setRegions(DEFAULT_REGIONS);
        }

        if (!isNew && placementId) {
          const placement = await fetchBlockPlacement(placementId);
          setFormId(placement.id);
          setBlockId(placement.block_id);
          setRegion(placement.region);
          setWeight(placement.weight);
          setTheme(placement.theme || 'claro');
          setStatus(placement.status);
          if (placement.visibility) {
            if (placement.visibility.paths) {
              setPathConditions(placement.visibility.paths.join('\n'));
            }
            setPathNegate(placement.visibility.paths_negate || false);
            if (placement.visibility.roles) {
              setRoleConditions(placement.visibility.roles.join('\n'));
            }
            setRoleNegate(placement.visibility.roles_negate || false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
      setLoading(false);
    };
    loadData();
  }, [placementId, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const paths = pathConditions
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const roles = roleConditions
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const visibility: Record<string, unknown> = {};
    if (paths.length > 0) {
      visibility.paths = paths;
      visibility.paths_negate = pathNegate;
    }
    if (roles.length > 0) {
      visibility.roles = roles;
      visibility.roles_negate = roleNegate;
    }

    const payload = {
      id: formId || placementId || '',
      block_id: blockId,
      region,
      weight,
      status,
      theme,
      settings: {},
      visibility,
    };

    try {
      if (isNew) {
        await createBlockPlacement(payload);
      } else if (placementId) {
        await updateBlockPlacement(placementId, payload);
      }
      router.push('/structure/blocks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save block placement');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <div className="mb-5">
          <div className="h-4 w-48 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
        </div>
        <div className="h-8 w-56 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
        <div className="bg-white border border-gin-border rounded-gin p-6 max-w-2xl">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-24 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-2" />
                <div className="h-9 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure/blocks" className="text-gin-primary hover:underline text-sm">
          Block layout
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">
          {isNew ? 'Add block placement' : 'Edit block placement'}
        </span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">
        {isNew ? 'Add block placement' : 'Edit block placement'}
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gin-border rounded-gin p-6 max-w-2xl">
        {isNew && (
          <div className="mb-4">
            <label htmlFor="placement-id" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Machine name
            </label>
            <input
              id="placement-id"
              type="text"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className="w-full"
              placeholder="sidebar_search"
              pattern="^[a-z][a-z0-9_]*$"
              required
            />
            <p className="text-[12px] text-gin-text-light mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="block-id" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Block
          </label>
          <select
            id="block-id"
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            className="w-full"
            required
          >
            <option value="">-- Select a block --</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="region" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Region
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full"
            required
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="weight" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Weight
          </label>
          <input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(parseInt(e.target.value, 10) || 0)}
            className="w-full"
          />
          <p className="text-[12px] text-gin-text-light mt-1">Lower weight items appear first within the region.</p>
        </div>

        <div className="mb-4">
          <label htmlFor="theme" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Theme
          </label>
          <input
            id="theme"
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-gin-text cursor-pointer">
            <input
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
              className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
            />
            Enabled
          </label>
        </div>

        <div className="border-t border-gin-border pt-4 mt-6 mb-4">
          <h2 className="text-base font-semibold text-gin-title mb-4">Visibility conditions</h2>

          <div className="mb-4">
            <label htmlFor="path-conditions" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Pages
            </label>
            <textarea
              id="path-conditions"
              value={pathConditions}
              onChange={(e) => setPathConditions(e.target.value)}
              className="w-full"
              rows={4}
              placeholder={'/about\n/contact\n/blog/*'}
            />
            <p className="text-[12px] text-gin-text-light mt-1">Specify pages by their paths, one per line. Use * as a wildcard.</p>
            <label className="flex items-center gap-2 text-sm text-gin-text mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pathNegate}
                onChange={(e) => setPathNegate(e.target.checked)}
                className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              Negate (hide on listed pages instead of showing)
            </label>
          </div>

          <div className="mb-4">
            <label htmlFor="role-conditions" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Roles
            </label>
            <textarea
              id="role-conditions"
              value={roleConditions}
              onChange={(e) => setRoleConditions(e.target.value)}
              className="w-full"
              rows={3}
              placeholder={'authenticated\nadministrator'}
            />
            <p className="text-[12px] text-gin-text-light mt-1">Specify roles, one per line. Block is visible only to users with these roles.</p>
            <label className="flex items-center gap-2 text-sm text-gin-text mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={roleNegate}
                onChange={(e) => setRoleNegate(e.target.checked)}
                className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              Negate (hide from listed roles instead of showing)
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isNew ? 'Create block placement' : 'Save block placement'}
          </button>
          <Link
            href="/structure/blocks"
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

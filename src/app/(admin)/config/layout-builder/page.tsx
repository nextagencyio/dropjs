'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { fetchEntityTypes, type EntityTypeDefinition } from '@/lib/api-entities';

// Types

interface LayoutRegion {
  id: string;
  label: string;
}

interface LayoutTypeDefinition {
  id: string;
  label: string;
  description: string;
  regions: LayoutRegion[];
}

interface LayoutComponent {
  id: string;
  type: string;
  region: string;
  weight: number;
  configuration: Record<string, unknown>;
}

interface LayoutSection {
  id: string;
  type: string;
  weight: number;
  settings: Record<string, unknown>;
  components: LayoutComponent[];
}

interface LayoutData {
  entityType: string;
  bundle: string;
  viewMode: string;
  sections: LayoutSection[];
}

// API Functions

async function fetchLayoutTypes(): Promise<LayoutTypeDefinition[]> {
  const res = await apiFetch<{ data: LayoutTypeDefinition[] }>('/layout-types');
  return res.data;
}

async function fetchLayout(
  entityType: string,
  bundle: string,
  viewMode: string,
): Promise<LayoutData | null> {
  try {
    const res = await apiFetch<{ data: LayoutData }>(
      `/layout/${entityType}/${bundle}/${viewMode}`,
    );
    return res.data;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

async function apiAddSection(
  entityType: string,
  bundle: string,
  viewMode: string,
  body: { type: string; weight: number },
): Promise<LayoutData> {
  const res = await apiFetch<{ data: LayoutData }>(
    `/layout/${entityType}/${bundle}/${viewMode}/sections`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return res.data;
}

async function apiRemoveSection(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
): Promise<LayoutData> {
  const res = await apiFetch<{ data: LayoutData }>(
    `/layout/${entityType}/${bundle}/${viewMode}/sections/${sectionId}`,
    { method: 'DELETE' },
  );
  return res.data;
}

async function apiAddComponent(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
  body: { type: string; region: string; weight: number },
): Promise<LayoutData> {
  const res = await apiFetch<{ data: LayoutData }>(
    `/layout/${entityType}/${bundle}/${viewMode}/sections/${sectionId}/components`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return res.data;
}

async function apiRemoveComponent(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
  componentId: string,
): Promise<LayoutData> {
  const res = await apiFetch<{ data: LayoutData }>(
    `/layout/${entityType}/${bundle}/${viewMode}/sections/${sectionId}/components/${componentId}`,
    { method: 'DELETE' },
  );
  return res.data;
}

// Column width helpers

function getColumnWidths(layoutTypeId: string): Record<string, string> {
  switch (layoutTypeId) {
    case 'one_column':
      return { content: 'w-full' };
    case 'two_column':
      return { first: 'w-1/2', second: 'w-1/2' };
    case 'three_column':
      return { first: 'w-1/3', second: 'w-1/3', third: 'w-1/3' };
    case 'two_column_33_67':
      return { first: 'w-1/3', second: 'w-2/3' };
    case 'two_column_67_33':
      return { first: 'w-2/3', second: 'w-1/3' };
    default:
      return {};
  }
}

const VIEW_MODES = [
  { id: 'default', label: 'Default' },
  { id: 'full', label: 'Full' },
  { id: 'teaser', label: 'Teaser' },
];

export default function LayoutBuilderPage() {
  const [entityTypes, setEntityTypes] = useState<EntityTypeDefinition[]>([]);
  const [layoutTypes, setLayoutTypes] = useState<LayoutTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selection state
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [selectedBundle, setSelectedBundle] = useState('');
  const [selectedViewMode, setSelectedViewMode] = useState('default');

  // Layout state
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(false);

  // Add section dialog
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState('');
  const [newSectionWeight, setNewSectionWeight] = useState(0);

  // Add component dialog
  const [addComponentTarget, setAddComponentTarget] = useState<{
    sectionId: string;
    region: string;
  } | null>(null);
  const [newComponentType, setNewComponentType] = useState('block');
  const [newComponentWeight, setNewComponentWeight] = useState(0);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [types, ltypes] = await Promise.all([
          fetchEntityTypes(),
          fetchLayoutTypes(),
        ]);
        setEntityTypes(types);
        setLayoutTypes(ltypes);
        if (ltypes.length > 0) {
          setNewSectionType(ltypes[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Get available bundles for selected entity type
  const availableBundles = entityTypes.filter(
    (et) => et.entity_type === selectedEntityType,
  );

  // Load layout when selection changes
  const loadLayout = useCallback(async () => {
    if (!selectedEntityType || !selectedBundle || !selectedViewMode) {
      setLayout(null);
      return;
    }
    setLayoutLoading(true);
    setError('');
    try {
      const data = await fetchLayout(
        selectedEntityType,
        selectedBundle,
        selectedViewMode,
      );
      setLayout(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layout');
      setLayout(null);
    }
    setLayoutLoading(false);
  }, [selectedEntityType, selectedBundle, selectedViewMode]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // Reset bundle when entity type changes
  const handleEntityTypeChange = (value: string) => {
    setSelectedEntityType(value);
    setSelectedBundle('');
    setLayout(null);
  };

  // Get unique entity type names
  const uniqueEntityTypes = Array.from(
    new Set(entityTypes.map((et) => et.entity_type)),
  );

  // Handlers

  const handleAddSection = async () => {
    if (!selectedEntityType || !selectedBundle || !newSectionType) return;
    setError('');
    setSuccess('');
    try {
      const result = await apiAddSection(
        selectedEntityType,
        selectedBundle,
        selectedViewMode,
        { type: newSectionType, weight: newSectionWeight },
      );
      setLayout(result);
      setShowAddSection(false);
      setNewSectionWeight(0);
      setSuccess('Section added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add section');
    }
  };

  const handleRemoveSection = async (sectionId: string) => {
    if (!confirm('Remove this section and all its components?')) return;
    setError('');
    setSuccess('');
    try {
      const result = await apiRemoveSection(
        selectedEntityType,
        selectedBundle,
        selectedViewMode,
        sectionId,
      );
      setLayout(result);
      setSuccess('Section removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove section');
    }
  };

  const handleAddComponent = async () => {
    if (!addComponentTarget || !selectedEntityType || !selectedBundle) return;
    setError('');
    setSuccess('');
    try {
      const result = await apiAddComponent(
        selectedEntityType,
        selectedBundle,
        selectedViewMode,
        addComponentTarget.sectionId,
        {
          type: newComponentType,
          region: addComponentTarget.region,
          weight: newComponentWeight,
        },
      );
      setLayout(result);
      setAddComponentTarget(null);
      setNewComponentType('block');
      setNewComponentWeight(0);
      setSuccess('Component added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component');
    }
  };

  const handleRemoveComponent = async (
    sectionId: string,
    componentId: string,
  ) => {
    if (!confirm('Remove this component?')) return;
    setError('');
    setSuccess('');
    try {
      const result = await apiRemoveComponent(
        selectedEntityType,
        selectedBundle,
        selectedViewMode,
        sectionId,
        componentId,
      );
      setLayout(result);
      setSuccess('Component removed.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove component',
      );
    }
  };

  const getLayoutTypeDef = (id: string): LayoutTypeDefinition | undefined =>
    layoutTypes.find((lt) => lt.id === id);

  if (loading) {
    return (
      <div className="bg-white rounded-gin border border-gin-border p-8 text-center text-gin-text-light">
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5">
        <Link
          href="/config"
          className="text-sm text-gin-primary hover:underline"
        >
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Layout Builder</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Layout Builder</h1>
        <p className="text-gin-text-light text-sm mt-1">
          Configure page layouts for entity type view modes using sections and
          components.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s text-sm">
          {success}
        </div>
      )}

      {/* Selection bar */}
      <div className="bg-white rounded-gin-l border border-gin-border p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label
              htmlFor="entity-type-select"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Entity type
            </label>
            <select
              id="entity-type-select"
              value={selectedEntityType}
              onChange={(e) => handleEntityTypeChange(e.target.value)}
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
            >
              <option value="">-- Select --</option>
              {uniqueEntityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label
              htmlFor="bundle-select"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Bundle
            </label>
            <select
              id="bundle-select"
              value={selectedBundle}
              onChange={(e) => setSelectedBundle(e.target.value)}
              disabled={!selectedEntityType}
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary disabled:bg-gin-bg-layer2 disabled:text-gin-text-light"
            >
              <option value="">-- Select --</option>
              {availableBundles.map((b) => (
                <option key={b.bundle} value={b.bundle}>
                  {b.label} ({b.bundle})
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label
              htmlFor="viewmode-select"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              View mode
            </label>
            <select
              id="viewmode-select"
              value={selectedViewMode}
              onChange={(e) => setSelectedViewMode(e.target.value)}
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
            >
              {VIEW_MODES.map((vm) => (
                <option key={vm.id} value={vm.id}>
                  {vm.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Layout area */}
      {layoutLoading ? (
        <div className="bg-white rounded-gin border border-gin-border p-8 text-center text-gin-text-light">
          Loading layout...
        </div>
      ) : selectedEntityType && selectedBundle ? (
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gin-title">
              Layout: {selectedEntityType} / {selectedBundle} /{' '}
              {selectedViewMode}
            </h2>
            <button
              onClick={() => setShowAddSection(true)}
              className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors"
            >
              Add section
            </button>
          </div>

          {/* Add section dialog */}
          {showAddSection && (
            <div className="bg-white rounded-gin-l border border-gin-primary p-5 mb-4">
              <h3 className="text-sm font-semibold text-gin-title mb-3">
                Add a new section
              </h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="min-w-[200px]">
                  <label
                    htmlFor="section-type-select"
                    className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
                  >
                    Layout type
                  </label>
                  <select
                    id="section-type-select"
                    value={newSectionType}
                    onChange={(e) => setNewSectionType(e.target.value)}
                    className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
                  >
                    {layoutTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.label} -- {lt.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label
                    htmlFor="section-weight"
                    className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
                  >
                    Weight
                  </label>
                  <input
                    id="section-weight"
                    type="number"
                    value={newSectionWeight}
                    onChange={(e) =>
                      setNewSectionWeight(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSection}
                    className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddSection(false)}
                    className="px-4 py-2 bg-white border border-gin-border text-gin-text text-sm font-medium rounded-gin-s hover:bg-gin-bg-layer2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add component dialog */}
          {addComponentTarget && (
            <div className="bg-white rounded-gin-l border border-gin-green p-5 mb-4">
              <h3 className="text-sm font-semibold text-gin-title mb-3">
                Add component to region &quot;{addComponentTarget.region}&quot;
              </h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="min-w-[160px]">
                  <label
                    htmlFor="component-type"
                    className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
                  >
                    Component type
                  </label>
                  <select
                    id="component-type"
                    value={newComponentType}
                    onChange={(e) => setNewComponentType(e.target.value)}
                    className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
                  >
                    <option value="block">Block</option>
                    <option value="inline">Inline</option>
                  </select>
                </div>
                <div className="w-24">
                  <label
                    htmlFor="component-weight"
                    className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
                  >
                    Weight
                  </label>
                  <input
                    id="component-weight"
                    type="number"
                    value={newComponentWeight}
                    onChange={(e) =>
                      setNewComponentWeight(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddComponent}
                    className="px-4 py-2 bg-gin-green text-white text-sm font-medium rounded-gin-s hover:opacity-90 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddComponentTarget(null)}
                    className="px-4 py-2 bg-white border border-gin-border text-gin-text text-sm font-medium rounded-gin-s hover:bg-gin-bg-layer2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sections list */}
          {!layout || layout.sections.length === 0 ? (
            <div className="bg-white rounded-gin border border-gin-border p-8 text-center py-12 text-gin-text-light">
              No sections in this layout. Click &quot;Add section&quot; to get
              started.
            </div>
          ) : (
            <div className="space-y-4">
              {layout.sections
                .slice()
                .sort((a, b) => a.weight - b.weight)
                .map((section) => {
                  const ltDef = getLayoutTypeDef(section.type);
                  const regions = ltDef?.regions ?? [];
                  const colWidths = getColumnWidths(section.type);

                  return (
                    <div
                      key={section.id}
                      className="bg-white rounded-gin-l border border-gin-border overflow-hidden"
                    >
                      {/* Section header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gin-bg-layer2 border-b border-gin-border">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gin-title">
                            {ltDef?.label ?? section.type}
                          </span>
                          <span className="text-xs text-gin-text-light">
                            ID: {section.id.substring(0, 8)}...
                          </span>
                          <span className="text-xs bg-gin-bg-layer2 text-gin-text-light px-2 py-0.5 rounded-gin-s border border-gin-border">
                            weight: {section.weight}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveSection(section.id)}
                          className="text-sm text-gin-danger hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove section
                        </button>
                      </div>

                      {/* Regions rendered as columns */}
                      <div className="flex gap-0 min-h-[120px]">
                        {regions.map((region, idx) => {
                          const regionComponents = section.components
                            .filter((c) => c.region === region.id)
                            .sort((a, b) => a.weight - b.weight);
                          const widthClass =
                            colWidths[region.id] ?? 'flex-1';

                          return (
                            <div
                              key={region.id}
                              className={`${widthClass} p-3 ${idx > 0 ? 'border-l border-gin-border' : ''}`}
                            >
                              {/* Region header */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gin-text-light uppercase tracking-wide">
                                  {region.label}
                                </span>
                                <button
                                  onClick={() =>
                                    setAddComponentTarget({
                                      sectionId: section.id,
                                      region: region.id,
                                    })
                                  }
                                  className="text-xs text-gin-green hover:underline font-medium inline-flex items-center gap-0.5"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add
                                </button>
                              </div>

                              {/* Components in this region */}
                              {regionComponents.length === 0 ? (
                                <div className="border-2 border-dashed border-gin-border rounded-gin p-4 text-center text-xs text-gin-text-light">
                                  Empty region
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {regionComponents.map((comp) => (
                                    <div
                                      key={comp.id}
                                      className="bg-gin-bg-layer2 border border-gin-border rounded-gin p-3 text-sm"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="font-medium text-gin-title">
                                            {comp.type}
                                          </span>
                                          <span className="text-xs text-gin-text-light ml-2">
                                            w:{comp.weight}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleRemoveComponent(
                                              section.id,
                                              comp.id,
                                            )
                                          }
                                          className="text-xs text-gin-danger hover:underline inline-flex items-center gap-0.5"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Remove
                                        </button>
                                      </div>
                                      <div className="text-xs text-gin-text-light mt-1">
                                        {comp.id.substring(0, 8)}...
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-gin border border-gin-border text-center py-12 text-gin-text-light">
          Select an entity type and bundle above to manage its layout.
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { getFieldGroups, getFieldLayout } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteFieldGroupButton, CreateFieldGroupForm } from './_components/field-groups-client';

export default async function FieldGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; bundle?: string; viewMode?: string }>;
}) {
  await requirePermission('administer content types');
  const sp = await searchParams;
  const entityType = sp.entityType ?? '';
  const bundle = sp.bundle ?? '';
  const viewMode = sp.viewMode ?? 'default';

  const [groups, layout] = await Promise.all([
    entityType && bundle ? getFieldGroups(entityType, bundle, viewMode) : Promise.resolve([]),
    entityType && bundle ? getFieldLayout(entityType, bundle, viewMode) : Promise.resolve([]),
  ]);

  // Build parent group lookup
  const groupLookup: Record<string, string> = {};
  for (const group of groups) {
    groupLookup[group.name ?? (group as any).id] = group.label;
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
        <span className="text-sm text-gin-text-light">
          Field groups: {entityType} / {bundle} / {viewMode}
        </span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Field Groups</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage field groups for <strong>{entityType}</strong> &mdash;{' '}
            <strong>{bundle}</strong> ({viewMode} mode).
          </p>
        </div>
        <CreateFieldGroupForm
          entityType={entityType}
          bundle={bundle}
          viewMode={viewMode}
          existingGroups={groups.map((g) => ({
            id: g.name ?? (g as any).id,
            label: g.label,
          }))}
        />
      </div>

      {/* Field groups table */}
      <div className="bg-white border border-gin-border rounded-gin overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Format</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Fields</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Parent</th>
              <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupId = group.name ?? (group as any).id;
              return (
                <tr key={groupId} className="hover:bg-gin-bg-layer2/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <div className="font-medium text-gin-title">{group.label}</div>
                    <div className="text-[12px] text-gin-text-light font-mono">{group.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gin-bg-layer2 text-gin-text-light">
                      {group.format}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">
                    {group.fields ? group.fields.length : 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                    {group.parent ? (groupLookup[group.parent] || group.parent) : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right border-t border-gin-border">
                    <DeleteFieldGroupButton
                      entityType={entityType}
                      bundle={bundle}
                      viewMode={viewMode}
                      groupId={groupId}
                      label={group.label}
                    />
                  </td>
                </tr>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gin-text-light">
                  No field groups configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Field layout preview */}
      {layout.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gin-title mb-3">Field Layout</h2>
          <p className="text-gin-text-light text-sm mb-3">
            Current field arrangement showing group assignments.
          </p>
          <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Group</th>
                  <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Weight</th>
                </tr>
              </thead>
              <tbody>
                {layout.map((item) => (
                  <tr key={item.field_name} className="hover:bg-gin-bg-layer2/50 transition-colors">
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">{item.field_name}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text font-medium border-t border-gin-border">{item.label}</td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                      {item.group ? (groupLookup[item.group] || item.group) : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">{item.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

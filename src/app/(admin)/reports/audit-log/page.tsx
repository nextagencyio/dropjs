import Link from 'next/link';
import { getFilteredAuditEntries } from '@/lib/server/data';

const ACTION_COLORS: Record<string, string> = {
  insert: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border border-blue-200',
  delete: 'bg-red-50 text-red-700 border border-red-200',
};

const ACTION_LABELS: Record<string, string> = {
  insert: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function formatChanges(changes: string | null | undefined): string {
  if (!changes) return '';
  try {
    const parsed = JSON.parse(changes) as Record<string, { old: unknown; new: unknown }>;
    return Object.keys(parsed).join(', ');
  } catch {
    return '';
  }
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const action = typeof params.action === 'string' ? params.action : undefined;
  const entityType = typeof params.entity_type === 'string' ? params.entity_type : undefined;
  const limit = Number(params.limit) || 100;

  const entries = await getFilteredAuditEntries({
    action,
    entity_type: entityType,
    limit,
  });

  // Derive unique entity types and actions from entries for filter dropdowns
  const entityTypes = [...new Set(entries.map((e) => e.entity_type))].sort();

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/reports"
          className="text-sm text-gin-primary hover:underline"
        >
          Reports
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Audit log</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Audit Log
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Track entity changes across the site.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label htmlFor="action" className="block text-xs font-semibold text-gin-text-light mb-1">Action</label>
          <select
            id="action"
            name="action"
            defaultValue={action || ''}
            className="rounded-gin-s border border-gin-border-form bg-white px-3 py-2 text-sm text-gin-text focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none"
          >
            <option value="">All actions</option>
            <option value="insert">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
          </select>
        </div>
        <div>
          <label htmlFor="entity_type" className="block text-xs font-semibold text-gin-text-light mb-1">Entity type</label>
          <select
            id="entity_type"
            name="entity_type"
            defaultValue={entityType || ''}
            className="rounded-gin-s border border-gin-border-form bg-white px-3 py-2 text-sm text-gin-text focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none"
          >
            <option value="">All types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
          >
            Filter
          </button>
          {(action || entityType) && (
            <Link
              href="/reports/audit-log"
              className="px-4 py-2 border border-gin-border text-sm font-medium text-gin-text rounded-gin hover:bg-gin-primary-light transition-colors"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No audit log entries found.
        </div>
      ) : (
        <>
          <div className="text-xs text-gin-text-light mb-2">
            Showing {entries.length} entries
          </div>
          <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-16">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Bundle
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                    Changed Fields
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-16">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-44">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gin-border-table">
                {entries.map((entry) => {
                  const changedFields = formatChanges(entry.changes);
                  return (
                    <tr key={entry.id} className="hover:bg-gin-primary-light transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium ${
                            ACTION_COLORS[entry.action] || 'bg-gray-50 text-gray-600 border border-gray-100'
                          }`}
                        >
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gin-text font-medium">
                        {entry.entity_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gin-text-light">
                        <Link
                          href={`/node/${entry.entity_id}/edit`}
                          className="text-gin-primary hover:underline"
                        >
                          #{entry.entity_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gin-text-light">
                        {entry.bundle || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gin-text-light max-w-xs truncate" title={changedFields}>
                        {changedFields || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gin-text-light">
                        {entry.uid || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gin-text-light whitespace-nowrap">
                        {entry.timestamp ? formatTimestamp(entry.timestamp) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

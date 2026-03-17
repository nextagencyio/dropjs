import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEntity, getNodeRevision } from '@/lib/server/data';
import { RestoreRevisionButton } from '../restore-button';

function formatTimestamp(ts: unknown): string {
  if (!ts) return '-';
  const num = typeof ts === 'number' ? ts : Number(ts);
  if (isNaN(num)) return String(ts);
  // Heuristic: if the number is very large, it's likely milliseconds
  const date = num > 1e12 ? new Date(num) : new Date(num * 1000);
  return date.toLocaleString();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Fields to skip in the diff display (internal/system fields)
const SKIP_FIELDS = new Set([
  'uuid', 'langcode', 'default_langcode', 'revision_translation_affected',
]);

export default async function RevisionDiffPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid: vidStr } = await params;
  const nid = parseInt(id, 10);
  const vid = parseInt(vidStr, 10);

  const [currentEntity, revisionData] = await Promise.all([
    loadEntity('node', nid),
    getNodeRevision(nid, vid),
  ]);

  if (!currentEntity || !revisionData) notFound();

  const title = (currentEntity.title as string) || `Node #${nid}`;
  const currentVid = currentEntity.vid as number;
  const isCurrent = vid === currentVid;

  // Collect all field keys from both versions
  const allKeys = new Set<string>();
  for (const key of Object.keys(currentEntity)) {
    if (!SKIP_FIELDS.has(key)) allKeys.add(key);
  }
  for (const key of Object.keys(revisionData)) {
    if (!SKIP_FIELDS.has(key)) allKeys.add(key);
  }

  // Sort keys: base fields first, then custom fields
  const BASE_FIELD_ORDER = ['nid', 'vid', 'type', 'title', 'status', 'uid', 'created', 'changed', 'promote', 'sticky'];
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    const aIdx = BASE_FIELD_ORDER.indexOf(a);
    const bIdx = BASE_FIELD_ORDER.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/content"
          className="text-sm text-gin-primary hover:underline"
        >
          Content
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link
          href={`/node/${nid}/edit`}
          className="text-sm text-gin-primary hover:underline"
        >
          {title}
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link
          href={`/node/${nid}/revisions`}
          className="text-sm text-gin-primary hover:underline"
        >
          Revisions
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Revision #{vid}</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Revision #{vid}
            {isCurrent && (
              <span className="ml-3 inline-block px-2 py-0.5 rounded-gin-s text-[13px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                current
              </span>
            )}
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Comparing revision #{vid} with current revision #{currentVid}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isCurrent && (
            <RestoreRevisionButton nid={nid} vid={vid} />
          )}
          <Link
            href={`/node/${nid}/revisions`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-primary border border-gin-border rounded-gin hover:bg-gin-primary-light transition-colors"
          >
            Back to revisions
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-40">
                Field
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Revision #{vid}
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Current (#{currentVid})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            {sortedKeys.map((key) => {
              const revVal = formatFieldValue(revisionData[key]);
              const curVal = formatFieldValue(currentEntity[key]);
              const isChanged = revVal !== curVal;

              return (
                <tr
                  key={key}
                  className={`transition-colors ${
                    isChanged
                      ? 'bg-amber-50 hover:bg-amber-100'
                      : 'hover:bg-gin-primary-light'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gin-text align-top">
                    {key}
                    {isChanged && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded-gin-s text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        changed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light align-top">
                    <pre className="whitespace-pre-wrap font-mono text-xs max-w-sm break-words">
                      {revVal}
                    </pre>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light align-top">
                    <pre className="whitespace-pre-wrap font-mono text-xs max-w-sm break-words">
                      {curVal}
                    </pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

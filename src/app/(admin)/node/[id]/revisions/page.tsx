import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEntity, getNodeRevisions } from '@/lib/server/data';
import { RestoreRevisionButton } from './restore-button';

function formatTimestamp(ts: number): string {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}

export default async function NodeRevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nid = parseInt(id, 10);

  const entity = await loadEntity('node', nid);
  if (!entity) notFound();

  const title = (entity.title as string) || `Node #${nid}`;
  const currentVid = entity.vid as number;

  const revisions = await getNodeRevisions(nid);

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
        <span className="text-sm text-gin-text-light">Revisions</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Revisions for &ldquo;{title}&rdquo;
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            {revisions.length} revision{revisions.length !== 1 ? 's' : ''} found.
          </p>
        </div>
        <Link
          href={`/node/${nid}/edit`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-primary border border-gin-border rounded-gin hover:bg-gin-primary-light transition-colors"
        >
          Back to edit
        </Link>
      </div>

      {revisions.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No revisions found.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-20">
                  Revision
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">
                  Author
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-44">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Log Message
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {revisions.map((rev) => {
                const isCurrent = rev.vid === currentVid;
                return (
                  <tr
                    key={rev.vid}
                    className={`hover:bg-gin-primary-light transition-colors ${
                      isCurrent ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gin-text font-medium">
                      #{rev.vid}
                      {isCurrent && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          current
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">
                      {rev.author_name || `User #${rev.revision_uid}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light whitespace-nowrap">
                      {formatTimestamp(rev.revision_timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light max-w-xs truncate" title={rev.revision_log ?? ''}>
                      {rev.revision_log || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/node/${nid}/revisions/${rev.vid}`}
                          className="text-gin-primary hover:underline text-sm"
                        >
                          View
                        </Link>
                        {!isCurrent && (
                          <RestoreRevisionButton nid={nid} vid={rev.vid} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

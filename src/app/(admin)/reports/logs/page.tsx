import Link from 'next/link';
import { getLogs } from '@/lib/server/data';
import { LogFilters, ClearLogsButton, LogPagination } from './log-controls';

const SEVERITY_COLORS: Record<string, string> = {
  Emergency: 'bg-red-100 text-red-800 border border-red-200',
  Alert: 'bg-red-100 text-red-800 border border-red-200',
  Critical: 'bg-red-50 text-red-700 border border-red-100',
  Error: 'bg-red-50 text-red-700 border border-red-100',
  Warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  Notice: 'bg-blue-50 text-blue-700 border border-blue-100',
  Info: 'bg-sky-50 text-sky-700 border border-sky-100',
  Debug: 'bg-gray-50 text-gray-600 border border-gray-100',
};

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export default async function RecentLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const typeFilter = (typeof params.type === 'string' ? params.type : '') || '';
  const severityFilter = (typeof params.severity === 'string' ? params.severity : '') || '';

  const result = await getLogs({
    page,
    limit: 50,
    type: typeFilter || undefined,
    severity: severityFilter,
  });

  const { data: logs, meta } = result;

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
        <span className="text-sm text-gin-text-light">Recent log messages</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Recent log messages
        </h1>
        <ClearLogsButton disabled={logs.length === 0} />
      </div>

      {/* Filters */}
      <LogFilters
        types={meta.types}
        currentType={typeFilter}
        currentSeverity={severityFilter}
        total={meta.total}
      />

      {logs.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No log messages found.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-44">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                    Message
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-16">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gin-border-table">
                {logs.map((log) => (
                  <tr key={log.wid} className="hover:bg-gin-primary-light transition-colors">
                    <td className="px-4 py-3 text-sm text-gin-text font-medium">
                      {log.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text break-words max-w-md">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">
                      {log.uid || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium ${
                          SEVERITY_COLORS[log.severity_label] || 'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}
                      >
                        {log.severity_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <LogPagination page={meta.page} totalPages={meta.pages} />
        </>
      )}
    </div>
  );
}

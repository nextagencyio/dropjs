import Link from 'next/link';
import { getStatusReport, getCacheStats } from '@/lib/server/data';
import { ClearCacheButton } from './clear-cache-button';

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

type StatusColor = 'green' | 'red' | 'blue';

interface StatusItem {
  label: string;
  value: string;
  color: StatusColor;
}

function buildStatusItems(data: Awaited<ReturnType<typeof getStatusReport>>): StatusItem[] {
  return [
    {
      label: 'drop.js version',
      value: data.dropjs_version,
      color: 'green',
    },
    {
      label: 'Node.js version',
      value: data.node_version,
      color: 'green',
    },
    {
      label: 'Database',
      value: `${data.database_type} (${data.database_status})`,
      color: data.database_status === 'ok' ? 'green' : 'red',
    },
    {
      label: 'Entity types',
      value: String(data.entity_types_count),
      color: 'blue',
    },
    {
      label: 'Content items',
      value: String(data.total_nodes),
      color: 'blue',
    },
    {
      label: 'Users',
      value: String(data.total_users),
      color: 'blue',
    },
    {
      label: 'Uptime',
      value: formatUptime(data.uptime),
      color: 'blue',
    },
    {
      label: 'Memory usage',
      value: `${formatBytes(data.memory.rss)} RSS`,
      color: 'blue',
    },
  ];
}

const dotColors: Record<StatusColor, string> = {
  green: 'bg-gin-green',
  red: 'bg-gin-danger',
  blue: 'bg-gin-primary',
};

export default async function StatusReportPage() {
  let report: Awaited<ReturnType<typeof getStatusReport>> | null = null;
  let cacheInfo: Record<string, { size: number; tags: number }> = {};
  let error = '';

  try {
    [report, cacheInfo] = await Promise.all([
      getStatusReport(),
      getCacheStats(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load status report';
  }

  const totalCacheItems = Object.values(cacheInfo).reduce((sum, bin) => sum + bin.size, 0);
  const totalCacheTags = Object.values(cacheInfo).reduce((sum, bin) => sum + bin.tags, 0);

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
        <span className="text-sm text-gin-text-light">Status report</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Status report
        </h1>
        <ClearCacheButton />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
        </div>
      )}

      {report ? (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-8" />
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Item
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {buildStatusItems(report).map((item) => (
                <tr key={item.label} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${dotColors[item.color]}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gin-title">
                    {item.label}
                  </td>
                  <td className="px-4 py-3 text-gin-text">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Cache statistics */}
      <h2 className="text-lg font-semibold text-gin-title mt-8 mb-4">
        Cache statistics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-gin-border rounded-gin p-4">
          <div className="text-2xl font-bold text-gin-primary tabular-nums">{Object.keys(cacheInfo).length}</div>
          <div className="text-sm text-gin-text-light mt-1">Active bins</div>
        </div>
        <div className="bg-white border border-gin-border rounded-gin p-4">
          <div className="text-2xl font-bold text-gin-primary tabular-nums">{totalCacheItems}</div>
          <div className="text-sm text-gin-text-light mt-1">Cached items</div>
        </div>
        <div className="bg-white border border-gin-border rounded-gin p-4">
          <div className="text-2xl font-bold text-gin-primary tabular-nums">{totalCacheTags}</div>
          <div className="text-sm text-gin-text-light mt-1">Cache tags</div>
        </div>
      </div>

      {Object.keys(cacheInfo).length > 0 && (
        <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Bin
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Items
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {Object.entries(cacheInfo)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, stats]) => (
                  <tr key={name} className="hover:bg-gin-primary-light transition-colors">
                    <td className="px-4 py-3 font-medium text-gin-title font-mono text-xs">
                      {name}
                    </td>
                    <td className="px-4 py-3 text-gin-text tabular-nums">
                      {stats.size}
                    </td>
                    <td className="px-4 py-3 text-gin-text tabular-nums">
                      {stats.tags}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

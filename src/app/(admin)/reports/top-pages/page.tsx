import Link from 'next/link';
import { getTopPages } from '@/lib/server/data';
import { PeriodSelector } from './period-selector';

export default async function TopPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const period = (typeof params.period === 'string' ? params.period : '') || '7d';

  const result = await getTopPages(period);
  const pages = result.data;
  const maxHits = pages.length > 0 ? Math.max(...pages.map((p) => p.hits)) : 1;

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
        <span className="text-sm text-gin-text-light">Top pages</span>
      </div>

      <h1 className="text-[28px] font-normal tracking-tight mb-5 text-gin-title">
        Top pages
      </h1>

      {/* Period filter */}
      <PeriodSelector currentPeriod={period} />

      {pages.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No page views recorded for this period.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-8">
                  #
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Path
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                  Hits
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-48" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {pages.map((entry, idx) => (
                <tr key={entry.path} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text-light">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gin-text font-mono text-[13px]">
                    {entry.path}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text font-medium">
                    {entry.hits}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <div className="w-full bg-gin-bg-layer2 rounded-full h-2">
                      <div
                        className="bg-gin-primary h-2 rounded-full transition-all"
                        style={{ width: `${(entry.hits / maxHits) * 100}%` }}
                      />
                    </div>
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

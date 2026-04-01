import Link from 'next/link';

const reports = [
  {
    title: 'Status report',
    description: "Overview of your site's status and any problems detected.",
    href: '/reports/status',
  },
  {
    title: 'Available updates',
    description: 'Check for available updates.',
    href: '/reports/updates',
  },
  {
    title: 'Recent log messages',
    description: 'View recent system events.',
    href: '/reports/logs',
  },
  {
    title: 'Top pages',
    description: 'View most visited pages.',
    href: '/reports/top-pages',
  },
  {
    title: 'Audit log',
    description: 'Track entity changes — who created, updated, or deleted content.',
    href: '/reports/audit-log',
  },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Reports
      </h1>
      <p className="text-gin-text-light text-sm mb-6">
        View site reports and status information.
      </p>

      <div className="bg-white border border-gin-border rounded-gin divide-y divide-gin-border-table">
        {reports.map((report) =>
          report.href ? (
            <Link
              key={report.title}
              href={report.href}
              className="block px-5 py-4 hover:bg-gin-primary-light transition-colors"
            >
              <h3 className="text-sm font-medium text-gin-primary">
                {report.title}
              </h3>
              <p className="text-[12px] text-gin-text-light mt-0.5">
                {report.description}
              </p>
            </Link>
          ) : (
            <div key={report.title} className="px-5 py-4">
              <h3 className="text-sm font-medium text-gin-text-light">
                {report.title}
              </h3>
              <p className="text-[12px] text-gin-text-light mt-0.5">
                {report.description}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

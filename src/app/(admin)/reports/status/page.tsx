'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchStatusReport, type StatusReportData } from '@/lib/api-system';

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

function buildStatusItems(data: StatusReportData): StatusItem[] {
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

export default function StatusReportPage() {
  const [report, setReport] = useState<StatusReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatusReport()
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load status report');
        setLoading(false);
      });
  }, []);

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

      <h1 className="text-[28px] font-normal tracking-tight mb-5 text-gin-title">
        Status report
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          Loading...
        </div>
      ) : report ? (
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <table className="w-full text-sm">
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
    </div>
  );
}

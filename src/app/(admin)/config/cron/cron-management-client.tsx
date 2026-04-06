'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, CircleAlert, Clock, Play, Timer } from 'lucide-react';
import { runCronAction } from '@/app/(admin)/_actions/system';

interface CronJobInfo {
  name: string;
  interval: number;
  lastRun: number;
  nextRun: number;
}

interface Props {
  jobs: CronJobInfo[];
}

function formatInterval(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTime(timestamp: number): string {
  if (timestamp === 0) return 'Never';
  return new Date(timestamp).toLocaleString();
}

export default function CronManagementClient({ jobs }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ran: string[]; errors: string[] } | null>(null);

  const handleRunCron = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    const result = await runCronAction();
    if (result.success) {
      const data = result.data as { ran: string[]; errors: string[] };
      setLastResult(data);
      if (data.errors.length > 0) {
        setError(`Cron completed with errors: ${data.errors.join(', ')}`);
      } else if (data.ran.length > 0) {
        setSuccess(`Cron completed: ${data.ran.length} job(s) ran.`);
      } else {
        setSuccess('Cron completed: no jobs were due.');
      }
      router.refresh();
    } else {
      setError(result.error || 'Failed to run cron');
    }
    setLoading(false);
  };

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/config" className="text-gin-primary hover:underline text-sm">
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Cron</span>
      </nav>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Cron management
        </h1>
        <button
          onClick={handleRunCron}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run cron now
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-gin-text-light mb-5">
        View registered cron jobs and manually trigger cron execution.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-4">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-gin mb-4">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {lastResult && lastResult.ran.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-gin mb-4">
          Jobs executed: {lastResult.ran.join(', ')}
        </div>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Job name
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Interval
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Last run
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Next run
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gin-text-light">
                  No cron jobs registered.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const now = Date.now();
                const isDue = job.lastRun === 0 || now >= job.nextRun;
                return (
                  <tr key={job.name} className="hover:bg-gin-bg-layer2/50 transition-colors border-t border-gin-border">
                    <td className="px-4 py-3 text-sm text-gin-text">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gin-text-light" />
                        <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">
                          {job.name}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text">
                      <div className="flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-gin-text-light" />
                        {formatInterval(job.interval)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">
                      {formatTime(job.lastRun)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">
                      {job.lastRun === 0 ? 'Now' : formatTime(job.nextRun)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isDue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-gin-green">
                          Scheduled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

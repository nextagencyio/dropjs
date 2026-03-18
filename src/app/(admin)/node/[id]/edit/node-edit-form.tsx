'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Clock, FileText, Calendar } from 'lucide-react';
import { EntityForm } from '@/components/entity-form';
import { ContentLockBanner } from '@/components/content-lock-banner';
import { setSchedule, cancelSchedule } from '../../../_actions/entity';

interface AuditEntry {
  action: string;
  uid: number;
  timestamp: number;
  changes: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  insert: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

const ACTION_COLORS: Record<string, string> = {
  insert: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border border-blue-200',
  delete: 'bg-red-50 text-red-700 border border-red-200',
};

export function NodeEditForm({
  id,
  bundle,
  bundleLabel,
  isAdmin,
  revisionCount,
  auditEntries,
  schedule,
}: {
  id: number;
  bundle: string;
  bundleLabel: string;
  isAdmin?: boolean;
  revisionCount?: number;
  auditEntries?: AuditEntry[];
  schedule?: { transition: string; scheduled_date: string } | null;
}) {
  const [scheduleState, setScheduleState] = useState(schedule ?? null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTransition, setScheduleTransition] = useState<'publish' | 'unpublish'>('publish');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  async function handleSetSchedule() {
    if (!scheduleDate) return;
    setScheduleLoading(true);
    try {
      const result = await setSchedule('node', id, scheduleTransition, new Date(scheduleDate).toISOString());
      if (result.success) {
        setScheduleState({ transition: scheduleTransition, scheduled_date: new Date(scheduleDate).toISOString() });
        setScheduleDate('');
      } else {
        alert(result.error || 'Failed to set schedule');
      }
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleCancelSchedule() {
    if (!confirm('Cancel this scheduled transition?')) return;
    setScheduleLoading(true);
    try {
      const result = await cancelSchedule('node', id);
      if (result.success) {
        setScheduleState(null);
      } else {
        alert(result.error || 'Failed to cancel schedule');
      }
    } finally {
      setScheduleLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link href="/content" className="text-gin-primary hover:underline font-medium">
          Content
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gin-text-light" />
        <span className="text-gin-text-light">Edit</span>
      </div>

      <ContentLockBanner entityType="node" entityId={id} isAdmin={isAdmin} />

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title leading-tight">
            Edit <span className="text-gin-text-light">{bundleLabel}</span>
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Editing node #{id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/content/revisions/node/${bundle}/${id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gin-text bg-white border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 transition-colors"
          >
            <Clock className="w-4 h-4 text-gin-text-light" />
            Revisions
            {revisionCount != null && revisionCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[11px] font-semibold bg-gin-bg-layer2 text-gin-text-light rounded-full">
                {revisionCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <EntityForm entityType="node" bundle={bundle} entityId={id} />

      {/* Schedule widget */}
      <div className="mt-6 bg-white border border-gin-border rounded-gin p-4">
        <h3 className="text-sm font-semibold text-gin-title flex items-center gap-1.5 mb-3">
          <Calendar className="w-4 h-4 text-gin-text-light" />
          Scheduling
        </h3>
        {scheduleState ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gin-text">
              <span className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium mr-2 ${
                scheduleState.transition === 'publish'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {scheduleState.transition === 'publish' ? 'Publish' : 'Unpublish'}
              </span>
              scheduled for {new Date(scheduleState.scheduled_date).toLocaleString()}
            </div>
            <button
              onClick={handleCancelSchedule}
              disabled={scheduleLoading}
              className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
            >
              {scheduleLoading ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gin-text-light mb-1">Transition</label>
              <select
                value={scheduleTransition}
                onChange={(e) => setScheduleTransition(e.target.value as 'publish' | 'unpublish')}
                className="text-sm border border-gin-border rounded-gin-s px-2 py-1.5"
              >
                <option value="publish">Publish</option>
                <option value="unpublish">Unpublish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gin-text-light mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="text-sm border border-gin-border rounded-gin-s px-2 py-1.5"
              />
            </div>
            <button
              onClick={handleSetSchedule}
              disabled={scheduleLoading || !scheduleDate}
              className="px-3 py-1.5 text-sm font-medium text-white bg-gin-primary rounded-gin-s hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
            >
              {scheduleLoading ? 'Setting...' : 'Schedule'}
            </button>
          </div>
        )}
      </div>

      {/* Audit log */}
      {auditEntries && auditEntries.length > 0 && (
        <div className="mt-6 bg-white border border-gin-border rounded-gin p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gin-title flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gin-text-light" />
              Recent Activity
            </h3>
            <Link
              href="/reports/audit-log"
              className="text-xs text-gin-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {auditEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium ${
                  ACTION_COLORS[entry.action] || 'bg-gray-50 text-gray-600 border border-gray-100'
                }`}>
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
                <span className="text-gin-text-light">
                  by user #{entry.uid}
                </span>
                <span className="text-gin-text-light ml-auto whitespace-nowrap">
                  {new Date(entry.timestamp * 1000).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

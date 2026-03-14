'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createWebhook,
  deleteWebhook,
  updateWebhookAction,
} from '@/app/(admin)/_actions/system';

const AVAILABLE_EVENTS = [
  'entity:create',
  'entity:update',
  'entity:delete',
  'entity:presave',
  'user:login',
  'user:logout',
  'system:cron',
];

interface WebhookData {
  id: number;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

interface WebhooksClientProps {
  initialWebhooks: WebhookData[];
}

export default function WebhooksClient({ initialWebhooks }: WebhooksClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [newActive, setNewActive] = useState(true);

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newEvents.length === 0) {
      setError('Select at least one event.');
      return;
    }
    try {
      const result = await createWebhook({
        url: newUrl,
        events: newEvents,
        secret: newSecret || undefined,
        active: newActive,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create webhook');
        return;
      }
      setShowAdd(false);
      setNewUrl('');
      setNewSecret('');
      setNewEvents([]);
      setNewActive(true);
      setSuccess('Webhook created.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    }
  };

  const handleToggleActive = async (webhook: WebhookData) => {
    setError('');
    try {
      const result = await updateWebhookAction(webhook.id, { active: !webhook.active });
      if (!result.success) {
        setError(result.error || 'Failed to toggle webhook');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle webhook');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this webhook?')) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteWebhook(id);
      if (!result.success) {
        setError(result.error || 'Failed to delete webhook');
        return;
      }
      setSuccess('Webhook deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/config"
          className="text-sm text-gin-primary hover:underline"
        >
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text">Webhooks</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Webhooks</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage HTTP webhooks that fire on entity and system events.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
        >
          Add webhook
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s text-sm">
          {success}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl">
          <h2 className="text-lg font-semibold text-gin-title mb-4">Add webhook</h2>
          <div className="mb-5">
            <label htmlFor="webhook-url" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Payload URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="https://example.com/webhook"
              required
            />
          </div>
          <div className="mb-5">
            <label htmlFor="webhook-secret" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Secret
            </label>
            <input
              id="webhook-secret"
              type="text"
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="Optional HMAC secret for payload signing"
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              If provided, payloads will be signed with an HMAC-SHA256 header.
            </p>
          </div>
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-gin-text-light mb-2">
              Events
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm text-gin-text">
                  <input
                    type="checkbox"
                    checked={newEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-gin-border-form accent-gin-primary"
                  />
                  <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s">{event}</code>
                </label>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <label className="flex items-center gap-2 text-sm text-gin-text">
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
                className="rounded border-gin-border-form accent-gin-primary"
              />
              Active
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors">
              Create webhook
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-gin-l border border-gin-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">URL</th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Events</th>
              <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {initialWebhooks.map((webhook) => (
              <tr key={webhook.id} className="border-b border-gin-border-table last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-gin-title max-w-xs truncate">
                  {webhook.url}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="text-xs bg-gin-bg-layer2 text-gin-text px-1.5 py-0.5 rounded-gin-s"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(webhook)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      webhook.active
                        ? 'bg-emerald-50 text-gin-green'
                        : 'bg-gin-bg-layer2 text-gin-text-light'
                    }`}
                  >
                    {webhook.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {initialWebhooks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gin-text-light">
                  No webhooks configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

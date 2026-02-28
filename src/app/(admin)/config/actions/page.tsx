'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
}

interface Trigger {
  id: string;
  label: string;
  event: string;
  action_id: string;
  conditions: string;
  enabled: boolean;
}

const AVAILABLE_EVENTS = [
  'entity:create',
  'entity:update',
  'entity:delete',
  'entity:presave',
  'entity:view',
  'user:login',
  'user:logout',
  'user:register',
  'system:cron',
];

const CATEGORY_COLORS: Record<string, string> = {
  system: 'bg-gray-100 text-gray-800',
  user: 'bg-purple-100 text-purple-800',
  entity: 'bg-green-100 text-green-800',
  email: 'bg-amber-100 text-amber-800',
  workflow: 'bg-amber-100 text-amber-800',
  content: 'bg-blue-100 text-blue-800',
  notification: 'bg-green-100 text-green-800',
};

function getCategoryBadge(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-gin-bg-layer2 text-gin-text';
}

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEvent, setNewEvent] = useState('');
  const [newActionId, setNewActionId] = useState('');
  const [newConditions, setNewConditions] = useState('');
  const [newEnabled, setNewEnabled] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [actionsRes, triggersRes] = await Promise.all([
        apiFetch<{ data: ActionDefinition[] }>('/actions'),
        apiFetch<{ data: Trigger[] }>('/triggers'),
      ]);
      setActions(actionsRes.data);
      setTriggers(triggersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let parsedConditions = {};
    if (newConditions.trim()) {
      try {
        parsedConditions = JSON.parse(newConditions);
      } catch {
        setError('Conditions must be valid JSON.');
        return;
      }
    }

    try {
      await apiFetch('/triggers', {
        method: 'POST',
        body: JSON.stringify({
          label: newLabel,
          event: newEvent,
          action_id: newActionId,
          conditions: parsedConditions,
          enabled: newEnabled,
        }),
      });
      setShowAddTrigger(false);
      setNewLabel('');
      setNewEvent('');
      setNewActionId('');
      setNewConditions('');
      setNewEnabled(true);
      setSuccess('Trigger created.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trigger');
    }
  };

  const handleToggleEnabled = async (trigger: Trigger) => {
    setError('');
    try {
      await apiFetch(`/triggers/${trigger.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !trigger.enabled }),
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle trigger');
    }
  };

  const handleDeleteTrigger = async (triggerId: string, label: string) => {
    if (!confirm(`Delete the "${label}" trigger?`)) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/triggers/${triggerId}`, { method: 'DELETE' });
      setSuccess('Trigger deleted.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trigger');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-gin border border-gin-border p-8 text-center text-gin-text-light">
        Loading...
      </div>
    );
  }

  const actionsByCategory: Record<string, ActionDefinition[]> = {};
  for (const action of actions) {
    const cat = action.category || 'other';
    if (!actionsByCategory[cat]) {
      actionsByCategory[cat] = [];
    }
    actionsByCategory[cat].push(action);
  }

  const actionLookup: Record<string, string> = {};
  for (const action of actions) {
    actionLookup[action.id] = action.label;
  }

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
        <span className="text-sm text-gin-text">Actions &amp; Triggers</span>
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

      {/* Section 1: Available Actions */}
      <div className="mb-8">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-1">Available Actions</h1>
        <p className="text-gin-text-light text-sm mb-5">
          Registered actions grouped by category.
        </p>

        {Object.keys(actionsByCategory).length === 0 ? (
          <div className="bg-white rounded-gin-l border border-gin-border p-8 text-center text-gin-text-light">
            No actions registered.
          </div>
        ) : (
          Object.entries(actionsByCategory).map(([category, categoryActions]) => (
            <div key={category} className="mb-5">
              <h2 className="text-lg font-semibold text-gin-title mb-2 capitalize">{category}</h2>
              <div className="bg-white rounded-gin-l border border-gin-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Label</th>
                      <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryActions.map((action) => (
                      <tr key={action.id} className="border-b border-gin-border-table last:border-0">
                        <td className="px-4 py-3 font-medium text-gin-title">{action.label}</td>
                        <td className="px-4 py-3 text-gin-text">{action.description || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(action.category)}`}>
                            {action.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Section 2: Triggers */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Triggers</h1>
            <p className="text-gin-text-light text-sm mt-1">
              Configure triggers that fire actions in response to events.
            </p>
          </div>
          <button
            onClick={() => { setShowAddTrigger(!showAddTrigger); setError(''); setSuccess(''); }}
            className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
          >
            Add trigger
          </button>
        </div>

        {showAddTrigger && (
          <form onSubmit={handleCreateTrigger} className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl">
            <h2 className="text-lg font-semibold text-gin-title mb-4">Add trigger</h2>
            <div className="mb-5">
              <label htmlFor="trigger-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Label
              </label>
              <input
                id="trigger-label"
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                placeholder="Send email on content creation"
                required
              />
            </div>
            <div className="mb-5">
              <label htmlFor="trigger-event" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Event
              </label>
              <select
                id="trigger-event"
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                required
              >
                <option value="">-- Select an event --</option>
                {AVAILABLE_EVENTS.map((event) => (
                  <option key={event} value={event}>{event}</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label htmlFor="trigger-action" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Action
              </label>
              <select
                id="trigger-action"
                value={newActionId}
                onChange={(e) => setNewActionId(e.target.value)}
                className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                required
              >
                <option value="">-- Select an action --</option>
                {actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label} ({action.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label htmlFor="trigger-conditions" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Conditions (JSON)
              </label>
              <textarea
                id="trigger-conditions"
                value={newConditions}
                onChange={(e) => setNewConditions(e.target.value)}
                className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text font-mono border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                rows={4}
                placeholder={'{\n  "bundle": "article",\n  "status": 1\n}'}
              />
              <p className="text-xs text-gin-text-light mt-1.5">
                Optional JSON object specifying conditions that must be met for the trigger to fire.
              </p>
            </div>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm text-gin-text">
                <input
                  type="checkbox"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                  className="rounded border-gin-border-form accent-gin-primary"
                />
                Enabled
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
              >
                Create trigger
              </button>
              <button
                type="button"
                onClick={() => setShowAddTrigger(false)}
                className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-gin-l border border-gin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Label</th>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Action</th>
                <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Enabled</th>
                <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">Operations</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((trigger) => (
                <tr key={trigger.id} className="border-b border-gin-border-table last:border-0">
                  <td className="px-4 py-3 font-medium text-gin-title">{trigger.label}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gin-bg-layer2 text-gin-text px-1.5 py-0.5 rounded-gin-s">
                      {trigger.event}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gin-text">
                    {actionLookup[trigger.action_id] || trigger.action_id}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleEnabled(trigger)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        trigger.enabled
                          ? 'bg-emerald-50 text-gin-green'
                          : 'bg-gin-bg-layer2 text-gin-text-light'
                      }`}
                    >
                      {trigger.enabled ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteTrigger(trigger.id, trigger.label)}
                      className="text-sm text-gin-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {triggers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gin-text-light">
                    No triggers configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

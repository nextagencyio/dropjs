'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, CircleAlert, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { saveViewDisplayAction } from '@/app/(admin)/_actions/entity';

interface ViewMode {
  id: string;
  entity_type: string;
  label: string;
}

interface FieldDisplay {
  field: string;
  label: string;
  formatter: string;
  formatter_settings: Record<string, unknown>;
  weight: number;
  visible: boolean;
}

interface EntityViewDisplay {
  entity_type: string;
  bundle: string;
  mode: string;
  label: string;
  status: boolean;
  fields: Record<string, FieldDisplay>;
}

interface Props {
  entityType: string;
  bundle: string;
  label: string;
  currentMode: string;
  viewModes: ViewMode[];
  viewDisplay: EntityViewDisplay;
  fieldDefinitions: Record<string, { type: string; label?: string; [key: string]: unknown }>;
}

const LABEL_OPTIONS = [
  { value: 'above', label: 'Above' },
  { value: 'inline', label: 'Inline' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'visually_hidden', label: 'Visually hidden' },
];

export default function ManageDisplayClient({
  entityType,
  bundle,
  label: entityLabel,
  currentMode,
  viewModes,
  viewDisplay,
  fieldDefinitions,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, FieldDisplay>>(viewDisplay.fields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedFields = Object.values(fields).sort((a, b) => a.weight - b.weight);
  const visibleFields = sortedFields.filter((f) => f.visible);
  const hiddenFields = sortedFields.filter((f) => !f.visible);

  const updateField = (name: string, update: Partial<FieldDisplay>) => {
    setFields((prev) => ({
      ...prev,
      [name]: { ...prev[name], ...update },
    }));
  };

  const moveField = (name: string, direction: 'up' | 'down') => {
    const sorted = [...visibleFields];
    const idx = sorted.findIndex((f) => f.field === name);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const newFields = { ...fields };
    const tempWeight = sorted[idx].weight;
    newFields[sorted[idx].field] = { ...newFields[sorted[idx].field], weight: sorted[swapIdx].weight };
    newFields[sorted[swapIdx].field] = { ...newFields[sorted[swapIdx].field], weight: tempWeight };
    setFields(newFields);
  };

  const toggleVisibility = (name: string) => {
    const field = fields[name];
    const maxWeight = Math.max(...Object.values(fields).map((f) => f.weight), 0);
    updateField(name, {
      visible: !field.visible,
      weight: !field.visible ? maxWeight + 1 : field.weight,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await saveViewDisplayAction(entityType, bundle, currentMode, fields);
    if (result.success) {
      setSuccess('Display settings saved.');
    } else {
      setError(result.error || 'Save failed');
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5">
        <Link href="/structure/types" className="text-sm text-gin-primary hover:underline">
          Content types
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link href={`/structure/types/${entityType}/${bundle}/fields`} className="text-sm text-gin-primary hover:underline">
          {entityLabel}
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Manage display</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Manage display
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Configure how fields are displayed for <strong>{entityLabel}</strong>.
          </p>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gin-border overflow-x-auto">
        {viewModes.map((vm) => (
          <Link
            key={vm.id}
            href={`/structure/types/${entityType}/${bundle}/display?mode=${vm.id}`}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              currentMode === vm.id
                ? 'text-gin-primary border-gin-primary'
                : 'text-gin-text-light border-transparent hover:text-gin-text hover:border-gin-border'
            }`}
          >
            {vm.label}
          </Link>
        ))}
      </div>

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

      {/* Visible fields */}
      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto mb-6">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Field
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">
                Label
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-36">
                Formatter
              </th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                Order
              </th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-20">
                Visible
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            {visibleFields.map((f, idx) => {
              const def = fieldDefinitions[f.field];
              return (
                <tr key={f.field} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gin-title">
                      {def?.label || f.field}
                    </div>
                    <div className="text-xs text-gin-text-light">{f.field}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={f.label}
                      onChange={(e) => updateField(f.field, { label: e.target.value })}
                      className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs text-gin-text w-full focus:outline-none focus:ring-1 focus:ring-gin-primary"
                    >
                      {LABEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gin-text-light text-[13px]">
                    {f.formatter}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        onClick={() => moveField(f.field, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-gin-text-light hover:text-gin-text disabled:opacity-20 transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveField(f.field, 'down')}
                        disabled={idx === visibleFields.length - 1}
                        className="p-1 rounded text-gin-text-light hover:text-gin-text disabled:opacity-20 transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleVisibility(f.field)}
                      className="p-1.5 rounded-gin-s text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Hide field"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleFields.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gin-text-light">
                  No visible fields. Use the hidden fields section below to show fields.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden fields */}
      {hiddenFields.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gin-text-light mb-2">
            Hidden ({hiddenFields.length})
          </h2>
          <div className="bg-white border border-gin-border rounded-gin">
            <div className="divide-y divide-gin-border-table">
              {hiddenFields.map((f) => {
                const def = fieldDefinitions[f.field];
                return (
                  <div key={f.field} className="flex items-center justify-between px-4 py-3 hover:bg-gin-primary-light transition-colors">
                    <div>
                      <span className="text-sm font-medium text-gin-text-light">
                        {def?.label || f.field}
                      </span>
                      <span className="text-xs text-gin-text-light ml-2">({f.field})</span>
                    </div>
                    <button
                      onClick={() => toggleVisibility(f.field)}
                      className="p-1.5 rounded-gin-s text-gin-text-light hover:text-gin-primary hover:bg-gin-primary-light transition-colors"
                      title="Show field"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-5 py-2.5 text-sm font-semibold hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save'
        )}
      </button>
    </div>
  );
}

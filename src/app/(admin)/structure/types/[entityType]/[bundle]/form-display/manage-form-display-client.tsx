'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, CircleAlert, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { saveFormDisplayAction } from '@/app/(admin)/_actions/entity';

interface FieldFormDisplay {
  field: string;
  widget: string;
  widget_settings: Record<string, unknown>;
  weight: number;
  visible: boolean;
}

interface EntityFormDisplay {
  entity_type: string;
  bundle: string;
  mode: string;
  fields: Record<string, FieldFormDisplay>;
}

interface Props {
  entityType: string;
  bundle: string;
  label: string;
  formDisplay: EntityFormDisplay;
  fieldDefinitions: Record<string, { type: string; label?: string; [key: string]: unknown }>;
}

const WIDGETS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: 'string_textfield', label: 'Text field' },
    { value: 'string_textarea', label: 'Text area' },
  ],
  text_long: [
    { value: 'text_textarea', label: 'Text area' },
    { value: 'text_textarea_with_summary', label: 'Text area with summary' },
  ],
  text_with_summary: [
    { value: 'text_textarea_with_summary', label: 'Text area with summary' },
    { value: 'text_textarea', label: 'Text area (no summary)' },
  ],
  integer: [
    { value: 'number', label: 'Number field' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  float: [
    { value: 'number', label: 'Number field' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  decimal: [
    { value: 'number', label: 'Number field' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  boolean: [
    { value: 'boolean_checkbox', label: 'Single on/off checkbox' },
    { value: 'options_buttons', label: 'Check boxes/radio buttons' },
    { value: 'options_select', label: 'Select list' },
  ],
  entity_reference: [
    { value: 'entity_reference_autocomplete', label: 'Autocomplete' },
    { value: 'options_select', label: 'Select list' },
    { value: 'options_buttons', label: 'Check boxes/radio buttons' },
  ],
  image: [
    { value: 'image_image', label: 'Image' },
  ],
  file: [
    { value: 'file_generic', label: 'File' },
  ],
  link: [
    { value: 'link_default', label: 'Link' },
  ],
  email: [
    { value: 'email_default', label: 'Email' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  telephone: [
    { value: 'telephone_default', label: 'Telephone' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  date: [
    { value: 'date_default', label: 'Date' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  timestamp: [
    { value: 'datetime_timestamp', label: 'Date and time' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  color: [
    { value: 'color_default', label: 'Color picker' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  list_string: [
    { value: 'options_select', label: 'Select list' },
    { value: 'options_buttons', label: 'Check boxes/radio buttons' },
    { value: 'string_textfield', label: 'Text field' },
  ],
  json: [
    { value: 'json_editor', label: 'JSON editor' },
    { value: 'string_textfield', label: 'Text field' },
  ],
};

function getWidgetsForField(fieldType: string): { value: string; label: string }[] {
  return WIDGETS_BY_TYPE[fieldType] || [{ value: 'string_textfield', label: 'Text field' }];
}

export default function ManageFormDisplayClient({
  entityType,
  bundle,
  label: entityLabel,
  formDisplay,
  fieldDefinitions,
}: Props) {
  const [fields, setFields] = useState<Record<string, FieldFormDisplay>>(formDisplay.fields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedFields = Object.values(fields).sort((a, b) => a.weight - b.weight);
  const visibleFields = sortedFields.filter((f) => f.visible);
  const hiddenFields = sortedFields.filter((f) => !f.visible);

  const updateField = (name: string, update: Partial<FieldFormDisplay>) => {
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

    const result = await saveFormDisplayAction(entityType, bundle, 'default', fields);
    if (result.success) {
      setSuccess('Form display settings saved.');
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
        <span className="text-sm text-gin-text-light">Manage form display</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            Manage form display
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Configure how fields appear on the edit form for <strong>{entityLabel}</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/structure/types/${entityType}/${bundle}/display`}
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Manage display
          </Link>
          <Link
            href={`/structure/types/${entityType}/${bundle}/fields`}
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Manage fields
          </Link>
        </div>
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
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-48">
                Widget
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
                    <div className="text-xs text-gin-text-light">{f.field} ({def?.type || 'unknown'})</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={f.widget}
                      onChange={(e) => updateField(f.field, { widget: e.target.value })}
                      className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs text-gin-text w-full focus:outline-none focus:ring-1 focus:ring-gin-primary"
                    >
                      {getWidgetsForField(def?.type || 'string').map((w) => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
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
                      title="Hide field from form"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleFields.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gin-text-light">
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
                      title="Show field on form"
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

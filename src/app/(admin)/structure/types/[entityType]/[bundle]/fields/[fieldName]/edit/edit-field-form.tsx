'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateField } from '@/app/(admin)/_actions/entity';

interface FieldDefinition {
  type: string;
  label: string;
  required?: boolean;
  cardinality?: number;
  weight?: number;
  settings?: Record<string, unknown>;
}

interface BundleOption {
  value: string;
  label: string;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  string: 'Text (plain)',
  text_long: 'Text (formatted, long)',
  text_with_summary: 'Text (formatted, long, with summary)',
  integer: 'Integer',
  float: 'Float',
  decimal: 'Decimal',
  boolean: 'Boolean',
  email: 'Email',
  telephone: 'Telephone',
  date: 'Date',
  timestamp: 'Timestamp',
  link: 'Link',
  entity_reference: 'Entity reference',
  image: 'Image',
  file: 'File',
  color: 'Color',
  list_string: 'List (text)',
  json: 'JSON',
};

export function EditFieldForm({
  entityType,
  bundle,
  fieldName,
  fieldDef,
  nodeTypes,
  vocabularies,
}: {
  entityType: string;
  bundle: string;
  fieldName: string;
  fieldDef: FieldDefinition;
  nodeTypes: BundleOption[];
  vocabularies: BundleOption[];
}) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [label, setLabel] = useState(fieldDef.label);
  const [required, setRequired] = useState(fieldDef.required ?? false);
  const [cardinality, setCardinality] = useState(String(fieldDef.cardinality ?? 1));

  const s = fieldDef.settings ?? {};
  const [maxLength, setMaxLength] = useState(String(s.max_length ?? 255));
  const [targetType, setTargetType] = useState((s.target_type as string) ?? 'node');
  const [targetBundle, setTargetBundle] = useState((s.target_bundle as string) ?? '');
  const [allowedValues, setAllowedValues] = useState(() => {
    if (fieldDef.type !== 'list_string') return '';
    const vals = (s.allowed_values as Record<string, string>) ?? {};
    return Object.entries(vals)
      .map(([k, v]) => (k === v ? k : `${k}|${v}`))
      .join('\n');
  });
  const [precision, setPrecision] = useState(String(s.precision ?? 10));
  const [scale, setScale] = useState(String(s.scale ?? 2));

  const bundleOptions = fieldDef.type === 'entity_reference'
    ? (targetType === 'node' ? nodeTypes : targetType === 'taxonomy_term' ? vocabularies : [])
    : [];

  const buildSettings = (): Record<string, unknown> | undefined => {
    switch (fieldDef.type) {
      case 'string':
        return { max_length: parseInt(maxLength, 10) || 255 };
      case 'entity_reference':
        return {
          target_type: targetType,
          ...(targetBundle ? { target_bundle: targetBundle } : {}),
        };
      case 'list_string': {
        const values: Record<string, string> = {};
        for (const line of allowedValues.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const pipeIdx = trimmed.indexOf('|');
          if (pipeIdx > 0) {
            values[trimmed.slice(0, pipeIdx)] = trimmed.slice(pipeIdx + 1);
          } else {
            values[trimmed] = trimmed;
          }
        }
        return { allowed_values: values };
      }
      case 'decimal':
        return {
          precision: parseInt(precision, 10) || 10,
          scale: parseInt(scale, 10) || 2,
        };
      default:
        return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const settings = buildSettings();
    const result = await updateField(entityType, bundle, fieldName, {
      label,
      required,
      cardinality: parseInt(cardinality, 10),
      ...(settings !== undefined ? { settings } : {}),
    });
    if (result.success) {
      router.push(`/structure/types/${entityType}/${bundle}/fields`);
    } else {
      setError(result.error ?? 'Failed to update field');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link
          href="/structure/types"
          className="text-gin-primary hover:underline text-sm"
        >
          Content Types
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link
          href={`/structure/types/${entityType}/${bundle}/fields`}
          className="text-gin-primary hover:underline text-sm"
        >
          {bundle}
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Edit {fieldName}</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">Edit field</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gin-border rounded-gin p-6 max-w-xl">
        <div className="mb-4">
          <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Machine name
          </label>
          <div className="px-3 py-2 bg-gin-bg-layer2 border border-gin-border rounded-gin-s text-sm font-mono text-gin-text-light">
            {fieldName}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Field type
          </label>
          <div className="px-3 py-2 bg-gin-bg-layer2 border border-gin-border rounded-gin-s text-sm text-gin-text-light">
            {FIELD_TYPE_LABELS[fieldDef.type] ?? fieldDef.type}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Label *
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
            />
            <span className="text-sm font-medium text-gin-text">Required</span>
          </label>
        </div>

        <div className="mb-4">
          <label htmlFor="cardinality" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Allowed number of values
          </label>
          <select
            id="cardinality"
            value={cardinality}
            onChange={(e) => setCardinality(e.target.value)}
            className="w-full"
          >
            <option value="1">1 (single value)</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="-1">Unlimited</option>
          </select>
        </div>

        {fieldDef.type === 'string' && (
          <div className="mb-4 p-4 bg-gin-bg-layer2 rounded-gin border border-gin-border">
            <h3 className="text-sm font-semibold text-gin-title mb-3">String settings</h3>
            <div>
              <label htmlFor="max-length" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Maximum length
              </label>
              <input
                id="max-length"
                type="number"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                min={1}
                max={4096}
                className="w-32"
              />
            </div>
          </div>
        )}

        {fieldDef.type === 'entity_reference' && (
          <div className="mb-4 p-4 bg-gin-bg-layer2 rounded-gin border border-gin-border">
            <h3 className="text-sm font-semibold text-gin-title mb-3">Reference settings</h3>
            <div className="mb-3">
              <label htmlFor="target-type" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Target entity type
              </label>
              <select
                id="target-type"
                value={targetType}
                onChange={(e) => { setTargetType(e.target.value); setTargetBundle(''); }}
                className="w-full"
              >
                <option value="node">Content (node)</option>
                <option value="taxonomy_term">Taxonomy term</option>
              </select>
            </div>
            <div>
              <label htmlFor="target-bundle" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Target bundle (optional)
              </label>
              <select
                id="target-bundle"
                value={targetBundle}
                onChange={(e) => setTargetBundle(e.target.value)}
                className="w-full"
              >
                <option value="">-- Any bundle --</option>
                {bundleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {fieldDef.type === 'list_string' && (
          <div className="mb-4 p-4 bg-gin-bg-layer2 rounded-gin border border-gin-border">
            <label htmlFor="allowed-values" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Allowed values</label>
            <textarea
              id="allowed-values"
              value={allowedValues}
              onChange={(e) => setAllowedValues(e.target.value)}
              rows={5}
              className="w-full font-mono"
              placeholder={"key|Label\nkey2|Label 2"}
            />
            <p className="text-[12px] text-gin-text-light mt-1">
              One value per line. Format: key|Label
            </p>
          </div>
        )}

        {fieldDef.type === 'decimal' && (
          <div className="mb-4 p-4 bg-gin-bg-layer2 rounded-gin border border-gin-border">
            <h3 className="text-sm font-semibold text-gin-title mb-3">Decimal settings</h3>
            <div className="flex gap-4">
              <div>
                <label htmlFor="precision" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Precision
                </label>
                <input
                  id="precision"
                  type="number"
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                  min={1}
                  max={32}
                  className="w-24"
                />
              </div>
              <div>
                <label htmlFor="scale" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                  Scale
                </label>
                <input
                  id="scale"
                  type="number"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  min={0}
                  max={10}
                  className="w-24"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={submitting || !label}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <Link
            href={`/structure/types/${entityType}/${bundle}/fields`}
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

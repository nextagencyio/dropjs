'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addField } from '@/app/(admin)/_actions/entity';

const FIELD_TYPES = [
  { value: 'string', label: 'Text (plain)' },
  { value: 'text_long', label: 'Text (formatted, long)' },
  { value: 'text_with_summary', label: 'Text (formatted, long, with summary)' },
  { value: 'integer', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'email', label: 'Email' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'date', label: 'Date' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'link', label: 'Link' },
  { value: 'entity_reference', label: 'Entity reference' },
  { value: 'image', label: 'Image' },
  { value: 'file', label: 'File' },
  { value: 'color', label: 'Color' },
  { value: 'list_string', label: 'List (text)' },
  { value: 'json', label: 'JSON' },
];

function toFieldName(label: string): string {
  return (
    'field_' +
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

interface BundleOption {
  value: string;
  label: string;
}

export function AddFieldForm({
  entityType,
  bundle,
  nodeTypes,
  vocabularies,
}: {
  entityType: string;
  bundle: string;
  nodeTypes: BundleOption[];
  vocabularies: BundleOption[];
}) {
  const router = useRouter();

  const [label, setLabel] = useState('');
  const [fieldName, setFieldName] = useState('field_');
  const [fieldType, setFieldType] = useState('string');
  const [cardinality, setCardinality] = useState('1');
  const [autoName, setAutoName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [maxLength, setMaxLength] = useState('255');
  const [targetType, setTargetType] = useState('node');
  const [targetBundle, setTargetBundle] = useState('');
  const [allowedValues, setAllowedValues] = useState('');
  const [precision, setPrecision] = useState('10');
  const [scale, setScale] = useState('2');

  const bundleOptions = fieldType === 'entity_reference'
    ? (targetType === 'node' ? nodeTypes : targetType === 'taxonomy_term' ? vocabularies : [])
    : [];

  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (autoName) {
      setFieldName(toFieldName(value));
    }
  };

  const handleFieldNameChange = (value: string) => {
    setAutoName(false);
    let cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleaned.startsWith('field_')) {
      cleaned = 'field_' + cleaned;
    }
    setFieldName(cleaned);
  };

  const buildSettings = (): Record<string, unknown> | undefined => {
    switch (fieldType) {
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
    const result = await addField(entityType, bundle, {
      name: fieldName,
      label,
      type: fieldType,
      cardinality: parseInt(cardinality, 10),
      ...(settings ? { settings } : {}),
    });
    if (result.success) {
      router.push(`/structure/types/${entityType}/${bundle}/fields`);
      router.refresh();
    } else {
      setError(result.error ?? 'Failed to add field');
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
        <span className="text-sm text-gin-text-light">Add field</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">Add field</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gin-border rounded-gin p-6 max-w-xl">
        <div className="mb-4">
          <label htmlFor="label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Label *
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            required
            className="w-full"
            placeholder="e.g. Body"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="field-name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Machine name
          </label>
          <input
            id="field-name"
            type="text"
            value={fieldName}
            onChange={(e) => handleFieldNameChange(e.target.value)}
            required
            className="w-full font-mono bg-gin-bg-layer2"
          />
          <p className="text-[12px] text-gin-text-light mt-1">
            Must start with &quot;field_&quot;. Lowercase letters, numbers, and underscores only.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="field-type" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Field type *
          </label>
          <select
            id="field-type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
            className="w-full"
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>
                {ft.label}
              </option>
            ))}
          </select>
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

        {fieldType === 'string' && (
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

        {fieldType === 'entity_reference' && (
          <div className="mb-4 p-4 bg-gin-bg-layer2 rounded-gin border border-gin-border">
            <h3 className="text-sm font-semibold text-gin-title mb-3">Reference settings</h3>
            <div className="mb-3">
              <label htmlFor="target-type" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Target entity type
              </label>
              <select
                id="target-type"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
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

        {fieldType === 'list_string' && (
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

        {fieldType === 'decimal' && (
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
            disabled={submitting || !label || !fieldName}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Save field'}
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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlusCircle, ChevronDown, X, FileText, Download, Upload, Loader2, Image, Link2, FolderOpen } from 'lucide-react';
import { searchEntitiesAction } from '@/app/(admin)/_actions/entity';
import { RichTextEditor } from './rich-text-editor';
import { uploadFile } from '@/lib/api-media';
import { MediaBrowserModal, type MediaFile } from './media-browser-modal';

export interface FieldDefinition {
  type: string;
  label: string;
  required?: boolean;
  cardinality?: number;
  weight?: number;
  settings?: Record<string, unknown>;
}

interface FieldWidgetProps {
  fieldName: string;
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldWidget({ fieldName, field, value, onChange }: FieldWidgetProps) {
  const isMulti = field.cardinality !== undefined && field.cardinality !== 1;

  if (isMulti) {
    return (
      <MultiValueWidget
        fieldName={fieldName}
        field={field}
        values={Array.isArray(value) ? value : value != null ? [value] : []}
        onChange={onChange}
      />
    );
  }

  return (
    <div className="mb-5">
      <label htmlFor={fieldName} className="block text-[13px] font-semibold text-gin-text mb-1.5 tracking-wide">
        {field.label}
        {field.required && <span className="text-gin-danger ml-1">*</span>}
      </label>
      <SingleFieldInput
        id={fieldName}
        fieldName={fieldName}
        field={field}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function MultiValueWidget({
  fieldName,
  field,
  values,
  onChange,
}: {
  fieldName: string;
  field: FieldDefinition;
  values: unknown[];
  onChange: (value: unknown) => void;
}) {
  const addItem = () => {
    onChange([...values, getDefaultValue(field.type)]);
  };

  const removeItem = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: unknown) => {
    const updated = [...values];
    updated[index] = newValue;
    onChange(updated);
  };

  return (
    <div className="mb-5">
      <label htmlFor={`${fieldName}-0`} className="block text-[13px] font-semibold text-gin-text mb-1.5 tracking-wide">
        {field.label}
        {field.required && <span className="text-gin-danger ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {values.map((val, idx) => (
          <div key={idx} className="flex gap-2 items-start group">
            <div className="flex-1">
              <SingleFieldInput
                id={`${fieldName}-${idx}`}
                fieldName={fieldName}
                field={field}
                value={val}
                onChange={(v) => updateItem(idx, v)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="mt-1 px-2.5 py-1.5 text-xs font-medium text-gin-danger hover:bg-red-50 rounded-gin-s border border-transparent hover:border-red-200 transition-all duration-150 opacity-60 group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-gin-primary hover:text-gin-primary-hover transition-colors"
      >
        <PlusCircle className="w-4 h-4" />
        Add another item
      </button>
    </div>
  );
}

function SingleFieldInput({
  id,
  fieldName,
  field,
  value,
  onChange,
}: {
  id?: string;
  fieldName: string;
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputClass =
    'w-full border border-gin-border-form rounded-gin-s px-3 py-2.5 text-sm bg-white text-gin-text placeholder-gin-text-light/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary';

  switch (field.type) {
    case 'string':
      return (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.required}
          maxLength={(field.settings?.max_length as number) ?? undefined}
          className={inputClass}
        />
      );

    case 'text_long': {
      const textVal =
        typeof value === 'object' && value !== null
          ? ((value as Record<string, unknown>).value as string) ?? ''
          : (value as string) ?? '';
      const textFormat =
        typeof value === 'object' && value !== null
          ? ((value as Record<string, unknown>).format as string) ?? 'plain_text'
          : 'plain_text';
      const isHtml = textFormat === 'basic_html' || textFormat === 'full_html';

      return (
        <div className="space-y-2">
          {isHtml ? (
            <RichTextEditor
              value={textVal}
              onChange={(html) =>
                onChange({ value: html || null, format: textFormat })
              }
            />
          ) : (
            <textarea
              id={id}
              value={textVal}
              onChange={(e) =>
                onChange({ value: e.target.value || null, format: textFormat })
              }
              rows={6}
              required={field.required}
              className={`${inputClass} resize-y`}
            />
          )}
          <select
            value={textFormat}
            onChange={(e) =>
              onChange({
                value:
                  typeof value === 'object' && value !== null
                    ? (value as Record<string, unknown>).value
                    : value,
                format: e.target.value,
              })
            }
            className="border border-gin-border-form rounded-gin-s pl-2.5 pr-7 py-1 text-xs text-gin-text-light bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
          >
            <option value="plain_text">Plain text</option>
            <option value="basic_html">Basic HTML</option>
            <option value="full_html">Full HTML</option>
          </select>
        </div>
      );
    }

    case 'text_with_summary': {
      const twsVal =
        typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)
          : typeof value === 'string'
            ? { value, summary: null, format: 'basic_html' }
            : { value: null, summary: null, format: 'basic_html' };
      const twsBody = (twsVal.value as string) ?? '';
      const twsSummary = (twsVal.summary as string) ?? '';
      const twsFormat = (twsVal.format as string) ?? 'basic_html';
      const twsIsHtml = twsFormat === 'basic_html' || twsFormat === 'full_html';

      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gin-text-light mb-1.5">Body</label>
            {twsIsHtml ? (
              <RichTextEditor
                value={twsBody}
                onChange={(html) =>
                  onChange({ ...twsVal, value: html || null })
                }
              />
            ) : (
              <textarea
                id={id}
                value={twsBody}
                onChange={(e) =>
                  onChange({ ...twsVal, value: e.target.value || null })
                }
                rows={8}
                required={field.required}
                className={`${inputClass} resize-y`}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gin-text-light mb-1.5">Summary (teaser)</label>
            <textarea
              value={twsSummary}
              onChange={(e) =>
                onChange({ ...twsVal, summary: e.target.value || null })
              }
              rows={3}
              placeholder="Leave blank for auto-generated summary"
              className={`${inputClass} resize-y`}
            />
          </div>
          <select
            value={twsFormat}
            onChange={(e) => onChange({ ...twsVal, format: e.target.value })}
            className="border border-gin-border-form rounded-gin-s pl-2.5 pr-7 py-1 text-xs text-gin-text-light bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
          >
            <option value="plain_text">Plain text</option>
            <option value="basic_html">Basic HTML</option>
            <option value="full_html">Full HTML</option>
          </select>
        </div>
      );
    }

    case 'integer':
      return (
        <input
          id={id}
          type="number"
          step="1"
          value={value != null ? String(value) : ''}
          onChange={(e) =>
            onChange(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          required={field.required}
          className={inputClass}
        />
      );

    case 'float':
    case 'decimal':
      return (
        <input
          id={id}
          type="number"
          step="any"
          value={value != null ? String(value) : ''}
          onChange={(e) =>
            onChange(e.target.value ? parseFloat(e.target.value) : null)
          }
          required={field.required}
          className={inputClass}
        />
      );

    case 'boolean':
      return (
        <label htmlFor={id} className="inline-flex items-center gap-3 cursor-pointer group">
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={Boolean(value)}
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:ring-offset-2 ${
              value ? 'bg-gin-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-gin-text group-hover:text-gin-title transition-colors">
            {value ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      );

    case 'email':
      return (
        <input
          id={id}
          type="email"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.required}
          placeholder="name@example.com"
          className={inputClass}
        />
      );

    case 'telephone':
      return (
        <input
          id={id}
          type="tel"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.required}
          placeholder="+1 (555) 123-4567"
          className={inputClass}
        />
      );

    case 'date':
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            required={field.required}
            className={`${inputClass} w-auto`}
          />
          {value != null && !field.required && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-2.5 py-2 text-xs font-medium text-gin-text-light hover:text-gin-danger border border-gin-border-form rounded-gin-s hover:bg-red-50 hover:border-red-200 transition-all duration-150"
              title="Clear date"
            >
              Clear
            </button>
          )}
          {!value && (
            <button
              type="button"
              onClick={() => onChange(new Date().toISOString().slice(0, 10))}
              className="px-2.5 py-2 text-xs font-medium text-gin-primary border border-gin-border-form rounded-gin-s hover:bg-gin-primary-light hover:border-gin-primary/30 transition-all duration-150"
              title="Set to today"
            >
              Today
            </button>
          )}
        </div>
      );

    case 'timestamp':
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="datetime-local"
            value={formatDateTimeLocal(value)}
            onChange={(e) =>
              onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
            }
            required={field.required}
            className={`${inputClass} w-auto`}
          />
          {value != null && !field.required && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-2.5 py-2 text-xs font-medium text-gin-text-light hover:text-gin-danger border border-gin-border-form rounded-gin-s hover:bg-red-50 hover:border-red-200 transition-all duration-150"
              title="Clear date"
            >
              Clear
            </button>
          )}
          {!value && (
            <button
              type="button"
              onClick={() => onChange(new Date().toISOString())}
              className="px-2.5 py-2 text-xs font-medium text-gin-primary border border-gin-border-form rounded-gin-s hover:bg-gin-primary-light hover:border-gin-primary/30 transition-all duration-150"
              title="Set to now"
            >
              Now
            </button>
          )}
        </div>
      );

    case 'entity_reference':
      return (
        <EntityReferenceAutocomplete
          id={id}
          value={value as number | null}
          onChange={onChange}
          required={field.required}
          targetType={(field.settings?.target_type as string) ?? 'node'}
          targetBundle={(field.settings?.target_bundle as string) ?? undefined}
          inputClass={inputClass}
        />
      );

    case 'image':
      return (
        <ImageFieldWidget
          id={id}
          value={value as Record<string, unknown> | null}
          onChange={onChange}
          required={field.required}
        />
      );

    case 'file':
      return (
        <FileFieldWidget
          id={id}
          value={value as Record<string, unknown> | null}
          onChange={onChange}
          required={field.required}
        />
      );

    case 'link': {
      const linkVal = typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : typeof value === 'string'
          ? { uri: value, title: '' }
          : { uri: '', title: '' };
      return (
        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Link2 className="w-4 h-4 text-gin-text-light" />
            </div>
            <input
              id={id}
              type="url"
              value={(linkVal.uri as string) ?? ''}
              onChange={(e) => onChange({ ...linkVal, uri: e.target.value || null })}
              required={field.required}
              placeholder="https://example.com"
              className={`${inputClass} pl-9`}
            />
          </div>
          <input
            type="text"
            value={(linkVal.title as string) ?? ''}
            onChange={(e) => onChange({ ...linkVal, title: e.target.value || null })}
            placeholder="Link text"
            className={inputClass}
          />
        </div>
      );
    }

    case 'color': {
      const colorVal = typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>).color as string ?? '#000000'
        : typeof value === 'string'
          ? value
          : '#000000';
      return (
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="color"
            value={colorVal}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-12 h-10 p-1 border border-gin-border-form rounded-gin-s cursor-pointer bg-white transition-shadow hover:shadow-sm"
          />
          <input
            type="text"
            value={colorVal}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="#000000"
            pattern="#[0-9a-fA-F]{6}"
            className={`${inputClass} w-32 font-mono`}
          />
        </div>
      );
    }

    case 'list_string': {
      const allowed = (field.settings?.allowed_values as Record<string, string>) ?? {};
      const options = Object.entries(allowed);
      if (options.length === 0) {
        return (
          <input
            id={id}
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            required={field.required}
            placeholder="No options configured"
            className={inputClass}
          />
        );
      }
      return (
        <div className="relative">
          <select
            id={id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            required={field.required}
            className={`${inputClass} appearance-none pr-9 cursor-pointer`}
          >
            <option value="">-- Select --</option>
            {options.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-4 w-4 text-gin-text-light" />
          </div>
        </div>
      );
    }

    case 'json':
      return <JsonEditor id={id} value={value} onChange={onChange} inputClass={inputClass} />;

    default:
      return (
        <textarea
          id={id}
          value={
            typeof value === 'string'
              ? value
              : value != null
                ? JSON.stringify(value, null, 2)
                : ''
          }
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          rows={4}
          placeholder="Value"
          className={`${inputClass} font-mono text-xs resize-y`}
        />
      );
  }
}

function EntityReferenceAutocomplete({
  id,
  value,
  onChange,
  required,
  targetType,
  targetBundle,
  inputClass,
}: {
  id?: string;
  value: number | null;
  onChange: (value: unknown) => void;
  required?: boolean;
  targetType: string;
  targetBundle?: string;
  inputClass: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ nid: number; title: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(
    async (term: string) => {
      if (!term || term.length < 2 || !targetBundle) {
        setResults([]);
        return;
      }
      try {
        const result = await searchEntitiesAction(targetType, targetBundle, term, 10);
        if (result.success) {
          const entities = result.data as Array<Record<string, unknown>>;
          setResults(
            entities.map((d) => ({
              nid: d.nid as number,
              title: (d.title as string) ?? `#${d.nid}`,
            })),
          );
          setShowDropdown(true);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      }
    },
    [targetType, targetBundle],
  );

  const handleInput = (term: string) => {
    setQuery(term);
    setSelectedLabel(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(term), 300);
  };

  const selectItem = (item: { nid: number; title: string }) => {
    onChange(item.nid);
    setQuery('');
    setSelectedLabel(item.title);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex items-center gap-2">
        {value != null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-gin-primary-light text-gin-primary rounded-gin-s border border-gin-primary/20 font-medium">
            {selectedLabel ?? `#${value}`}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSelectedLabel(null);
              }}
              className="text-gin-primary/50 hover:text-gin-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          required={required && value == null}
          placeholder={
            value != null
              ? 'Search to change...'
              : `Search ${targetBundle ?? targetType}...`
          }
          className={inputClass}
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gin-border rounded-gin shadow-lg max-h-48 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.nid}
              type="button"
              onClick={() => selectItem(item)}
              className="block w-full text-left px-3 py-2.5 text-sm hover:bg-gin-primary-light transition-colors first:rounded-t-gin last:rounded-b-gin"
            >
              <span className="font-medium text-gin-text">{item.title}</span>
              <span className="text-gin-text-light ml-2 text-xs">#{item.nid}</span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gin-border rounded-gin shadow-lg px-3 py-3 text-sm text-gin-text-light text-center">
          No results found.
        </div>
      )}
      <p className="text-xs text-gin-text-light mt-1.5">
        Reference to {targetType}
        {targetBundle ? ` (${targetBundle})` : ''}
      </p>
    </div>
  );
}

function JsonEditor({
  id,
  value,
  onChange,
  inputClass,
}: {
  id?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  inputClass: string;
}) {
  const [text, setText] = useState(() =>
    typeof value === 'string'
      ? value
      : value != null
        ? JSON.stringify(value, null, 2)
        : '',
  );
  const [valid, setValid] = useState(true);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setValid(true);
      onChange(parsed);
    } catch {
      setValid(newText === '');
      onChange(newText);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      setValid(true);
    } catch {
      // already invalid, do nothing
    }
  };

  return (
    <div>
      <div className="relative">
        <textarea
          id={id}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={8}
          placeholder='{"key": "value"}'
          spellCheck={false}
          className={`${inputClass} font-mono text-xs leading-relaxed resize-y ${
            !valid ? 'border-gin-danger focus:ring-gin-danger/30 focus:border-gin-danger' : ''
          }`}
        />
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {!valid && text !== '' && (
            <span className="text-xs font-medium text-gin-danger bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              Invalid JSON
            </span>
          )}
          <button
            type="button"
            onClick={handleFormat}
            disabled={!valid}
            className="text-xs font-medium text-gin-text-light hover:text-gin-primary bg-white border border-gin-border px-2 py-0.5 rounded-gin-s disabled:opacity-40 transition-colors"
            title="Format JSON"
          >
            Format
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateTimeLocal(value: unknown): string {
  if (!value) return '';
  try {
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function getDefaultValue(fieldType: string): unknown {
  switch (fieldType) {
    case 'string':
    case 'email':
    case 'telephone':
      return '';
    case 'text_long':
      return { value: '', format: 'plain_text' };
    case 'text_with_summary':
      return { value: '', summary: '', format: 'basic_html' };
    case 'integer':
    case 'float':
    case 'decimal':
    case 'entity_reference':
      return null;
    case 'boolean':
      return false;
    case 'date':
      return new Date().toISOString().slice(0, 10);
    case 'timestamp':
      return new Date().toISOString();
    case 'link':
      return { uri: '', title: '' };
    case 'color':
      return '#000000';
    case 'image':
    case 'file':
      return null;
    default:
      return null;
  }
}

function FileFieldWidget({
  id,
  value,
  onChange,
  required,
}: {
  id?: string;
  value: Record<string, unknown> | null;
  onChange: (value: unknown) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = value?.target_id as number | null | undefined;
  const description = (value?.description as string) ?? '';

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      const fileData = result.data;
      onChange({
        target_id: fileData.fid,
        display: 1,
        description: description || file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (targetId) {
    return (
      <div className="border border-gin-border rounded-gin p-4 bg-gin-bg-layer">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gin-bg-layer2 rounded-gin-s shrink-0">
            <FileText className="w-5 h-5 text-gin-text-light" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={description}
              onChange={(e) => onChange({ ...value, description: e.target.value || null })}
              placeholder="File description"
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-1.5 text-sm bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-gin-primary hover:bg-gin-primary-light rounded-gin-s transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-3 py-1.5 text-xs font-medium text-gin-danger hover:bg-red-50 rounded-gin-s transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
        <a
          href={`/api/files/${targetId}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gin-primary hover:underline mt-2 ml-13"
        >
          <Download className="w-3 h-3" />
          Download file
        </a>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-2 text-sm text-gin-danger bg-red-50 border border-red-200 rounded-gin-s px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gin-text bg-white border border-gin-border-form rounded-gin-s hover:bg-gin-bg-layer2 hover:border-gin-border disabled:opacity-50 transition-all duration-150"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-gin-text-light" />
              Choose file
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowBrowser(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gin-text bg-white border border-gin-border-form rounded-gin-s hover:bg-gin-bg-layer2 hover:border-gin-border transition-all duration-150"
        >
          <FolderOpen className="w-4 h-4 text-gin-text-light" />
          Browse media
        </button>
        <span className="text-sm text-gin-text-light">No file selected</span>
      </div>
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        required={required && !targetId}
        className="hidden"
      />
      <MediaBrowserModal
        open={showBrowser}
        onClose={() => setShowBrowser(false)}
        accept="file"
        onSelect={(file: MediaFile) => {
          onChange({
            target_id: file.fid,
            display: 1,
            description: description || file.filename,
          });
        }}
      />
    </div>
  );
}

function ImageFieldWidget({
  id,
  value,
  onChange,
  required,
}: {
  id?: string;
  value: Record<string, unknown> | null;
  onChange: (value: unknown) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = value?.target_id as number | null | undefined;
  const thumbnailUrl = value?.thumbnail_url as string | undefined;
  const alt = (value?.alt as string) ?? '';
  const title = (value?.title as string) ?? '';

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadFile(file);
      const fileData = result.data;
      onChange({
        target_id: fileData.fid,
        alt: alt || file.name,
        title: title || file.name,
        width: null,
        height: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange(null);
  };

  if (targetId) {
    return (
      <div className="border border-gin-border rounded-gin p-4 bg-gin-bg-layer">
        <div className="flex gap-4 items-start">
          <div className="w-24 h-24 bg-gin-bg-layer2 rounded-gin overflow-hidden shrink-0 border border-gin-border">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={alt}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={`/api/files/${targetId}/style/thumbnail`}
                alt={alt}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gin-text-light mb-1">Alt text</label>
              <input
                type="text"
                value={alt}
                onChange={(e) =>
                  onChange({ ...value, alt: e.target.value || null })
                }
                placeholder="Describe the image"
                className="w-full border border-gin-border-form rounded-gin-s px-3 py-1.5 text-sm bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gin-text-light mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) =>
                  onChange({ ...value, title: e.target.value || null })
                }
                placeholder="Image title"
                className="w-full border border-gin-border-form rounded-gin-s px-3 py-1.5 text-sm bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium text-gin-primary hover:bg-gin-primary-light rounded-gin-s transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 text-xs font-medium text-gin-danger hover:bg-red-50 rounded-gin-s transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-2 text-sm text-gin-danger bg-red-50 border border-red-200 rounded-gin-s px-3 py-2">
          {error}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-gin p-8 text-center transition-all duration-200 ${
          dragOver
            ? 'border-gin-primary bg-gin-primary-light scale-[1.01]'
            : 'border-gin-border hover:border-gin-text-light'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-gin-primary animate-spin" />
            <p className="text-sm font-medium text-gin-text">Uploading...</p>
          </div>
        ) : (
          <>
            <Image className="w-10 h-10 text-gin-text-light/50 mx-auto mb-3" />
            <p className="text-sm text-gin-text mb-1">
              Drag an image here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-gin-primary font-medium hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gin-text-light">JPEG, PNG, WebP, GIF</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowBrowser(true); }}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-gin-primary font-medium hover:underline"
            >
              <FolderOpen className="w-4 h-4" />
              Browse media library
            </button>
          </>
        )}
      </div>
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        required={required && !targetId}
        className="hidden"
      />
      <MediaBrowserModal
        open={showBrowser}
        onClose={() => setShowBrowser(false)}
        accept="image"
        onSelect={(file: MediaFile) => {
          onChange({
            target_id: file.fid,
            alt: alt || file.filename,
            title: title || file.filename,
            width: null,
            height: null,
          });
        }}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface ParagraphField {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

interface ParagraphType {
  id: string;
  label: string;
  fields: ParagraphField[];
}

export default function ParagraphsPage() {
  const [types, setTypes] = useState<ParagraphType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newFields, setNewFields] = useState<ParagraphField[]>([]);

  // New field builder row
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);

  const loadTypes = () => {
    setLoading(true);
    apiFetch<{ data: ParagraphType[] }>('/paragraph-types')
      .then((res) => {
        setTypes(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load paragraph types');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleAddField = () => {
    if (!fieldName.trim() || !fieldLabel.trim()) {
      setError('Field name and label are required.');
      return;
    }
    if (newFields.some((f) => f.name === fieldName.trim())) {
      setError('A field with that name already exists.');
      return;
    }
    setError('');
    setNewFields([
      ...newFields,
      {
        name: fieldName.trim(),
        type: fieldType,
        label: fieldLabel.trim(),
        required: fieldRequired,
      },
    ]);
    setFieldName('');
    setFieldType('text');
    setFieldLabel('');
    setFieldRequired(false);
  };

  const handleRemoveField = (index: number) => {
    setNewFields(newFields.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiFetch('/paragraph-types', {
        method: 'POST',
        body: JSON.stringify({
          id: newId,
          label: newLabel,
          fields: newFields,
        }),
      });
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewFields([]);
      setSuccess('Paragraph type created.');
      loadTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create paragraph type');
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm(`Delete the "${typeId}" paragraph type?`)) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/paragraph-types/${typeId}`, { method: 'DELETE' });
      setSuccess('Paragraph type deleted.');
      loadTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete paragraph type');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <div className="bg-gin-bg-layer2 px-4 py-3">
            <div className="h-4 w-full animate-pulse bg-gin-bg-app rounded-gin-s" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-t border-gin-border">
              <div className="h-4 w-3/4 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link
          href="/structure"
          className="text-gin-primary hover:underline text-sm"
        >
          Structure
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Paragraph types</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Paragraph Types</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage paragraph types and their field configurations.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          Add paragraph type
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white border border-gin-border rounded-gin p-6 mb-5 max-w-2xl">
          <h2 className="text-base font-semibold text-gin-title mb-4">Add paragraph type</h2>

          <div className="mb-4">
            <label htmlFor="para-id" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Machine name
            </label>
            <input
              id="para-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full"
              placeholder="hero_banner"
              pattern="^[a-z][a-z0-9_]*$"
              required
            />
            <p className="text-[12px] text-gin-text-light mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>

          <div className="mb-4">
            <label htmlFor="para-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Label
            </label>
            <input
              id="para-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full"
              placeholder="Hero Banner"
              required
            />
          </div>

          {/* Field builder */}
          <div className="border-t border-gin-border pt-4 mt-4 mb-4">
            <h3 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider mb-3">Fields</h3>

            {newFields.length > 0 && (
              <div className="mb-4">
                <table className="w-full text-sm mb-3">
                  <thead>
                    <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Name</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Type</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
                      <th className="text-center px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Required</th>
                      <th className="text-right px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newFields.map((field, index) => (
                      <tr key={index} className="border-t border-gin-border">
                        <td className="px-3 py-2 text-sm text-gin-text font-mono text-xs">{field.name}</td>
                        <td className="px-3 py-2 text-sm text-gin-text-light">{field.type}</td>
                        <td className="px-3 py-2 text-sm text-gin-text">{field.label}</td>
                        <td className="px-3 py-2 text-sm text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            field.required ? 'bg-gin-primary-light text-gin-primary' : 'bg-gray-100 text-gin-text-light'
                          }`}>
                            {field.required ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveField(index)}
                            className="text-sm text-gin-danger hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 items-end">
              <div>
                <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Name</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full"
                  placeholder="field_title"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Type</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  className="w-full"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="select">Select</option>
                  <option value="reference">Reference</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Label</label>
                <input
                  type="text"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  className="w-full"
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gin-text py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
                  />
                  Required
                </label>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="w-full border border-gin-border text-gin-text rounded-gin-s px-3 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
                >
                  Add field
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
            >
              Create paragraph type
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewFields([]); }}
              className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">ID</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Fields</th>
              <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border font-medium">{type.label}</td>
                <td className="px-4 py-3 text-sm border-t border-gin-border">
                  <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">{type.id}</code>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">
                  {type.fields ? type.fields.length : 0}
                </td>
                <td className="px-4 py-3 text-sm text-right border-t border-gin-border">
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gin-text-light">
                  No paragraph types configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createParagraphType, deleteParagraphType } from '@/app/(admin)/_actions/system';
import { useToast } from '@/components/toast';

interface ParagraphField {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

export function DeleteParagraphTypeButton({ typeId }: { typeId: string }) {
  const router = useRouter();
  const { error: showError } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Delete the "${typeId}" paragraph type?`)) return;
    const result = await deleteParagraphType(typeId);
    if (result.success) {
      router.refresh();
    } else {
      showError(result.error ?? 'Failed to delete paragraph type');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-gin-danger hover:underline"
    >
      Delete
    </button>
  );
}

export function CreateParagraphTypeForm() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newFields, setNewFields] = useState<ParagraphField[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New field builder row
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);

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
    const result = await createParagraphType({
      id: newId,
      label: newLabel,
      fields: newFields,
    });
    if (result.success) {
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewFields([]);
      setSuccess('Paragraph type created.');
      router.refresh();
    } else {
      setError(result.error ?? 'Failed to create paragraph type');
    }
  };

  return (
    <>
      <button
        onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
        className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
      >
        Add paragraph type
      </button>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="mt-4 bg-white border border-gin-border rounded-gin p-6 mb-5 max-w-2xl">
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
    </>
  );
}

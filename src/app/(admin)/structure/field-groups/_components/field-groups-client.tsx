'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFieldGroup, deleteFieldGroup } from '@/app/(admin)/_actions/system';
import { useToast } from '@/components/toast';

interface GroupInfo {
  id: string;
  label: string;
}

const FORMAT_OPTIONS = [
  { value: 'fieldset', label: 'Fieldset' },
  { value: 'tabs', label: 'Tabs' },
  { value: 'tab', label: 'Tab' },
  { value: 'details', label: 'Details' },
  { value: 'accordion', label: 'Accordion' },
  { value: 'accordion_item', label: 'Accordion item' },
  { value: 'html_element', label: 'HTML element' },
];

export function DeleteFieldGroupButton({
  entityType,
  bundle,
  viewMode,
  groupId,
  label,
}: {
  entityType: string;
  bundle: string;
  viewMode: string;
  groupId: string;
  label: string;
}) {
  const router = useRouter();
  const { error: showError } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Delete the "${label}" field group?`)) return;
    const result = await deleteFieldGroup({ entityType, bundle, viewMode, groupId });
    if (result.success) {
      router.refresh();
    } else {
      showError(result.error ?? 'Failed to delete field group');
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

export function CreateFieldGroupForm({
  entityType,
  bundle,
  viewMode,
  existingGroups,
}: {
  entityType: string;
  bundle: string;
  viewMode: string;
  existingGroups: GroupInfo[];
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newFormat, setNewFormat] = useState('fieldset');
  const [newParent, setNewParent] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const result = await createFieldGroup({
      entityType,
      bundle,
      viewMode,
      name: newName,
      label: newLabel,
      format: newFormat,
      parent: newParent || undefined,
      description: newDescription,
      open: newOpen,
    });
    if (result.success) {
      setShowAdd(false);
      setNewName('');
      setNewLabel('');
      setNewFormat('fieldset');
      setNewParent('');
      setNewDescription('');
      setNewOpen(false);
      setSuccess('Field group created.');
      router.refresh();
    } else {
      setError(result.error ?? 'Failed to create field group');
    }
  };

  return (
    <>
      <button
        onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
        className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
      >
        Add field group
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
        <form onSubmit={handleCreate} className="mt-4 bg-white border border-gin-border rounded-gin p-6 mb-5 max-w-xl">
          <h2 className="text-base font-semibold text-gin-title mb-4">Add field group</h2>
          <div className="mb-4">
            <label htmlFor="fg-name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Machine name
            </label>
            <input
              id="fg-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full"
              placeholder="group_content"
              pattern="^[a-z][a-z0-9_]*$"
              required
            />
            <p className="text-[12px] text-gin-text-light mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>
          <div className="mb-4">
            <label htmlFor="fg-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Label
            </label>
            <input
              id="fg-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full"
              placeholder="Content"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="fg-format" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Format
            </label>
            <select
              id="fg-format"
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              className="w-full"
              required
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {existingGroups.length > 0 && (
            <div className="mb-4">
              <label htmlFor="fg-parent" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Parent group
              </label>
              <select
                id="fg-parent"
                value={newParent}
                onChange={(e) => setNewParent(e.target.value)}
                className="w-full"
              >
                <option value="">-- None (top level) --</option>
                {existingGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="fg-description" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Description
            </label>
            <input
              id="fg-description"
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full"
              placeholder="Optional description"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-gin-text cursor-pointer">
              <input
                type="checkbox"
                checked={newOpen}
                onChange={(e) => setNewOpen(e.target.checked)}
                className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              Open by default
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
            >
              Create field group
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
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

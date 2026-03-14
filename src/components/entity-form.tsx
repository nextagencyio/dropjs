'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Calendar, Clock, Loader2, Eye } from 'lucide-react';
import {
  loadEntityTypeDefinitionsAction,
  loadEntityAction,
  createEntity,
  updateEntity,
  createPreviewAction,
} from '@/app/(admin)/_actions/entity';
import { FieldWidget } from './field-widget';

interface FieldDefinition {
  type: string;
  label: string;
  required?: boolean;
  cardinality?: number;
  weight?: number;
  settings?: Record<string, unknown>;
}

interface EntityTypeDefinition {
  entity_type: string;
  bundle: string;
  label: string;
  description?: string;
  fields: Record<string, FieldDefinition>;
}

interface EntityFormProps {
  entityType: string;
  bundle: string;
  entityId?: number;
}

const BASE_FIELDS = new Set(['nid', 'uuid', 'type', 'uid', 'created', 'changed']);

export function EntityForm({ entityType, bundle, entityId }: EntityFormProps) {
  const router = useRouter();
  const [definition, setDefinition] = useState<EntityTypeDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({
    title: '',
    status: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const typesResult = await loadEntityTypeDefinitionsAction();
        if (!typesResult.success) {
          setError(typesResult.error || 'Failed to load entity types');
          setLoading(false);
          return;
        }
        const types = typesResult.data as EntityTypeDefinition[];
        const def = types.find(
          (t) => t.entity_type === entityType && t.bundle === bundle,
        );
        if (!def) {
          setError(`Entity type ${entityType}:${bundle} not found`);
          setLoading(false);
          return;
        }
        setDefinition(def);

        if (entityId) {
          const entityResult = await loadEntityAction(entityType, entityId);
          if (!entityResult.success) {
            setError(entityResult.error || 'Failed to load entity');
            setLoading(false);
            return;
          }
          setFormData(entityResult.data as Record<string, unknown>);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
      setLoading(false);
    }
    load();
  }, [entityType, bundle, entityId]);

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const dataToSave = asDraft
      ? { ...formData, status: false }
      : formData;

    try {
      const result = entityId
        ? await updateEntity(entityType, bundle, entityId, dataToSave)
        : await createEntity(entityType, bundle, dataToSave);
      if (!result.success) {
        setError(result.error || 'Save failed');
        setSaving(false);
        return;
      }
      router.push('/content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setError(null);
    try {
      const result = await createPreviewAction(entityType, bundle, formData);
      if (!result.success) {
        setError(result.error || 'Preview failed');
        return;
      }
      const { id } = result.data as { id: string };
      window.open(`/preview/${id}`, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  const setField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="animate-pulse mt-6 space-y-5">
        <div className="flex gap-8">
          <div className="flex-1 space-y-5">
            <div className="h-12 bg-gin-bg-layer2 rounded-gin-s w-full" />
            <div className="h-48 bg-gin-bg-layer2 rounded-gin-s w-full" />
            <div className="h-10 bg-gin-bg-layer2 rounded-gin-s w-36" />
          </div>
          <div className="w-72 shrink-0">
            <div className="h-40 bg-gin-bg-layer2 rounded-gin" />
          </div>
        </div>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="mt-6 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm flex items-start gap-2">
        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
        {error ?? 'Entity type not found'}
      </div>
    );
  }

  const customFields = Object.entries(definition.fields).filter(
    ([fieldName]) => !BASE_FIELDS.has(fieldName) && fieldName !== 'title' && fieldName !== 'status',
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm mb-5 flex items-start gap-2">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-8 items-start mt-6">
        {/* Main content area */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title field */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-[13px] font-semibold text-gin-text-light mb-1.5 uppercase tracking-wider">
              Title <span className="text-gin-danger">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={(formData.title as string) ?? ''}
              onChange={(e) => setField('title', e.target.value)}
              required
              placeholder="Enter a title..."
              className="w-full px-4 py-3 text-lg font-medium border border-gin-border-form rounded-gin-s bg-white text-gin-title placeholder-gin-text-light/50 tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
            />
          </div>

          {/* Custom fields */}
          {customFields.map(([fieldName, fieldDef]) => (
            <FieldWidget
              key={fieldName}
              fieldName={fieldName}
              field={fieldDef}
              value={formData[fieldName]}
              onChange={(val) => setField(fieldName, val)}
            />
          ))}
        </div>

        {/* Sidebar -- meta panel */}
        <div className="w-72 shrink-0">
          <div className="sticky top-20 bg-white border border-gin-border rounded-gin overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gin-bg-layer2 border-b border-gin-border">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gin-text-light">
                Status
              </h3>
            </div>
            <div className="px-4 py-5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.status)}
                    onChange={(e) => setField('status', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${Boolean(formData.status) ? 'bg-gin-primary' : 'bg-gray-300'}`} />
                  <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${Boolean(formData.status) ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gin-text group-hover:text-gin-title transition-colors">
                  Published
                </span>
              </label>

              {entityId && Boolean(formData.created) && (
                <div className="mt-5 pt-4 space-y-2.5 border-t border-gin-border">
                  <div className="flex items-center gap-2 text-[13px]">
                    <Calendar className="w-4 h-4 text-gin-text-light shrink-0" />
                    <div>
                      <span className="font-medium text-gin-text">Created</span>
                      <span className="text-gin-text-light ml-1.5">
                        {new Date(
                          typeof formData.created === 'number'
                            ? (formData.created as number) * 1000
                            : formData.created as string
                        ).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {Boolean(formData.changed) && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <Clock className="w-4 h-4 text-gin-text-light shrink-0" />
                      <div>
                        <span className="font-medium text-gin-text">Updated</span>
                        <span className="text-gin-text-light ml-1.5">
                          {new Date(
                            typeof formData.changed === 'number'
                              ? (formData.changed as number) * 1000
                              : formData.changed as string
                          ).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gin-border">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-gin-primary text-white rounded-gin-s px-6 py-2.5 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
        >
          {saving && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {saving ? 'Saving...' : entityId ? 'Save' : 'Save and publish'}
        </button>
        {!entityId && (
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
            className="px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors bg-white text-gin-text border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2"
          >
            Save as draft
          </button>
        )}
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors bg-white text-gin-text border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2"
        >
          <Eye className="w-4 h-4 text-gin-text-light" />
          Preview
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => router.push('/content')}
          className="px-5 py-2.5 text-sm font-medium transition-colors text-gin-text-light hover:text-gin-danger"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

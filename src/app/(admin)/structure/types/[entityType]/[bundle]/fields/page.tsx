import Link from 'next/link';
import { getEntityType } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteFieldButton, ReorderFieldButton } from './_components/fields-client';

interface FieldRow {
  name: string;
  label: string;
  type: string;
  required: boolean;
  cardinality: number;
  weight: number;
}

const FIELD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  string: { label: 'Text (plain)', color: 'bg-blue-50 text-blue-700' },
  text_long: { label: 'Text (long)', color: 'bg-blue-50 text-blue-700' },
  integer: { label: 'Integer', color: 'bg-purple-50 text-purple-700' },
  float: { label: 'Float', color: 'bg-purple-50 text-purple-700' },
  decimal: { label: 'Decimal', color: 'bg-purple-50 text-purple-700' },
  boolean: { label: 'Boolean', color: 'bg-yellow-50 text-yellow-700' },
  email: { label: 'Email', color: 'bg-green-50 text-green-700' },
  timestamp: { label: 'Timestamp', color: 'bg-orange-50 text-orange-700' },
  entity_reference: { label: 'Reference', color: 'bg-indigo-50 text-indigo-700' },
  image: { label: 'Image', color: 'bg-pink-50 text-pink-700' },
  list_string: { label: 'List (text)', color: 'bg-teal-50 text-teal-700' },
  json: { label: 'JSON', color: 'bg-gray-100 text-gray-700' },
};

export default async function ContentTypeFieldsPage({
  params,
}: {
  params: Promise<{ entityType: string; bundle: string }>;
}) {
  await requirePermission('administer content types');
  const { entityType, bundle } = await params;
  const definition = await getEntityType(entityType, bundle);

  if (!definition) {
    return (
      <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
        Content type not found.
      </div>
    );
  }

  const fields: FieldRow[] = Object.entries(definition.fields)
    .map(([name, field]) => ({
      name,
      label: field.label,
      type: field.type,
      required: field.required ?? false,
      cardinality: field.cardinality ?? 1,
      weight: (field.weight as number) ?? 0,
    }))
    .sort((a, b) => a.weight - b.weight);

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
        <span className="text-sm text-gin-text-light">{definition.label}</span>
      </nav>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          {definition.label} -- Fields
        </h1>
        <Link
          href={`/structure/types/${entityType}/${bundle}/fields/add`}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          + Add field
        </Link>
      </div>
      <p className="text-sm text-gin-text-light mb-3">
        {definition.entity_type}:{definition.bundle}
        {definition.description && ` -- ${definition.description}`}
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gin-border">
        <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-primary border-b-2 border-gin-primary -mb-px">
          Manage fields
        </span>
        <Link
          href={`/structure/types/${entityType}/${bundle}/display`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-text-light border-b-2 border-transparent hover:text-gin-text hover:border-gin-border -mb-px transition-colors"
        >
          Manage display
        </Link>
        <Link
          href={`/structure/types/${entityType}/${bundle}/form-display`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-text-light border-b-2 border-transparent hover:text-gin-text hover:border-gin-border -mb-px transition-colors"
        >
          Manage form display
        </Link>
      </div>

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="w-16 px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Order</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field Name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Required</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Cardinality</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gin-text-light">
                  No fields defined.{' '}
                  <Link href={`/structure/types/${entityType}/${bundle}/fields/add`} className="text-gin-primary hover:underline">Add a field</Link>.
                </td>
              </tr>
            ) : (
              fields.map((f, idx) => {
                const typeInfo = FIELD_TYPE_LABELS[f.type];
                return (
                  <tr key={f.name} className="hover:bg-gin-bg-layer2/50 transition-colors">
                    <td className="text-center px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                      <div className="flex flex-col items-center gap-0.5">
                        <ReorderFieldButton
                          fieldName={f.name}
                          direction="up"
                          disabled={idx === 0}
                          entityType={entityType}
                          bundle={bundle}
                          fields={fields}
                        />
                        <ReorderFieldButton
                          fieldName={f.name}
                          direction="down"
                          disabled={idx === fields.length - 1}
                          entityType={entityType}
                          bundle={bundle}
                          fields={fields}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                      <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">
                        {f.name}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">{f.label}</td>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          typeInfo?.color ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {typeInfo?.label ?? f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      {f.required ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-gin-green">Yes</span>
                      ) : (
                        <span className="text-gin-text-light">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                      {f.cardinality === -1 ? 'Unlimited' : f.cardinality}
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/structure/types/${entityType}/${bundle}/fields/${f.name}/edit`}
                          className="text-sm text-gin-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteFieldButton
                          fieldName={f.name}
                          entityType={entityType}
                          bundle={bundle}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

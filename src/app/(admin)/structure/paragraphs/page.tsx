import Link from 'next/link';
import { getParagraphTypes } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteParagraphTypeButton, CreateParagraphTypeForm } from './_components/paragraphs-client';

export default async function ParagraphsPage() {
  await requirePermission('administer content types');
  const types = await getParagraphTypes();

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
        <CreateParagraphTypeForm />
      </div>

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
                  {type.fields ? (Array.isArray(type.fields) ? type.fields.length : Object.keys(type.fields).length) : 0}
                </td>
                <td className="px-4 py-3 text-sm text-right border-t border-gin-border">
                  <DeleteParagraphTypeButton typeId={type.id} />
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

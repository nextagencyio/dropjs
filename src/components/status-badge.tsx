'use client';

export function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
        published
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          published ? 'bg-emerald-500' : 'bg-gray-400'
        }`}
      />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

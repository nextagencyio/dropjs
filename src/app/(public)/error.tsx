'use client';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold text-gray-700 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-500 mb-4">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gin-primary text-white text-sm rounded hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

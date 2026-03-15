'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gin-title mb-2">Something went wrong</h2>
        <p className="text-sm text-gin-text-light mb-4">
          {process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gin-primary text-white text-sm rounded-gin hover:bg-gin-primary-hover transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PipelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Pipeline page error:', error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 rounded-lg border border-red-200 bg-red-50 text-red-900">
      <h2 className="text-lg font-semibold mb-2">Something went wrong on the Pipeline page</h2>
      <p className="text-sm mb-4">
        A client-side error occurred. This can happen if the backend is unreachable or returned unexpected data.
      </p>
      <p className="text-xs font-mono mb-4 truncate" title={error.message}>
        {error.message}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-3 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Try again
        </button>
        <Link
          href="/pipeline"
          className="px-3 py-2 rounded border border-red-300 text-red-800 text-sm font-medium hover:bg-red-100"
        >
          Reload pipeline page
        </Link>
        <Link
          href="/"
          className="px-3 py-2 rounded border border-[var(--ldv-border)] text-[var(--ldv-text-muted)] text-sm hover:bg-[var(--ldv-surface)]"
        >
          Go to overview
        </Link>
      </div>
      <p className="text-xs text-red-700 mt-4">
        Check the browser console (F12 → Console) for details.
      </p>
    </div>
  );
}

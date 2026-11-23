'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-lg border border-red-200 bg-red-50 shadow-sm">
        <h1 className="text-lg font-semibold text-red-800 mb-2">Application error</h1>
        <p className="text-sm text-gray-700 mb-4">
          A client-side exception occurred. Check the browser console for more information.
        </p>
        <p className="text-xs font-mono text-gray-600 mb-4 truncate" title={error.message}>
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

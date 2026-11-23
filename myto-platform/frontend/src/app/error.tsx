'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
    <div className="pc-state pc-state-error" role="alert">
      <h2>This screen could not be displayed</h2>
      <p className="pc-state-body">The console hit a client-side error. No coverage figures are shown in its place.</p>
      <p className="pc-state-body">{error.message}</p>
      <p>
        <button type="button" className="pc-btn" onClick={() => reset()}>
          Try again
        </button>{' '}
        <Link className="pc-btn pc-btn-ghost" href="/overview">
          Open the console
        </Link>
      </p>
    </div>
  );
}

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
    <div className="pc-state pc-state-error" role="alert">
      <h2>The control panel could not be displayed</h2>
      <p className="pc-state-body">
        A client-side error occurred. This can happen when the data service is unreachable. No pipeline run was started.
      </p>
      <p className="pc-state-body">{error.message}</p>
      <p>
        <button type="button" className="pc-btn" onClick={() => reset()}>
          Try again
        </button>{' '}
        <Link className="pc-btn pc-btn-ghost" href="/overview">
          National overview
        </Link>
      </p>
    </div>
  );
}

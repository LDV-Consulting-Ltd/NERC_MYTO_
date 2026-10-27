/**
 * Server-only base URL for the GridSight FastAPI service.
 *
 * Priority:
 * 1. BACKEND_URL — injected by Vercel service binding (do not set manually on Vercel)
 * 2. BACKEND_INTERNAL_URL — Docker Compose / self-hosted internal hop
 * 3. http://127.0.0.1:8000 — local uvicorn default
 *
 * Bindings resolve at runtime in Route Handlers / Server Components only
 * (not during `next build`, not in middleware).
 */
export function getBackendBaseUrl(): string {
  const fromBinding =
    typeof process !== 'undefined' ? process.env.BACKEND_URL?.trim() : undefined;
  if (fromBinding) return fromBinding.replace(/\/$/, '');

  const fromInternal =
    typeof process !== 'undefined' ? process.env.BACKEND_INTERNAL_URL?.trim() : undefined;
  if (fromInternal) return fromInternal.replace(/\/$/, '');

  return 'http://127.0.0.1:8000';
}

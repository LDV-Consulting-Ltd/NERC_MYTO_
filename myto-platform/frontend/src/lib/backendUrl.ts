/**
 * Server-only base URL for the GridSight FastAPI service.
 *
 * Priority:
 * 1. BACKEND_URL — injected by Vercel service binding (do not set manually on Vercel)
 * 2. BACKEND_INTERNAL_URL — required for Docker Compose / self-hosted (see .env.example)
 * 3. http://backend:8000 — Docker Compose service DNS (same as pre-Vercel proxy default)
 *
 * For host-local `next dev` + uvicorn (not in Compose), set explicitly:
 *   BACKEND_INTERNAL_URL=http://127.0.0.1:8000
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

  // Match historical proxy default so Compose works if the env var is omitted.
  return 'http://backend:8000';
}

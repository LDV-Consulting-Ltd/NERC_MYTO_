/**
 * Browser / client API base URL.
 *
 * Prefer same-origin `/api` so requests hit the Next.js Route Handler
 * (`app/api/v1/[...path]`), which forwards to FastAPI via BACKEND_URL binding
 * (Vercel) or BACKEND_INTERNAL_URL (Docker).
 *
 * Override with NEXT_PUBLIC_API_BASE_URL when calling the backend directly
 * (e.g. http://localhost:8000 during local API-only work). Do NOT include /v1.
 */
function resolvePublicApiBase(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL.trim()
      : '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Default: same-origin Next proxy (Vercel + Docker compose pattern).
  return '/api';
}

const RAW = resolvePublicApiBase();

export const API_BASE = RAW.replace(/\/$/, '');
export const V1 = `${API_BASE}/v1`;

/** Runtime API config for debug and dynamic health. Call in browser to get actual resolved values. */
export function getRuntimeApiConfig(): {
  envRaw: string;
  resolvedBase: string;
  resolvedV1: string;
  healthzUrl: string;
  healthUrl: string;
} {
  // Match resolvePublicApiBase(): only a non-empty trimmed string counts as set.
  // (Avoid `!= null` alone — empty string is not null but is not a usable base.)
  const raw =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const envRaw = trimmed || '(unset)';
  const resolvedBase = resolvePublicApiBase();
  const resolvedV1 = `${resolvedBase}/v1`;
  const healthzUrl = `${resolvedV1}/healthz`;
  const healthUrl = `${resolvedV1}/health`;
  return { envRaw, resolvedBase, resolvedV1, healthzUrl, healthUrl };
}

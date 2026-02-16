/**
 * Central API base URL. No reliance on Next rewrites — call backend directly.
 * Set NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:8000). Do NOT include /v1.
 */
const RAW = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.trim()
  : 'http://localhost:8000';

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
  const envRaw =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL != null
      ? String(process.env.NEXT_PUBLIC_API_BASE_URL).trim()
      : '(unset)';
  const resolvedBase = envRaw === '(unset)' || envRaw === '' ? 'http://localhost:8000' : envRaw.replace(/\/$/, '');
  const resolvedV1 = `${resolvedBase}/v1`;
  const healthzUrl = `${resolvedV1}/healthz`;
  const healthUrl = `${resolvedV1}/health`;
  return { envRaw, resolvedBase, resolvedV1, healthzUrl, healthUrl };
}

/**
 * Production-grade API proxy: forwards /api/v1/* to the FastAPI backend.
 *
 * Backend base URL (server-only; never NEXT_PUBLIC_*):
 * - BACKEND_URL — Vercel service binding (preferred on Vercel)
 * - BACKEND_INTERNAL_URL — Docker Compose / self-hosted
 * - http://127.0.0.1:8000 — local uvicorn
 *
 * Path mapping:
 * - /api/v1/tanna/*  → backend /api/v1/tanna/*  (Tanna connector mount)
 * - /api/v1/*        → backend /v1/*            (product API mount)
 */

import { getBackendBaseUrl } from '@/lib/backendUrl';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function sanitizeHeadersForForward(headers: Headers): Headers {
  const out = new Headers();
  const skip = new Set([
    'host',
    'content-length', // backend sets its own for response
    ...HOP_BY_HOP,
  ]);
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (skip.has(lower)) return;
    out.set(key, value);
  });
  return out;
}

function sanitizeHeadersForResponse(headers: Headers): Headers {
  const out = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    out.set(key, value);
  });
  return out;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function OPTIONS(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params;
  const pathSegments = Array.isArray(path) ? path : [path].filter(Boolean);
  const pathStr = pathSegments.length ? pathSegments.join('/') : '';
  const base = getBackendBaseUrl();
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  // Tanna connector is mounted at /api/v1/tanna on FastAPI; all other routes at /v1.
  const backendPath =
    pathSegments[0] === 'tanna' ? `/api/v1/${pathStr}` : `/v1/${pathStr}`;
  const targetUrl = `${base}${backendPath}${query ? `?${query}` : ''}`;

  const forwardHeaders = sanitizeHeadersForForward(request.headers);

  const init: RequestInit = {
    method: request.method,
    headers: forwardHeaders,
    duplex: 'half',
  };

  if (request.body && !['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ detail: `Proxy fetch failed: ${message}` }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'x-proxy': 'next',
          'x-proxy-target': targetUrl,
          'x-proxy-error': message,
        },
      }
    );
  }

  const responseHeaders = sanitizeHeadersForResponse(res.headers);
  responseHeaders.set('x-proxy', 'next');
  responseHeaders.set('x-proxy-target', targetUrl);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

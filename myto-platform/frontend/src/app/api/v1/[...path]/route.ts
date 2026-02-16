/**
 * Production-grade API proxy: forwards /api/v1/* to backend (Docker: backend:8000).
 * Uses BACKEND_INTERNAL_URL for the internal hop; do NOT use NEXT_PUBLIC_API_BASE_URL here.
 */

const BACKEND_BASE = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000';

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
  const base = BACKEND_BASE.replace(/\/$/, '');
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const targetUrl = `${base}/v1/${pathStr}${query ? `?${query}` : ''}`;

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

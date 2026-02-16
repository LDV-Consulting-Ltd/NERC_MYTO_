/** Authority brand (sidebar) */
export const COMPANY_NAME = 'LDV Consulting Ltd';

/** Product brand (main content header) */
export const PRODUCT_NAME = 'Utility Regulatory MYTO Intelligence Platform (URIP)';
export const PRODUCT_TAGLINE = 'National Electricity Regulatory Data Intelligence Platform';

export const QUERY_STALE_MS = 60 * 1000;       // 60s
export const QUERY_STALE_LONG_MS = 5 * 60 * 1000; // 5 min
export const QUERY_RETRY = 2;
export const DEBOUNCE_SEARCH_MS = 300;

export const PAGINATION_DEFAULT_LIMIT = 50;
export const MAP_CLUSTER_THRESHOLD = 50;
export const GEO_CONFIDENCE_THRESHOLD = 0.7;

export const ROLE_PUBLIC = 'PUBLIC';
export const ROLE_ADMIN = 'ADMIN';
export const ADMIN_MODE = process.env.NEXT_PUBLIC_ADMIN_MODE === 'true';

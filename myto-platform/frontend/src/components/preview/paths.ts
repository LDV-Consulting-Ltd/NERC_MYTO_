/** Logical console paths and the public routes that serve them. */

export const PREVIEW_BASE = '/preview/nerc-myto';

export type FeatureLink = {
  id: string;
  label: string;
  group: 'Intelligence' | 'Data Operations' | 'Catalog & Governance' | 'Access';
  preview: string;
  production: string | null;
  productionNote: string;
};

export const FEATURE_INVENTORY: FeatureLink[] = [
  {
    id: 'overview',
    label: 'National Overview',
    group: 'Intelligence',
    preview: PREVIEW_BASE,
    production: '/overview',
    productionNote: 'National overview',
  },
  {
    id: 'commitments',
    label: 'Commitments Explorer',
    group: 'Intelligence',
    preview: `${PREVIEW_BASE}/commitments`,
    production: '/explorer',
    productionNote: 'National Explorer',
  },
  {
    id: 'discos',
    label: 'DisCo Profiles',
    group: 'Intelligence',
    preview: `${PREVIEW_BASE}/discos`,
    production: '/discos',
    productionNote: 'DisCo Intelligence',
  },
  {
    id: 'map',
    label: 'Feeder Map',
    group: 'Intelligence',
    preview: `${PREVIEW_BASE}/map`,
    production: '/map',
    productionNote: 'National Map',
  },
  {
    id: 'orders',
    label: 'Regulatory Orders',
    group: 'Intelligence',
    preview: `${PREVIEW_BASE}/orders`,
    production: '/orders',
    productionNote: 'Regulatory orders',
  },
  {
    id: 'operations',
    label: 'Control Panel',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/operations`,
    production: '/pipeline',
    productionNote: 'Pipeline Operations',
  },
  {
    id: 'runs',
    label: 'Pipeline Runs',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/operations/runs`,
    production: '/runs',
    productionNote: 'Runs list',
  },
  {
    id: 'quality',
    label: 'Data Quality',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/operations/quality`,
    production: '/dq',
    productionNote: 'Data Quality',
  },
  {
    id: 'geocoding',
    label: 'Geocoding Review',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/operations/geocoding`,
    production: '/geocoding',
    productionNote: 'Geocoding review',
  },
  {
    id: 'bronze',
    label: 'Warehouse · Bronze',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/warehouse/bronze`,
    production: '/layers/bronze',
    productionNote: 'Bronze',
  },
  {
    id: 'silver',
    label: 'Warehouse · Silver',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/warehouse/silver`,
    production: '/layers/silver',
    productionNote: 'Silver',
  },
  {
    id: 'gold',
    label: 'Warehouse · Gold',
    group: 'Data Operations',
    preview: `${PREVIEW_BASE}/warehouse/gold`,
    production: '/layers/gold',
    productionNote: 'Gold Warehouse',
  },
  {
    id: 'datasets',
    label: 'Datasets',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog`,
    production: '/datasets',
    productionNote: 'Dataset catalog',
  },
  {
    id: 'metadata',
    label: 'Metadata Catalog',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/metadata`,
    production: '/metadata',
    productionNote: 'Metadata Catalog',
  },
  {
    id: 'governance',
    label: 'Governance',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/governance`,
    production: '/governance',
    productionNote: 'Governance & Lineage',
  },
  {
    id: 'lineage',
    label: 'Lineage',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/lineage`,
    production: '/lineage',
    productionNote: 'Lineage Explorer',
  },
  {
    id: 'architecture',
    label: 'Architecture',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/architecture`,
    production: '/architecture',
    productionNote: 'Architecture & Data Flow',
  },
  {
    id: 'observability',
    label: 'Observability',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/observability`,
    production: '/metrics',
    productionNote: 'Metrics & Observability',
  },
  {
    id: 'apis',
    label: 'APIs & Downloads',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/apis`,
    production: '/api-docs',
    productionNote: 'Data APIs & Downloads',
  },
  {
    id: 'coverage',
    label: 'Endpoint coverage',
    group: 'Catalog & Governance',
    preview: `${PREVIEW_BASE}/catalog/coverage`,
    production: '/coverage',
    productionNote: 'Endpoint Coverage Matrix',
  },
  {
    id: 'agent',
    label: 'Regulatory Intelligence Agent',
    group: 'Access',
    preview: `${PREVIEW_BASE}/agent`,
    production: '/agent',
    productionNote: 'Same agent endpoint and latest-snapshot scope',
  },
  {
    id: 'admin',
    label: 'Admin',
    group: 'Access',
    preview: `${PREVIEW_BASE}/admin`,
    production: '/admin',
    productionNote: 'Overrides and maintenance. Same local confirmation behavior.',
  },
];

export const FIXTURE_BASE = '/preview/fixtures';

const LOGICAL_ROUTES: Record<string, string> = {
  '': '/overview',
  '/commitments': '/explorer',
  '/discos': '/discos',
  '/map': '/map',
  '/orders': '/orders',
  '/operations': '/pipeline',
  '/operations/runs': '/runs',
  '/operations/quality': '/dq',
  '/operations/geocoding': '/geocoding',
  '/warehouse/bronze': '/layers/bronze',
  '/warehouse/silver': '/layers/silver',
  '/warehouse/gold': '/layers/gold',
  '/catalog': '/datasets',
  '/catalog/metadata': '/metadata',
  '/catalog/governance': '/governance',
  '/catalog/lineage': '/lineage',
  '/catalog/architecture': '/architecture',
  '/catalog/observability': '/metrics',
  '/catalog/apis': '/api-docs',
  '/catalog/coverage': '/coverage',
  '/agent': '/agent',
  '/admin': '/admin',
};

function logicalSuffix(path = ''): string {
  return path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
}

/** Public route for a logical console path. Sample layouts never use this prefix. */
export function productionPath(path = '/'): string {
  const suffix = logicalSuffix(path);
  if (Object.prototype.hasOwnProperty.call(LOGICAL_ROUTES, suffix)) return LOGICAL_ROUTES[suffix];
  if (suffix.startsWith('/discos/')) return `/disco/${suffix.slice('/discos/'.length)}`;
  if (suffix.startsWith('/operations/runs/')) return `/runs/${suffix.slice('/operations/runs/'.length)}`;
  return suffix || '/overview';
}

export function previewHref(
  path = '',
  demo = false,
  params?: Record<string, string | number | null | undefined>
): string {
  const suffix = logicalSuffix(path);
  const base = demo ? `${FIXTURE_BASE}${suffix}` : productionPath(suffix);
  const sp = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') sp.set(key, String(value));
    }
  }
  const q = sp.toString();
  return `${base}${q ? `?${q}` : ''}`;
}

const EXACT_NAV = new Set([
  '/overview',
  '/pipeline',
  '/datasets',
  FIXTURE_BASE,
  `${FIXTURE_BASE}/operations`,
  `${FIXTURE_BASE}/catalog`,
]);

export function isNavActive(href: string, pathname: string): boolean {
  const path = href.split('?')[0];
  if (EXACT_NAV.has(path)) return pathname === path;
  if (path === '/discos') return pathname === '/discos' || pathname.startsWith('/disco/');
  return pathname === path || pathname.startsWith(`${path}/`);
}

export type NavItem = { label: string; href: string; short: string };
export type NavGroup = { id: string; label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { label: 'National Overview', href: '/', short: 'OV' },
      { label: 'Commitments Explorer', href: '/commitments', short: 'EX' },
      { label: 'DisCo Profiles', href: '/discos', short: 'DC' },
      { label: 'Feeder Map', href: '/map', short: 'MP' },
      { label: 'Regulatory Orders', href: '/orders', short: 'OR' },
    ],
  },
  {
    id: 'operations',
    label: 'Data Operations',
    items: [
      { label: 'Control Panel', href: '/operations', short: 'CP' },
      { label: 'Pipeline Runs', href: '/operations/runs', short: 'RN' },
      { label: 'Data Quality', href: '/operations/quality', short: 'DQ' },
      { label: 'Geocoding Review', href: '/operations/geocoding', short: 'GC' },
      { label: 'Bronze', href: '/warehouse/bronze', short: 'BR' },
      { label: 'Silver', href: '/warehouse/silver', short: 'SV' },
      { label: 'Gold', href: '/warehouse/gold', short: 'GD' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog & Governance',
    items: [
      { label: 'Datasets', href: '/catalog', short: 'DS' },
      { label: 'Metadata Catalog', href: '/catalog/metadata', short: 'MD' },
      { label: 'Governance', href: '/catalog/governance', short: 'GV' },
      { label: 'Lineage', href: '/catalog/lineage', short: 'LN' },
      { label: 'Architecture', href: '/catalog/architecture', short: 'AR' },
      { label: 'Observability', href: '/catalog/observability', short: 'OB' },
      { label: 'APIs & Downloads', href: '/catalog/apis', short: 'API' },
      { label: 'Capability map', href: '/catalog/coverage', short: 'CV' },
    ],
  },
];

export const ACCESS_NAV: NavItem[] = [
  { label: 'Regulatory Intelligence Agent', href: '/agent', short: 'AG' },
  { label: 'Admin', href: '/admin', short: 'AD' },
];

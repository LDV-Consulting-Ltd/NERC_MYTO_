/** Preview routes and the production screens they preserve. */

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
    production: '/',
    productionNote: 'National Command Center',
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
    production: '/explorer',
    productionNote: 'No dedicated orders route. Source PDFs are evidence links on the explorer.',
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
    production: '/layers/silver',
    productionNote: 'Geocode coverage is a Silver layer widget. No separate review route.',
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
    production: '/metadata',
    productionNote: 'Dataset list lives on Metadata Catalog',
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

export function previewHref(
  path = '',
  demo = false,
  params?: Record<string, string | number | null | undefined>
): string {
  const suffix = path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  const sp = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') sp.set(key, String(value));
    }
  }
  if (demo) sp.set('demo', '1');
  const q = sp.toString();
  return `${PREVIEW_BASE}${suffix}${q ? `?${q}` : ''}`;
}

export function isNavActive(href: string, pathname: string): boolean {
  if (href === PREVIEW_BASE) return pathname === PREVIEW_BASE;
  if (href === `${PREVIEW_BASE}/operations`) return pathname === `${PREVIEW_BASE}/operations`;
  if (href === `${PREVIEW_BASE}/catalog`) return pathname === `${PREVIEW_BASE}/catalog`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type NavItem = { label: string; href: string; short: string };
export type NavGroup = { id: string; label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { label: 'National Overview', href: PREVIEW_BASE, short: 'OV' },
      { label: 'Commitments Explorer', href: `${PREVIEW_BASE}/commitments`, short: 'EX' },
      { label: 'DisCo Profiles', href: `${PREVIEW_BASE}/discos`, short: 'DC' },
      { label: 'Feeder Map', href: `${PREVIEW_BASE}/map`, short: 'MP' },
      { label: 'Regulatory Orders', href: `${PREVIEW_BASE}/orders`, short: 'OR' },
    ],
  },
  {
    id: 'operations',
    label: 'Data Operations',
    items: [
      { label: 'Control Panel', href: `${PREVIEW_BASE}/operations`, short: 'CP' },
      { label: 'Pipeline Runs', href: `${PREVIEW_BASE}/operations/runs`, short: 'RN' },
      { label: 'Data Quality', href: `${PREVIEW_BASE}/operations/quality`, short: 'DQ' },
      { label: 'Geocoding Review', href: `${PREVIEW_BASE}/operations/geocoding`, short: 'GC' },
      { label: 'Bronze', href: `${PREVIEW_BASE}/warehouse/bronze`, short: 'BR' },
      { label: 'Silver', href: `${PREVIEW_BASE}/warehouse/silver`, short: 'SV' },
      { label: 'Gold', href: `${PREVIEW_BASE}/warehouse/gold`, short: 'GD' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog & Governance',
    items: [
      { label: 'Datasets', href: `${PREVIEW_BASE}/catalog`, short: 'DS' },
      { label: 'Metadata Catalog', href: `${PREVIEW_BASE}/catalog/metadata`, short: 'MD' },
      { label: 'Governance', href: `${PREVIEW_BASE}/catalog/governance`, short: 'GV' },
      { label: 'Lineage', href: `${PREVIEW_BASE}/catalog/lineage`, short: 'LN' },
      { label: 'Architecture', href: `${PREVIEW_BASE}/catalog/architecture`, short: 'AR' },
      { label: 'Observability', href: `${PREVIEW_BASE}/catalog/observability`, short: 'OB' },
      { label: 'APIs & Downloads', href: `${PREVIEW_BASE}/catalog/apis`, short: 'API' },
      { label: 'Capability map', href: `${PREVIEW_BASE}/catalog/coverage`, short: 'CV' },
    ],
  },
];

export const ACCESS_NAV: NavItem[] = [
  { label: 'Regulatory Intelligence Agent', href: `${PREVIEW_BASE}/agent`, short: 'AG' },
  { label: 'Admin', href: `${PREVIEW_BASE}/admin`, short: 'AD' },
];

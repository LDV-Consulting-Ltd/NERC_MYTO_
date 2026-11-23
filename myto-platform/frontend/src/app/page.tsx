import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import '@/styles/landing.css';

export const metadata: Metadata = {
  title: 'LDV Data Console · NERC MYTO',
  description:
    'Explore published electricity supply commitments by distribution company, feeder, and service band.',
};

const COMPANY_SITE = 'https://ldvconsultingltd.ng/';
const NERC_MYTO = 'https://nerc.gov.ng/resource-category/myto';
const FILTER_KEYS = ['disco', 'year', 'month', 'band', 'q'];

const ENTRIES = [
  {
    href: '/explorer',
    title: 'Commitments Explorer',
    text: 'Filter published feeder commitments by distribution company, period, and service band.',
  },
  {
    href: '/map',
    title: 'Feeder Map',
    text: 'See mapped feeders beside the records that still have no coordinates.',
  },
  {
    href: '/discos',
    title: 'DisCo Profiles',
    text: 'Open a distribution company and its published commitment coverage.',
  },
  {
    href: '/orders',
    title: 'Regulatory Orders',
    text: 'Group the source orders and PDF evidence attached to published commitments.',
  },
];

type Search = Record<string, string | string[] | undefined>;

export default async function LandingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const hasFilter = FILTER_KEYS.some((key) => {
    const value = params[key];
    return (typeof value === 'string' && value !== '') || (Array.isArray(value) && value.some(Boolean));
  });
  if (hasFilter) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') query.set(key, value);
      else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    }
    redirect(`/overview?${query.toString()}`);
  }

  return (
    <div className="ldv-landing">
      <a className="ldv-skip" href="#landing-main">
        Skip to content
      </a>
      <header className="ldv-bar">
        <div className="ldv-brand">
          <span className="ldv-mark" aria-hidden="true">LDV</span>
          <div>
            <strong>LDV Consulting</strong>
            <span>LDV Data Console</span>
          </div>
        </div>
        <a className="ldv-bar-link" href={COMPANY_SITE} target="_blank" rel="noopener noreferrer">
          Company Website
        </a>
      </header>
      <main id="landing-main">
        <section className="ldv-hero">
          <div className="ldv-wrap">
            <p className="ldv-kicker">Electricity workspace</p>
            <h1>LDV Data Console · NERC MYTO</h1>
            <p>
              Explore published electricity supply commitments by distribution company, feeder, and service band.
            </p>
            <Link className="ldv-cta" href="/overview">
              Open NERC MYTO Console
            </Link>
          </div>
        </section>
        <section className="ldv-entries" aria-labelledby="workspace-links">
          <div className="ldv-wrap">
            <h2 id="workspace-links">Explore the workspace</h2>
            <div className="ldv-grid">
              {ENTRIES.map((entry) => (
                <Link key={entry.href} className="ldv-card" href={entry.href}>
                  <strong>{entry.title}</strong>
                  <span>{entry.text}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="ldv-foot">
        <div className="ldv-wrap">
          <div>
            <strong>LDV Consulting</strong>
            <p>NERC MYTO workspace for published electricity supply commitments.</p>
          </div>
          <nav aria-label="Sources and documentation">
            <a href={COMPANY_SITE} target="_blank" rel="noopener noreferrer">
              Company website
            </a>
            <a href={NERC_MYTO} target="_blank" rel="noopener noreferrer">
              NERC MYTO documents
            </a>
            <Link href="/api-docs">APIs and downloads</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

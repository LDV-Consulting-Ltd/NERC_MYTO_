'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { COMPANY_NAME } from '@/lib/constants';

const MAIN_NAV = [
  { label: 'Overview', href: '/' },
  { label: 'National Explorer', href: '/explorer' },
  { label: 'National Map', href: '/map' },
  { label: 'DisCo Intelligence', href: '/discos' },
  { label: 'Pipeline Operations', href: '/pipeline' },
  {
    label: 'Data Layers',
    children: [
      { label: 'Bronze', href: '/layers/bronze' },
      { label: 'Silver', href: '/layers/silver' },
      { label: 'Gold Warehouse', href: '/layers/gold' },
    ],
  },
  { label: 'Data Quality', href: '/dq' },
  { label: 'Metadata Catalog', href: '/metadata' },
  { label: 'Metrics & Observability', href: '/metrics' },
  { label: 'Governance & Lineage', href: '/governance' },
  { label: 'Lineage Explorer', href: '/lineage' },
  { label: 'Architecture & Data Flow', href: '/architecture' },
  { label: 'Regulatory Intelligence Agent', href: '/agent' },
  { label: 'Data APIs & Downloads', href: '/api-docs' },
];

const ADMIN_NAV = [
  { label: 'Admin', href: '/admin' },
  { label: 'Coverage', href: '/coverage' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [layersOpen, setLayersOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[var(--ldv-surface)] border-r border-[var(--ldv-border)] min-h-screen">
      <Link
        href="/"
        className="flex items-center gap-3 px-4 py-4 border-b border-[var(--ldv-border)] hover:bg-white/60 focus:bg-white/60 transition-colors"
        aria-label="Go to Overview"
      >
        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
          <Image
            src="/branding/ldv-logo.png"
            alt="LDV Consulting Ltd"
            width={44}
            height={44}
            className="object-contain"
            priority
          />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--ldv-primary)] leading-tight">
            {COMPANY_NAME}
          </div>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto py-2">
        {MAIN_NAV.map((s) =>
          'href' in s ? (
            <Link
              key={s.href}
              href={s.href}
              className={`block px-4 py-2.5 text-sm font-medium ${
                isActive(s.href)
                  ? 'bg-[var(--ldv-primary)] text-white'
                  : 'text-[var(--ldv-text-primary)] hover:bg-[var(--ldv-border)]/50'
              }`}
            >
              {s.label}
            </Link>
          ) : (
            <div key={s.label}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-sm font-medium text-left text-[var(--ldv-text-primary)] hover:bg-[var(--ldv-border)]/50 flex justify-between items-center"
                onClick={() => setLayersOpen((o) => !o)}
                aria-expanded={layersOpen}
              >
                {s.label}
              </button>
              {layersOpen &&
                (s as { children: { label: string; href: string }[] }).children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={`block pl-6 pr-4 py-1.5 text-sm ${
                      isActive(c.href)
                        ? 'bg-[var(--ldv-primary)]/10 text-[var(--ldv-primary)] font-medium border-l-2 border-[var(--ldv-accent)]'
                        : 'text-[var(--ldv-text-muted)] hover:bg-[var(--ldv-border)]/30'
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
            </div>
          )
        )}
        <div className="mt-auto pt-2 border-t border-[var(--ldv-border)]">
          <button
            type="button"
            className="w-full px-4 py-2 text-sm font-medium text-left text-[var(--ldv-text-muted)] hover:bg-[var(--ldv-border)]/50 flex justify-between items-center"
            onClick={() => setAdminOpen((o) => !o)}
            aria-expanded={adminOpen}
          >
            Admin
          </button>
          {adminOpen &&
            ADMIN_NAV.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block pl-6 pr-4 py-1.5 text-sm ${
                  isActive(a.href)
                    ? 'bg-[var(--ldv-primary)]/10 text-[var(--ldv-primary)] font-medium border-l-2 border-[var(--ldv-accent)]'
                    : 'text-[var(--ldv-text-muted)] hover:bg-[var(--ldv-border)]/30'
                }`}
              >
                {a.label}
              </Link>
            ))}
        </div>
      </nav>
    </aside>
  );
}

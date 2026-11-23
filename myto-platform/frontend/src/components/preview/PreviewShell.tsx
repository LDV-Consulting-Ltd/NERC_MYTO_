'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '@/styles/preview-console.css';
import { ACCESS_NAV, NAV_GROUPS, isNavActive, previewHref, productionPath } from './paths';
import { useDemo } from './useConsoleData';

const STORAGE_KEY = 'ldv-console-sidebar';
const COMPANY_SITE = 'https://ldvconsultingltd.ng/';

export default function PreviewShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/overview';
  const demo = useDemo();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dest = (logical: string) => previewHref(logical, demo);
  const liveHref = productionPath(demo ? pathname.replace(/^\/preview\/fixtures/, '') || '/' : '/');

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === 'collapsed') setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'open');
      return next;
    });
  };

  const className = [
    'ldv-console',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'is-mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <a className="pc-skip" href="#console-main">
        Skip to content
      </a>
      <button type="button" className="pc-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      <aside className="pc-sidebar" aria-label="LDV Data Console">
        <Link className="pc-brand" href={dest('/')}>
          <span className="pc-mark" aria-hidden="true">LDV</span>
          <span className="pc-brand-text">
            <span className="pc-brand-name">LDV Data Console</span>
            <span className="pc-brand-sub">Electricity workspace</span>
          </span>
        </Link>
        <nav className="pc-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="pc-nav-group">
              <p className="pc-nav-label">{group.label}</p>
              {group.items.map((item) => {
                const href = dest(item.href);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    aria-current={isNavActive(href, pathname) ? 'page' : undefined}
                    title={item.label}
                  >
                    <span className="pc-nav-short" aria-hidden="true">{item.short}</span>
                    <span className="pc-nav-full">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="pc-side-foot">
          <p className="pc-nav-label">Access</p>
          {ACCESS_NAV.map((item) => {
            const href = dest(item.href);
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={isNavActive(href, pathname) ? 'page' : undefined}
                title={item.label}
              >
                <span className="pc-nav-short" aria-hidden="true">{item.short}</span>
                <span className="pc-nav-full">{item.label}</span>
              </Link>
            );
          })}
          <a className="pc-side-link" href={COMPANY_SITE} target="_blank" rel="noopener noreferrer">
            Company website
          </a>
          <p className="pc-side-extra">LDV Consulting · NERC MYTO workspace</p>
        </div>
      </aside>
      <div className="pc-workspace">
        {demo && (
          <div className="pc-demo-banner" role="status">
            Sample records for layout review. These figures are not a published NERC snapshot.{' '}
            <Link href={liveHref}>Open the live console</Link>
          </div>
        )}
        <header className="pc-topbar">
          <button type="button" className="pc-icon-btn pc-menu" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}>
            Menu
          </button>
          <button
            type="button"
            className="pc-icon-btn"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <div className="pc-topbar-title">
            <div className="pc-topbar-kicker">LDV Data Console</div>
            <div className="pc-topbar-name">Electricity · NERC MYTO</div>
          </div>
          <div className="pc-topbar-actions">
            <a className="pc-btn pc-btn-ghost" href={COMPANY_SITE} target="_blank" rel="noopener noreferrer">
              Company website
            </a>
            {demo ? (
              <Link className="pc-btn" href={liveHref}>Open live console</Link>
            ) : (
              <Link className="pc-btn pc-btn-ghost" href="/">Landing page</Link>
            )}
          </div>
        </header>
        <main id="console-main" className="pc-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';

export function PageHeader({
  title,
  description,
  period,
  actions,
}: {
  title: string;
  description?: string;
  period?: string | null;
  actions?: React.ReactNode;
  /** Kept so existing screens can pass it. The console no longer links out to a second interface. */
  productionHref?: string | null;
  productionLabel?: string;
}) {
  return (
    <header className="pc-page-head">
      <div className="pc-page-head-copy">
        <h1>{title}</h1>
        {period != null && (
          <p className="pc-period">
            <span>Published reporting period</span>
            <strong>{period}</strong>
          </p>
        )}
        {description && <p className="pc-lede">{description}</p>}
      </div>
      {actions && <div className="pc-page-head-actions">{actions}</div>}
    </header>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'demo';
  children: React.ReactNode;
}) {
  return <span className={`pc-pill pc-pill-${tone}`}>{children}</span>;
}

export function MetricTile({
  label,
  value,
  detail,
  demo = false,
}: {
  label: string;
  value: string;
  detail?: string;
  demo?: boolean;
}) {
  return (
    <article className="pc-metric">
      <p className="pc-metric-label">{label}</p>
      <p className="pc-metric-value pc-num">{value}</p>
      {detail && <p className="pc-metric-detail">{detail}</p>}
      {demo && <StatusPill tone="demo">Sample</StatusPill>}
    </article>
  );
}

export function StateBlock({
  tone,
  title,
  children,
}: {
  tone: 'loading' | 'empty' | 'error' | 'awaiting' | 'partial';
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`pc-state pc-state-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <h2>{title}</h2>
      {children && <div className="pc-state-body">{children}</div>}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="pc-state pc-state-loading" role="status">
      <h2>Loading</h2>
      <div className="pc-skel" />
      <div className="pc-skel" />
      <div className="pc-skel pc-skel-short" />
    </div>
  );
}

export function GapNote({ children }: { children: React.ReactNode }) {
  return <p className="pc-gap">{children}</p>;
}

export type SortColumn<T> = {
  id: string;
  header: string;
  sticky?: boolean;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number | null;
  cell: (row: T) => React.ReactNode;
};

export function SortTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  onRow,
  selectedKey,
  empty,
}: {
  rows: T[];
  columns: SortColumn<T>[];
  rowKey: (row: T) => string;
  caption: string;
  onRow?: (row: T) => void;
  selectedKey?: string | null;
  empty?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return rows;
    const read = column.sortValue;
    return [...rows].sort((a, b) => {
      const av = read(a);
      const bv = read(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const base = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? base : -base;
    });
  }, [rows, sort, columns]);

  if (!rows.length) {
    return empty ?? <StateBlock tone="empty" title="No matching results" />;
  }

  return (
    <div className="pc-table-wrap">
      <table className="pc-table">
        <caption className="pc-sr">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.id === column.id ? sort.dir : undefined;
              return (
                <th
                  key={column.id}
                  scope="col"
                  className={column.sticky ? 'is-sticky' : undefined}
                  aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
                  style={{ textAlign: column.align ?? 'left' }}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="pc-sort"
                      onClick={() =>
                        setSort((current) =>
                          current?.id !== column.id
                            ? { id: column.id, dir: 'asc' }
                            : { id: column.id, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                        )
                      }
                    >
                      {column.header}
                      <span aria-hidden="true">{active === 'asc' ? '↑' : active === 'desc' ? '↓' : '↕'}</span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey != null && selectedKey === key;
            return (
              <tr
                key={key}
                data-row-id={key}
                className={selected ? 'is-selected' : undefined}
                aria-selected={onRow ? selected : undefined}
                tabIndex={onRow ? 0 : undefined}
                onClick={onRow ? () => onRow(row) : undefined}
                onKeyDown={
                  onRow
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRow(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={column.sticky ? 'is-sticky' : undefined}
                    style={{ textAlign: column.align ?? 'left' }}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CountLabel({ shown, total }: { shown: number; total: number | null }) {
  const text =
    total == null ? `${formatNumber(shown)} loaded` : `${formatNumber(shown)} of ${formatNumber(total)}`;
  return (
    <p className="pc-count pc-num" aria-live="polite">
      Results <strong>{text}</strong>
    </p>
  );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="pc-chip">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`}>
        Remove
      </button>
    </span>
  );
}

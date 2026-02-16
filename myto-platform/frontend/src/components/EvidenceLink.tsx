'use client';

import { useState } from 'react';

interface EvidenceLinkProps {
  pdfUrl?: string | null;
  pageNo?: number | null;
  label?: string;
}

export default function EvidenceLink({ pdfUrl, pageNo, label }: EvidenceLinkProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasEvidence = pdfUrl || pageNo != null;
  const displayLabel = label ?? (pageNo != null ? `PDF p.${pageNo}` : 'PDF');

  if (!hasEvidence) return <span className="text-[var(--ldv-text-muted)]">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="text-support hover:underline text-sm font-medium"
      >
        {displayLabel}
      </button>
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Evidence source"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-4 border border-[var(--ldv-border)]">
            <h3 className="font-semibold text-primary mb-2">Source evidence</h3>
            {pdfUrl && (
              <p className="text-sm text-[var(--ldv-text-muted)] mb-1">
                <span className="font-medium">URL:</span>{' '}
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-support break-all"
                >
                  {pdfUrl}
                </a>
              </p>
            )}
            {pageNo != null && (
              <p className="text-sm text-[var(--ldv-text-muted)]">
                <span className="font-medium">Page:</span> {pageNo}
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-secondary"
              >
                Close
              </button>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary ml-2"
                >
                  Open PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

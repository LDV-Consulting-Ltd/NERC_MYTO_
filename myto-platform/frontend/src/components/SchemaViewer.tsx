'use client';

interface Column {
  name?: string;
  type?: string;
  description?: string;
}

interface SchemaViewerProps {
  name: string;
  columns: Column[] | unknown[];
}

export default function SchemaViewer({ name, columns }: SchemaViewerProps) {
  const cols = (columns as Column[]).filter(
    (c) => c && typeof c === 'object' && ('name' in c || 'type' in c)
  );

  if (!cols.length) {
    return (
      <p className="text-[var(--ldv-text-muted)] py-4">No schema columns.</p>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-primary mb-2">{name}</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {cols.map((c, i) => (
              <tr key={i}>
                <td className="font-mono text-sm">{(c as Column).name ?? '—'}</td>
                <td className="text-[var(--ldv-text-muted)]">{(c as Column).type ?? '—'}</td>
                <td className="text-sm">{(c as Column).description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

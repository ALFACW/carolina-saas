import React from 'react'

export function Table({ columns, data, loading, emptyMessage = 'Sin registros', onRowClick }) {
  if (loading) return (
    <div className="w-full bg-white rounded-xl border border-border shadow-sm">
      <div className="p-10 text-center text-sm text-ink-2">Cargando...</div>
    </div>
  )
  return (
    <div className="w-full bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-soft">
              {columns.map(col => (
                <th key={col.key} className="px-5 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-ink-2">
                  {emptyMessage}
                </td>
              </tr>
            ) : data.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border/60 hover:bg-surface-soft transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-3.5 text-ink" onClick={col.stopPropagation ? e => e.stopPropagation() : undefined}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

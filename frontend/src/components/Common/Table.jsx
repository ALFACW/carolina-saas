import React from 'react'
import EmptyState from './EmptyState'

function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="skeleton h-4 rounded" style={{ width: i === 0 ? '60%' : i === cols - 1 ? '30%' : '80%' }} />
        </td>
      ))}
    </tr>
  )
}

export function Table({ columns, data, loading, emptyMessage = 'Sin registros', emptyPreset, emptyAction, onRowClick }) {
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
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState preset={emptyPreset} desc={!emptyPreset ? emptyMessage : undefined} action={emptyAction} compact />
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

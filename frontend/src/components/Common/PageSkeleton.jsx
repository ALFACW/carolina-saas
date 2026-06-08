import React from 'react'

// Fila de skeleton para tablas
function TableRowSkeleton({ cols = 5 }) {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="skeleton h-4 flex-1 rounded" style={{ maxWidth: i === 0 ? '180px' : undefined }} />
      ))}
    </div>
  )
}

// Skeleton de tabla completa (cabecera + filas)
export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-surface-soft border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" style={{ maxWidth: i === 0 ? '120px' : undefined }} />
        ))}
      </div>
      {/* Filas */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  )
}

// Skeleton de tarjeta KPI (para Dashboard)
export function KPISkeleton({ count = 4 }) {
  return (
    <div className={`grid gap-4 grid-cols-2 md:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-sm space-y-3">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  )
}

// Skeleton de lista de productos / clientes con avatar
export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="card p-0 overflow-hidden divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-40 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

// Skeleton genérico de página (título + tabla)
export default function PageSkeleton({ rows = 8, cols = 5, showFilters = true }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-40 rounded" />
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>
      {/* Filtros */}
      {showFilters && (
        <div className="flex gap-3">
          <div className="skeleton h-9 w-64 rounded-lg" />
          <div className="skeleton h-9 w-36 rounded-lg" />
          <div className="skeleton h-9 w-36 rounded-lg" />
        </div>
      )}
      {/* Tabla */}
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  )
}

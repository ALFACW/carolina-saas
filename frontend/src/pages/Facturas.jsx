import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, XCircle, Download } from 'lucide-react'
import { facturasService } from '../services/facturas'
import { Table } from '../components/Common/Table'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'
import { exportarFacturas } from '../lib/exportExcel'
const ESTADO_COLORS = {
  enviada: 'bg-green-100 text-green-700',
  aceptada: 'bg-blue-100 text-blue-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  rechazada: 'bg-red-100 text-red-700',
  anulada: 'bg-gray-100 text-gray-500',
}

export default function Facturas() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState({ estado: '', fecha_desde: '', fecha_hasta: '' })
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['facturas', search, page],
    queryFn: () => facturasService.getAll({ ...search, page, limit: 20 }),
    keepPreviousData: true,
  })

  const anularMutation = useMutation({
    mutationFn: facturasService.anular,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }),
  })

  const columns = [
    { key: 'numero_factura', label: 'Número', render: v => <span className="font-mono text-sm">{v || '-'}</span> },
    { key: 'cliente_nombre', label: 'Cliente', render: v => v || 'Consumidor final' },
    { key: 'total', label: 'Total', render: v => <span className="font-bold text-blue-700">{COP(v)}</span> },
    { key: 'metodo_pago', label: 'Pago', render: v => v?.replace('_', ' ') },
    { key: 'estado', label: 'Estado', render: (v, row) => (
      <div className="flex flex-wrap items-center gap-1">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_COLORS[v] || 'bg-gray-100 text-gray-600'}`}>{v}</span>
        {row.es_credito && parseFloat(row.saldo_pendiente || 0) > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Crédito pendiente</span>
        )}
      </div>
    )},
    { key: 'fecha_emision', label: 'Fecha', render: v => new Date(v).toLocaleDateString('es-CO') },
    { key: 'acciones', label: '', stopPropagation: true, render: (_, row) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Link to={`/facturas/${row.id}`} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Ver detalle">
          <Eye className="w-4 h-4" />
        </Link>
        {row.estado !== 'anulada' && (
          <button
            onClick={() => { if (window.confirm('¿Anular esta factura?')) anularMutation.mutate(row.id) }}
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
            title="Anular factura"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink mb-2">Facturación DIAN</h1>
          <p className="text-ink-2">Gestiona tus facturas electrónicas ({data?.total || 0})</p>
        </div>
        <Button variant="secondary" onClick={() => exportarFacturas(data?.facturas || [])}>
          <Download className="w-3.5 h-3.5" />Excel
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap gap-3">
        <select value={search.estado} onChange={e => setSearch(p => ({ ...p, estado: e.target.value }))}
          className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white text-ink">
          <option value="">Todos los estados</option>
          <option value="enviada">Enviada</option>
          <option value="aceptada">Aceptada</option>
          <option value="pendiente">Pendiente</option>
          <option value="anulada">Anulada</option>
        </select>
        <input type="date" value={search.fecha_desde} onChange={e => setSearch(p => ({ ...p, fecha_desde: e.target.value }))}
          className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 text-ink" />
        <input type="date" value={search.fecha_hasta} onChange={e => setSearch(p => ({ ...p, fecha_hasta: e.target.value }))}
          className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 text-ink" />
      </div>

      <Table
        columns={columns}
        data={data?.facturas || []}
        loading={isLoading}
        emptyMessage="No hay facturas"
        onRowClick={(row) => navigate(`/facturas/${row.id}`)}
      />

      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 text-ink hover:bg-surface-soft">Anterior</button>
          <span className="text-sm text-ink-2">Página {page} de {Math.ceil(data.total / 20)}</span>
          <button disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 text-ink hover:bg-surface-soft">Siguiente</button>
        </div>
      )}
    </div>
  )
}

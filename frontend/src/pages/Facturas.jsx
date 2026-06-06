import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, XCircle, Download, X } from 'lucide-react'
import { toast } from 'sonner'
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
  anulada: 'bg-surface-soft text-ink-2',
}

export default function Facturas() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState({ estado: '', fecha_desde: '', fecha_hasta: '', totalMin: '', totalMax: '' })
  const [page, setPage] = useState(1)

  // Destructure for query (only backend-relevant fields)
  const { totalMin, totalMax, ...filtrosBackend } = filtros

  const { data, isLoading } = useQuery({
    queryKey: ['facturas', filtrosBackend, page],
    queryFn: () => facturasService.getAll({ ...filtrosBackend, page, limit: 20 }),
    keepPreviousData: true,
  })

  // Filter by total range in frontend
  const facturasRaw = data?.facturas || []
  const facturasFiltradas = facturasRaw.filter(f => {
    const t = parseFloat(f.total || 0)
    if (totalMin !== '' && !isNaN(parseFloat(totalMin)) && t < parseFloat(totalMin)) return false
    if (totalMax !== '' && !isNaN(parseFloat(totalMax)) && t > parseFloat(totalMax)) return false
    return true
  })

  const hayFiltrosActivos = filtros.estado || filtros.fecha_desde || filtros.fecha_hasta || filtros.totalMin || filtros.totalMax

  const limpiarFiltros = () => {
    setFiltros({ estado: '', fecha_desde: '', fecha_hasta: '', totalMin: '', totalMax: '' })
    setPage(1)
  }

  const anularMutation = useMutation({
    mutationFn: facturasService.anular,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facturas'] }); toast.success('Factura anulada') },
    onError: (err) => toast.error(err?.response?.data?.error || 'Error al anular la factura'),
  })

  const columns = [
    { key: 'numero_factura', label: 'Número', render: v => <span className="font-mono text-sm">{v || '-'}</span> },
    { key: 'cliente_nombre', label: 'Cliente', render: v => v || 'Consumidor final' },
    { key: 'total', label: 'Total', render: v => <span className="font-bold text-blue-700">{COP(v)}</span> },
    { key: 'metodo_pago', label: 'Pago', render: v => v?.replace('_', ' ') },
    { key: 'estado', label: 'Estado', render: (v, row) => (
      <div className="flex flex-wrap items-center gap-1">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_COLORS[v] || 'bg-surface-soft text-ink-2'}`}>{v}</span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Facturación DIAN</h1>
          <p className="text-sm text-ink-2 mt-0.5">Gestiona tus facturas electrónicas ({data?.total || 0})</p>
        </div>
        <Button variant="secondary" onClick={() => exportarFacturas(data?.facturas || [])}>
          <Download className="w-3.5 h-3.5" />Excel
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap gap-3 items-center">
        <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value, page: 1 }))}
          className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white text-ink">
          <option value="">Todos los estados</option>
          <option value="enviada">Enviada</option>
          <option value="aceptada">Aceptada</option>
          <option value="pendiente">Pendiente</option>
          <option value="anulada">Anulada</option>
        </select>
        <input type="date" value={filtros.fecha_desde} onChange={e => { setFiltros(p => ({ ...p, fecha_desde: e.target.value })); setPage(1) }}
          className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 text-ink" />
        <input type="date" value={filtros.fecha_hasta} onChange={e => { setFiltros(p => ({ ...p, fecha_hasta: e.target.value })); setPage(1) }}
          className="px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 text-ink" />
        {/* Rango de total */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Total mín"
            value={filtros.totalMin || ''}
            onChange={e => setFiltros(f => ({ ...f, totalMin: e.target.value, page: 1 }))}
            className="w-28 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <span className="text-ink-2 text-sm">—</span>
          <input
            type="number"
            placeholder="Total máx"
            value={filtros.totalMax || ''}
            onChange={e => setFiltros(f => ({ ...f, totalMax: e.target.value, page: 1 }))}
            className="w-28 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        {/* Limpiar filtros */}
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg border border-border transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <Table
          columns={columns}
          data={facturasFiltradas}
          loading={isLoading}
          emptyMessage="No hay facturas"
          onRowClick={(row) => navigate(`/facturas/${row.id}`)}
        />
      </div>

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

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, CheckCircle, XCircle } from 'lucide-react'
import { comprasService } from '../services/compras'
import { proveedoresService } from '../services/proveedores'
import { Table } from '../components/Common/Table'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'

const ESTADO_BADGE = {
  borrador:  'bg-gray-100 text-gray-600',
  recibida:  'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-600',
}

const ESTADO_LABEL = {
  borrador:  'Borrador',
  recibida:  'Recibida',
  cancelada: 'Cancelada',
}

export default function Compras() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['compras', search, estado, proveedorId, fechaDesde, fechaHasta, page],
    queryFn: () => comprasService.getAll({
      search,
      estado: estado || undefined,
      proveedor_id: proveedorId || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      page,
      limit: 20,
    }),
    keepPreviousData: true,
  })

  const { data: proveedoresData } = useQuery({
    queryKey: ['proveedores-select'],
    queryFn: () => proveedoresService.getAll({ limit: 200 }),
  })

  const recibirMutation = useMutation({
    mutationFn: comprasService.recibir,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compras'] }),
  })

  const cancelarMutation = useMutation({
    mutationFn: comprasService.cancelar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compras'] }),
  })

  const handleRecibir = (compra) => {
    if (window.confirm(`¿Marcar la compra #${compra.numero_factura || compra.id} como recibida? Esto actualizará el stock de los productos.`)) {
      recibirMutation.mutate(compra.id)
    }
  }

  const handleCancelar = (compra) => {
    if (window.confirm(`¿Cancelar la compra #${compra.numero_factura || compra.id}?`)) {
      cancelarMutation.mutate(compra.id)
    }
  }

  const resetFiltros = () => {
    setSearch('')
    setEstado('')
    setProveedorId('')
    setFechaDesde('')
    setFechaHasta('')
    setPage(1)
  }

  const proveedores = proveedoresData?.proveedores || []
  const totalPages = data ? Math.ceil(data.total / 20) : 1

  const columns = [
    {
      key: 'numero_factura',
      label: 'Factura / ID',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{v || `OC-${row.id}`}</p>
          <p className="text-xs text-gray-400">#{row.id}</p>
        </div>
      ),
    },
    {
      key: 'proveedor',
      label: 'Proveedor',
      render: (v, row) => (
        <span className="text-gray-700">{row.proveedor_nombre || v || '—'}</span>
      ),
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: v => v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      key: 'total',
      label: 'Total',
      render: v => <span className="font-medium text-gray-900">{COP(v)}</span>,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: v => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[v] || 'bg-gray-100 text-gray-500'}`}>
          {ESTADO_LABEL[v] || v || '—'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/compras/${row.id}`}
            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Ver detalle"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {row.estado === 'borrador' && (
            <>
              <button
                onClick={() => handleRecibir(row)}
                disabled={recibirMutation.isPending}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Marcar como recibida"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCancelar(row)}
                disabled={cancelarMutation.isPending}
                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                title="Cancelar compra"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Compras ({data?.total || 0})
        </h2>
        <Button onClick={() => navigate('/compras/nueva')}>
          <Plus className="w-4 h-4" />
          Nueva compra
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por N° factura..."
            />
          </div>

          {/* Estado */}
          <div className="min-w-[140px]">
            <select
              value={estado}
              onChange={e => { setEstado(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="recibida">Recibida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {/* Proveedor */}
          <div className="min-w-[180px]">
            <select
              value={proveedorId}
              onChange={e => { setProveedorId(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => { setFechaDesde(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => { setFechaHasta(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Limpiar filtros */}
          {(search || estado || proveedorId || fechaDesde || fechaHasta) && (
            <button
              onClick={resetFiltros}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        data={data?.compras || []}
        loading={isLoading}
        emptyMessage="No hay órdenes de compra"
      />

      {/* Paginación */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

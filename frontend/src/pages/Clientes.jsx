import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, Download } from 'lucide-react'
import { clientesService } from '../services/clientes'
import { Table } from '../components/Common/Table'
import { Button } from '../components/Common/Button'
import { exportarClientes } from '../lib/exportExcel'

export default function Clientes() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', search, page],
    queryFn: () => clientesService.getAll({ search, page, limit: 20 }),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: clientesService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })

  const columns = [
    { key: 'nombre', label: 'Nombre', render: (v, row) => (
      <div>
        <p className="font-medium text-gray-900">{v}</p>
        <p className="text-xs text-gray-400">{row.tipo_documento}: {row.numero_documento}</p>
      </div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'alegra_id', label: 'Alegra', render: v => v ? (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Sincronizado</span>
    ) : (
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No sincronizado</span>
    )},
    { key: 'acciones', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        <Link to={`/clientes/${row.id}/editar`} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></Link>
        <button onClick={() => { if (window.confirm('¿Eliminar cliente?')) deleteMutation.mutate(row.id) }}
          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink mb-2">Clientes</h1>
          <p className="text-ink-2">Gestiona tu cartera de clientes ({data?.total || 0})</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => exportarClientes(data?.clientes || [])}>
            <Download className="w-3.5 h-3.5" />Excel
          </Button>
          <Link to="/clientes/nuevo"><Button><Plus className="w-4 h-4" />Nuevo cliente</Button></Link>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-line focus:border-accent text-ink placeholder:text-ink-2/60"
          placeholder="Buscar clientes..." />
      </div>
      <Table columns={columns} data={data?.clientes || []} loading={isLoading} emptyMessage="No hay clientes" />
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

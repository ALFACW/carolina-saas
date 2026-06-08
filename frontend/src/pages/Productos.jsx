import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, TrendingDown, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { productosService } from '../services/productos'
import api from '../services/api'
import { Table } from '../components/Common/Table'
import { Modal } from '../components/Common/Modal'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'
import { exportarProductos } from '../lib/exportExcel'
import ConfirmDialog from '../components/ui/ConfirmDialog'

export default function Productos() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [ajusteModal, setAjusteModal] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, nombre: '' })
  const [ajusteCantidad, setAjusteCantidad] = useState(0)
  const [ajusteTipo, setAjusteTipo] = useState('ajuste')
  const [importModal, setImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['productos', search, page],
    queryFn: () => productosService.getAll({ search, page, limit: 20 }),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: productosService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })

  const ajusteMutation = useMutation({
    mutationFn: ({ id, data }) => productosService.ajusteStock(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setAjusteModal(null) },
  })

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('archivo', file)
      const { data } = await api.post('/api/importar/productos', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (data) => {
      setImportResult(data)
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })

  const descargarPlantilla = async () => {
    const token = localStorage.getItem('carolina_token')
    const res = await fetch('/api/importar/productos/template', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_productos.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) { setImportFile(file); setImportResult(null) }
  }

  const handleImportar = () => {
    if (importFile) importMutation.mutate(importFile)
  }

  const handleCerrarImport = () => {
    setImportModal(false)
    setImportFile(null)
    setImportResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const columns = [
    { key: 'codigo', label: 'Código', render: v => <span className="font-mono text-xs text-ink-2">{v || '—'}</span> },
    { key: 'nombre', label: 'Producto', render: (v, row) => (
      <div>
        <p className="font-medium text-ink">{v}</p>
        {row.categoria && <p className="text-xs text-ink-2">{row.categoria}</p>}
      </div>
    )},
    { key: 'precio_venta', label: 'Precio venta', render: v => <span className="font-semibold text-ink">{COP(v)}</span> },
    { key: 'precio_costo', label: 'Costo', render: v => <span className="text-ink-2">{COP(v)}</span> },
    { key: 'stock_actual', label: 'Stock', render: (v, row) => (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${v <= row.stock_minimo ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
        {v} uds
      </span>
    )},
    { key: 'impuesto_iva', label: 'IVA', render: v => `${v}%` },
    { key: 'acciones', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => { setAjusteModal(row); setAjusteCantidad(0); setAjusteTipo('ajuste') }}
          className="p-1.5 text-ink-2 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Ajustar stock">
          <TrendingDown className="w-4 h-4" />
        </button>
        <Link to={`/productos/${row.id}/editar`} className="p-1.5 text-ink-2 hover:text-accent hover:bg-accent-soft rounded transition-colors">
          <Edit className="w-4 h-4" />
        </Link>
        <button onClick={() => setConfirmDialog({ open: true, id: row.id, nombre: row.nombre })}
          className="p-1.5 text-ink-2 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink mb-2">Inventario</h1>
          <p className="text-ink-2">Gestiona tu stock de productos ({data?.total || 0})</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => exportarProductos(data?.productos || [])}>
            <Download className="w-3.5 h-3.5" />Excel
          </Button>
          <Button variant="secondary" onClick={() => setImportModal(true)}>
            <Upload className="w-3.5 h-3.5" />Importar Excel
          </Button>
          <Link to="/productos/nuevo">
            <Button><Plus className="w-3.5 h-3.5" />Nuevo producto</Button>
          </Link>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-ink placeholder:text-ink-2/60"
          placeholder="Buscar por nombre o código..."
          aria-label="Buscar"
        />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <Table columns={columns} data={data?.productos || []} loading={isLoading}
          emptyPreset="productos" emptyAction={{ label: '+ Nuevo producto', to: '/productos/nuevo' }} />
      </div>

      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-40 hover:bg-surface-soft">Anterior</button>
          <span className="text-xs text-ink-2">Página {page} de {Math.ceil(data.total / 20)}</span>
          <button disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-40 hover:bg-surface-soft">Siguiente</button>
        </div>
      )}

      {/* ── Modal importar ── */}
      <Modal isOpen={importModal} onClose={handleCerrarImport} title="Importar productos desde Excel" size="md">
        <div className="space-y-5">
          {/* Descargar plantilla */}
          <div className="bg-surface-soft rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink mb-1">Paso 1 — Descarga la plantilla</p>
              <p className="text-xs text-ink-2">
                Contiene las columnas exactas que necesitas: código, nombre, precio de venta, precio de costo, stock, IVA, categoría y bodega.
              </p>
            </div>
            <button onClick={descargarPlantilla}
              className="flex-shrink-0 flex items-center gap-2 text-xs font-medium text-ink border border-border px-3 py-2 rounded-md hover:bg-white transition-colors">
              <Download className="w-3.5 h-3.5" />Plantilla
            </button>
          </div>

          {/* Columnas de referencia */}
          <div>
            <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2">Columnas del archivo</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { col: 'nombre', req: true,  desc: 'Nombre del producto' },
                { col: 'precio_venta', req: true, desc: 'Precio de venta (número)' },
                { col: 'codigo', req: false, desc: 'Código o código de barras' },
                { col: 'precio_costo', req: false, desc: 'Precio de costo' },
                { col: 'categoria', req: false, desc: 'Categoría' },
                { col: 'stock_actual', req: false, desc: 'Stock inicial (default: 0)' },
                { col: 'stock_minimo', req: false, desc: 'Stock mínimo de alerta' },
                { col: 'impuesto_iva', req: false, desc: 'IVA % (default: 19)' },
                { col: 'bodega', req: false, desc: 'Bodega (default: principal)' },
                { col: 'descripcion', req: false, desc: 'Descripción opcional' },
              ].map(({ col, req, desc }) => (
                <div key={col} className="flex items-center gap-2 text-xs">
                  <code className="bg-surface-soft px-1.5 py-0.5 rounded font-mono text-ink">{col}</code>
                  {req && <span className="text-red-500 font-bold">*</span>}
                  <span className="text-ink-2">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subir archivo */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">Paso 2 — Sube el archivo completado</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              {importFile ? (
                <p className="text-sm font-medium text-ink">{importFile.name}</p>
              ) : (
                <p className="text-sm text-ink-2">Haz clic para seleccionar .xlsx, .xls o .csv</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Resultado */}
          {importResult && (
            <div className={`rounded-lg p-4 ${importResult.errores === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {importResult.errores === 0
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <AlertCircle className="w-4 h-4 text-amber-600" />
                }
                <p className="text-sm font-semibold text-ink">
                  {importResult.importados} producto{importResult.importados !== 1 ? 's' : ''} importado{importResult.importados !== 1 ? 's' : ''}
                  {importResult.errores > 0 && `, ${importResult.errores} con error`}
                </p>
              </div>
              {importResult.detalle_errores?.length > 0 && (
                <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {importResult.detalle_errores.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      Fila {e.fila} — {e.nombre}: {e.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {importMutation.isError && (
            <p className="text-sm text-red-600">{importMutation.error?.response?.data?.error || 'Error al importar'}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={handleCerrarImport}>Cerrar</Button>
            <Button
              className="flex-1"
              disabled={!importFile || !!importResult}
              loading={importMutation.isPending}
              onClick={handleImportar}
            >
              <Upload className="w-3.5 h-3.5" />
              Importar {importFile ? `"${importFile.name}"` : ''}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null, nombre: '' })}
        onConfirm={() => { deleteMutation.mutate(confirmDialog.id); setConfirmDialog({ open: false, id: null, nombre: '' }) }}
        title="¿Eliminar producto?"
        message={`"${confirmDialog.nombre}" será eliminado permanentemente.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />

      {/* ── Modal ajuste stock ── */}
      <Modal isOpen={!!ajusteModal} onClose={() => setAjusteModal(null)} title={`Ajustar stock — ${ajusteModal?.nombre}`} size="sm">
        <div className="space-y-4">
          <div className="bg-surface-soft rounded-md px-4 py-3 text-sm text-ink-2">
            Stock actual: <span className="font-bold text-ink">{ajusteModal?.stock_actual} unidades</span>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2 uppercase tracking-wider block mb-1">Tipo de movimiento</label>
            <select value={ajusteTipo} onChange={e => setAjusteTipo(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900">
              <option value="entrada">Entrada — agregar al stock</option>
              <option value="salida">Salida — descontar del stock</option>
              <option value="ajuste">Ajuste — fijar cantidad exacta</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-2 uppercase tracking-wider block mb-1">
              {ajusteTipo === 'ajuste' ? 'Nuevo stock total' : 'Cantidad a mover'}
            </label>
            <input type="number" min="0" value={ajusteCantidad}
              onChange={e => setAjusteCantidad(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 text-lg font-bold text-center"
              autoFocus />
            {ajusteTipo !== 'ajuste' && ajusteCantidad > 0 && (
              <p className="text-xs text-ink-2 mt-1 text-center">
                Resultado: {ajusteTipo === 'entrada'
                  ? ajusteModal?.stock_actual + ajusteCantidad
                  : Math.max(0, ajusteModal?.stock_actual - ajusteCantidad)
                } unidades
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAjusteModal(null)}>Cancelar</Button>
            <Button className="flex-1" loading={ajusteMutation.isPending}
              onClick={() => ajusteMutation.mutate({ id: ajusteModal.id, data: { cantidad: ajusteCantidad, tipo: ajusteTipo } })}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Trash2, Search, ChevronDown, ArrowLeft, Save, PackageCheck } from 'lucide-react'
import { comprasService } from '../services/compras'
import { proveedoresService } from '../services/proveedores'
import api from '../services/api'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { COP } from '../lib/format'

// ─── Búsqueda de productos ──────────────────────────────────────────────────
function ProductoSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const buscar = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get('/api/productos', { params: { search: q, limit: 10 } })
      setResults(data.productos || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 300)
    return () => clearTimeout(t)
  }, [query, buscar])

  const select = (p) => {
    onSelect(p)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
          placeholder="Buscar producto por nombre o código..."
        />
      </div>
      {open && (query.trim()) && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400">Buscando...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">Sin resultados</div>
          )}
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => select(p)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
              <p className="text-xs text-gray-400">
                {p.codigo && `Código: ${p.codigo} · `}Precio costo: {COP(p.precio_costo || 0)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Búsqueda de proveedor ──────────────────────────────────────────────────
function ProveedorSelect({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['proveedores-form', query],
    queryFn: () => proveedoresService.getAll({ search: query, limit: 20 }),
    keepPreviousData: true,
  })

  const proveedores = data?.proveedores || []
  const selected = proveedores.find(p => p.id === value) || null

  const select = (p) => {
    onChange(p.id, p)
    setOpen(false)
    setQuery('')
  }

  const displayName = selected?.nombre || (value ? `Proveedor #${value}` : '')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
      >
        <span className={displayName ? 'text-gray-900' : 'text-gray-400'}>
          {displayName || 'Seleccionar proveedor'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Buscar proveedor..."
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {proveedores.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">Sin proveedores</div>
            )}
            {proveedores.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                {p.nit && <p className="text-xs text-gray-400">NIT: {p.nit}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
const ITEM_EMPTY = {
  producto_id:     null,
  producto_nombre: '',
  descripcion:     '',
  cantidad:        1,
  precio_unitario: 0,
  iva_porcentaje:  19,
}

export default function CompraForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [proveedorId, setProveedorId] = useState(null)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([])
  const [errors, setErrors] = useState({})

  // Cargar compra existente para edición
  const { data: compraData } = useQuery({
    queryKey: ['compra', id],
    queryFn: () => comprasService.getById(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (compraData) {
      setProveedorId(compraData.proveedor_id || null)
      setNumeroFactura(compraData.numero_factura || '')
      setFecha(compraData.fecha ? compraData.fecha.split('T')[0] : new Date().toISOString().split('T')[0])
      setNotas(compraData.notas || '')
      setItems((compraData.items || []).map(item => ({
        producto_id:     item.producto_id,
        producto_nombre: item.producto_nombre || '',
        descripcion:     item.descripcion || '',
        cantidad:        item.cantidad || 1,
        precio_unitario: item.precio_unitario || 0,
        iva_porcentaje:  item.iva_porcentaje ?? 19,
      })))
    }
  }, [compraData])

  const createMutation = useMutation({
    mutationFn: comprasService.create,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id: cid, data }) => comprasService.update(cid, data),
  })

  const recibirMutation = useMutation({
    mutationFn: comprasService.recibir,
  })

  // ── Manejo de items ──────────────────────────────────────────────────────
  const addItem = () => {
    setItems(prev => [...prev, { ...ITEM_EMPTY }])
  }

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ))
  }

  const handleSelectProducto = (idx, producto) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? {
        ...item,
        producto_id:     producto.id,
        producto_nombre: producto.nombre,
        descripcion:     producto.nombre,
        precio_unitario: Number(producto.precio_costo) || 0,
        iva_porcentaje:  producto.iva_porcentaje ?? 19,
      } : item
    ))
  }

  // ── Totales ──────────────────────────────────────────────────────────────
  const calcItem = (item) => {
    const cant = Number(item.cantidad) || 0
    const pu   = Number(item.precio_unitario) || 0
    const iva  = Number(item.iva_porcentaje) || 0
    const subtotal = cant * pu
    const ivaVal   = subtotal * iva / 100
    return { subtotal, ivaVal, total: subtotal + ivaVal }
  }

  const totales = items.reduce((acc, item) => {
    const { subtotal, ivaVal, total } = calcItem(item)
    return { subtotal: acc.subtotal + subtotal, iva: acc.iva + ivaVal, total: acc.total + total }
  }, { subtotal: 0, iva: 0, total: 0 })

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!proveedorId) e.proveedor = 'Selecciona un proveedor'
    if (!fecha) e.fecha = 'La fecha es requerida'
    if (items.length === 0) e.items = 'Agrega al menos un producto'
    items.forEach((item, i) => {
      if (!item.producto_id && !item.descripcion.trim()) {
        e[`item_desc_${i}`] = 'Descripción requerida'
      }
      if (!Number(item.cantidad) || Number(item.cantidad) <= 0) {
        e[`item_cant_${i}`] = 'Cantidad inválida'
      }
      if (Number(item.precio_unitario) < 0) {
        e[`item_pu_${i}`] = 'Precio inválido'
      }
    })
    return e
  }

  const buildPayload = (estadoOverride) => ({
    proveedor_id:   proveedorId,
    numero_factura: numeroFactura || undefined,
    fecha,
    notas:          notas || undefined,
    estado:         estadoOverride || 'borrador',
    items: items.map(item => ({
      producto_id:     item.producto_id || undefined,
      descripcion:     item.descripcion,
      cantidad:        Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      iva_porcentaje:  Number(item.iva_porcentaje),
    })),
  })

  const handleGuardar = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: buildPayload() })
      } else {
        await createMutation.mutateAsync(buildPayload())
      }
      navigate('/compras')
    } catch (err) {
      setErrors({ global: err?.response?.data?.message || 'Error al guardar la compra' })
    }
  }

  const handleGuardarRecibir = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    try {
      let compraId = id
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: buildPayload() })
        compraId = id
      } else {
        const nueva = await createMutation.mutateAsync(buildPayload())
        compraId = nueva.id || nueva.compra?.id
      }
      await recibirMutation.mutateAsync(compraId)
      navigate('/compras')
    } catch (err) {
      setErrors({ global: err?.response?.data?.message || 'Error al guardar y recibir la compra' })
    }
  }

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    recibirMutation.isPending

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/compras')}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Editar compra' : 'Nueva orden de compra'}
        </h2>
      </div>

      {/* Error global */}
      {errors.global && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleGuardar} className="space-y-6">
        {/* ── Datos de la compra ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Datos de la compra</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Proveedor */}
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Proveedor *
              </label>
              <ProveedorSelect
                value={proveedorId}
                onChange={(pid) => {
                  setProveedorId(pid)
                  if (errors.proveedor) setErrors(prev => ({ ...prev, proveedor: '' }))
                }}
              />
              {errors.proveedor && (
                <p className="text-xs text-red-500">{errors.proveedor}</p>
              )}
            </div>

            <Input
              label="N° Factura del proveedor"
              value={numeroFactura}
              onChange={e => setNumeroFactura(e.target.value)}
              placeholder="FV-001 (opcional)"
            />

            <Input
              label="Fecha de compra *"
              type="date"
              value={fecha}
              onChange={e => {
                setFecha(e.target.value)
                if (errors.fecha) setErrors(prev => ({ ...prev, fecha: '' }))
              }}
              error={errors.fecha}
            />

            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 hover:border-gray-300 resize-none"
                placeholder="Observaciones sobre esta compra..."
              />
            </div>
          </div>
        </div>

        {/* ── Tabla de items ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Productos</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus className="w-3.5 h-3.5" />
              Agregar producto
            </Button>
          </div>

          {errors.items && (
            <p className="text-xs text-red-500 mb-3">{errors.items}</p>
          )}

          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Agrega productos usando el botón superior
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400 uppercase w-64">Producto</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400 uppercase w-48">Descripción</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-gray-400 uppercase w-20">Cant.</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-gray-400 uppercase w-32">Precio unit.</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-gray-400 uppercase w-20">IVA %</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-gray-400 uppercase w-32">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const { subtotal } = calcItem(item)
                    return (
                      <tr key={idx} className="border-b border-gray-50">
                        {/* Producto */}
                        <td className="px-2 py-2">
                          {item.producto_id ? (
                            <div>
                              <p className="font-medium text-gray-900 text-xs truncate max-w-xs">{item.producto_nombre}</p>
                              <button
                                type="button"
                                onClick={() => updateItem(idx, 'producto_id', null)}
                                className="text-xs text-blue-500 hover:underline"
                              >
                                Cambiar
                              </button>
                            </div>
                          ) : (
                            <ProductoSearch onSelect={p => handleSelectProducto(idx, p)} />
                          )}
                        </td>

                        {/* Descripción */}
                        <td className="px-2 py-2">
                          <input
                            value={item.descripcion}
                            onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                              errors[`item_desc_${idx}`] ? 'border-red-400' : 'border-gray-200'
                            }`}
                            placeholder="Descripción"
                          />
                          {errors[`item_desc_${idx}`] && (
                            <p className="text-xs text-red-500 mt-0.5">{errors[`item_desc_${idx}`]}</p>
                          )}
                        </td>

                        {/* Cantidad */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad}
                            onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                              errors[`item_cant_${idx}`] ? 'border-red-400' : 'border-gray-200'
                            }`}
                          />
                        </td>

                        {/* Precio unitario */}
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.precio_unitario}
                            onChange={e => updateItem(idx, 'precio_unitario', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                              errors[`item_pu_${idx}`] ? 'border-red-400' : 'border-gray-200'
                            }`}
                          />
                        </td>

                        {/* IVA */}
                        <td className="px-2 py-2">
                          <select
                            value={item.iva_porcentaje}
                            onChange={e => updateItem(idx, 'iva_porcentaje', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={19}>19%</option>
                          </select>
                        </td>

                        {/* Subtotal */}
                        <td className="px-2 py-2 text-right font-medium text-gray-900">
                          {COP(subtotal)}
                        </td>

                        {/* Eliminar */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totales */}
          {items.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{COP(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA</span>
                  <span>{COP(totales.iva)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                  <span>Total</span>
                  <span>{COP(totales.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Botones ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/compras')}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="secondary"
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            Guardar borrador
          </Button>
          <Button
            type="button"
            loading={recibirMutation.isPending}
            disabled={isSaving}
            onClick={handleGuardarRecibir}
          >
            <PackageCheck className="w-4 h-4" />
            Guardar y recibir
          </Button>
        </div>
      </form>
    </div>
  )
}

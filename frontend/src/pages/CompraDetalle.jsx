import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PackageCheck, Edit } from 'lucide-react'
import { comprasService } from '../services/compras'
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

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value || '—'}</p>
    </div>
  )
}

export default function CompraDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: compra, isLoading, isError } = useQuery({
    queryKey: ['compra', id],
    queryFn: () => comprasService.getById(id),
  })

  const recibirMutation = useMutation({
    mutationFn: () => comprasService.recibir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compra', id] })
      qc.invalidateQueries({ queryKey: ['compras'] })
    },
  })

  const handleRecibir = () => {
    if (window.confirm('¿Marcar esta compra como recibida? El stock de los productos se actualizará automáticamente.')) {
      recibirMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-400">
        Cargando compra...
      </div>
    )
  }

  if (isError || !compra) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/compras')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          No se pudo cargar la compra.
        </div>
      </div>
    )
  }

  const items = compra.items || []

  const totales = items.reduce((acc, item) => {
    const cant = Number(item.cantidad) || 0
    const pu   = Number(item.precio_unitario) || 0
    const iva  = Number(item.iva_porcentaje) || 0
    const sub  = cant * pu
    const ivaV = sub * iva / 100
    return { subtotal: acc.subtotal + sub, iva: acc.iva + ivaV, total: acc.total + sub + ivaV }
  }, { subtotal: 0, iva: 0, total: 0 })

  const totalCompra = Number(compra.total) || totales.total

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/compras')}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Compra {compra.numero_factura ? `— ${compra.numero_factura}` : `#${compra.id}`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">ID interno: #{compra.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {compra.estado === 'borrador' && (
            <Link to={`/compras/${id}/editar`}>
              <Button variant="secondary" size="sm">
                <Edit className="w-4 h-4" />
                Editar
              </Button>
            </Link>
          )}
          {compra.estado === 'borrador' && (
            <Button
              onClick={handleRecibir}
              loading={recibirMutation.isPending}
            >
              <PackageCheck className="w-4 h-4" />
              Marcar como recibida
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de acción de recibir */}
      {compra.estado === 'borrador' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800 font-medium">Esta compra está en borrador.</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Al marcarla como recibida, el stock de cada producto se actualizará automáticamente.
          </p>
        </div>
      )}

      {/* Info de la compra */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Información de la compra</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ESTADO_BADGE[compra.estado] || 'bg-gray-100 text-gray-500'}`}>
            {ESTADO_LABEL[compra.estado] || compra.estado || '—'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <InfoRow
            label="Proveedor"
            value={compra.proveedor_nombre || compra.proveedor?.nombre}
          />
          <InfoRow
            label="N° Factura proveedor"
            value={compra.numero_factura}
          />
          <InfoRow
            label="Fecha"
            value={compra.fecha
              ? new Date(compra.fecha).toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })
              : null
            }
          />
          <InfoRow
            label="Creado por"
            value={compra.usuario_nombre || compra.usuario?.nombre}
          />
          {compra.notas && (
            <div className="col-span-2 md:col-span-4">
              <InfoRow label="Notas" value={compra.notas} />
            </div>
          )}
        </div>
      </div>

      {/* Tabla de items */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Productos ({items.length})</h3>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin items registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase">Producto</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase">Descripción</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase">Cantidad</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase">Precio unit.</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase">IVA</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const cant = Number(item.cantidad) || 0
                  const pu   = Number(item.precio_unitario) || 0
                  const iva  = Number(item.iva_porcentaje) || 0
                  const sub  = cant * pu
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900">{item.producto_nombre || '—'}</p>
                        {item.producto_codigo && (
                          <p className="text-xs text-gray-400">Cód: {item.producto_codigo}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{item.descripcion || '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-700">{cant}</td>
                      <td className="px-3 py-3 text-right text-gray-700">{COP(pu)}</td>
                      <td className="px-3 py-3 text-right text-gray-500">{iva}%</td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">{COP(sub)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totales */}
        {items.length > 0 && (
          <div className="mt-5 flex justify-end">
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
                <span>{COP(totalCompra)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón Recibir (prominente, al pie) */}
      {compra.estado === 'borrador' && (
        <div className="bg-white rounded-lg border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">¿Recibiste esta mercancía?</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Confirma la recepción para actualizar el stock de todos los productos.
            </p>
          </div>
          <Button
            onClick={handleRecibir}
            loading={recibirMutation.isPending}
            size="lg"
          >
            <PackageCheck className="w-4 h-4" />
            Marcar como recibida
          </Button>
        </div>
      )}
    </div>
  )
}

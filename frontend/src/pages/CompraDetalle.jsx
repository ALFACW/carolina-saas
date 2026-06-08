import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PackageCheck, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { getApiError } from '../lib/errors'
import { comprasService } from '../services/compras'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'
import { useConfirm } from '../hooks/useConfirm'

const ESTADO_BADGE = {
  borrador:  'bg-yellow-50 text-warning border border-yellow-200',
  recibida:  'bg-green-50 text-success border border-green-200',
  cancelada: 'bg-red-50 text-danger border border-red-200',
}

const ESTADO_LABEL = {
  borrador:  'Borrador',
  recibida:  'Recibida',
  cancelada: 'Cancelada',
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-ink">{value || '—'}</p>
    </div>
  )
}

export default function CompraDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const confirm = useConfirm()

  const { data: compra, isLoading, isError } = useQuery({
    queryKey: ['compra', id],
    queryFn: () => comprasService.getById(id),
  })

  const recibirMutation = useMutation({
    mutationFn: () => comprasService.recibir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compra', id] })
      qc.invalidateQueries({ queryKey: ['compras'] })
      toast.success('Compra recibida — stock actualizado')
    },
    onError: (err) => toast.error(getApiError(err, 'Error al recibir la compra')),
  })

  const handleRecibir = async () => {
    const ok = await confirm({
      title: 'Recibir compra',
      description: 'El stock de todos los productos de esta compra se actualizará automáticamente.',
      confirmText: 'Recibir compra', variant: 'info',
    })
    if (ok) recibirMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-ink-2">Cargando compra...</div>
      </div>
    )
  }

  if (isError || !compra) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/compras')} className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" />Volver a compras
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-danger">
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
    <div className="space-y-6">

        {/* Header con Volver integrado */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/compras')}
              className="p-2 hover:bg-surface-soft rounded-lg transition-colors text-ink-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-ink">
                {compra.numero_factura ? `Compra — ${compra.numero_factura}` : `Compra #${compra.id}`}
              </h1>
              <p className="text-sm text-ink-2 mt-0.5">ID interno: #{compra.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[compra.estado] || 'bg-surface-soft text-ink-2'}`}>
              {ESTADO_LABEL[compra.estado] || compra.estado || '—'}
            </span>
            {compra.estado === 'borrador' && (
              <Link to={`/compras/${id}/editar`}>
                <button className="flex items-center gap-2 border border-border hover:bg-surface-soft text-ink font-medium px-3 py-1.5 rounded-lg text-sm transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Aviso borrador */}
        {compra.estado === 'borrador' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-sm text-warning font-medium">Esta compra está en borrador.</p>
            <p className="text-xs text-warning/80 mt-0.5">
              Al marcarla como recibida, el stock de cada producto se actualizará automáticamente.
            </p>
          </div>
        )}

        {/* Info de la compra */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Información de la compra</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Proveedor" value={compra.proveedor_nombre || compra.proveedor?.nombre} />
            <InfoRow label="N° Factura proveedor" value={compra.numero_factura} />
            <InfoRow
              label="Fecha"
              value={compra.fecha
                ? new Date(compra.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
                : null
              }
            />
            <InfoRow label="Creado por" value={compra.usuario_nombre || compra.usuario?.nombre} />
            {compra.notas && (
              <div className="col-span-2 md:col-span-4">
                <InfoRow label="Notas" value={compra.notas} />
              </div>
            )}
          </div>
        </div>

        {/* Tabla de items */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Productos ({items.length})</h2>

          {items.length === 0 ? (
            <p className="text-sm text-ink-2 text-center py-8">Sin ítems registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-soft border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Producto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Descripción</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Cantidad</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Precio unit.</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">IVA</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const cant = Number(item.cantidad) || 0
                    const pu   = Number(item.precio_unitario) || 0
                    const iva  = Number(item.iva_porcentaje) || 0
                    const sub  = cant * pu
                    return (
                      <tr key={i} className="border-b border-border hover:bg-surface-soft transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{item.producto_nombre || '—'}</p>
                          {item.producto_codigo && (
                            <p className="text-xs text-ink-2">Cód: {item.producto_codigo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-2">{item.descripcion || '—'}</td>
                        <td className="px-4 py-3 text-right text-ink">{cant}</td>
                        <td className="px-4 py-3 text-right text-ink">{COP(pu)}</td>
                        <td className="px-4 py-3 text-right text-ink-2">{iva}%</td>
                        <td className="px-4 py-3 text-right font-medium text-ink">{COP(sub)}</td>
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
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-ink-2">
                  <span>Subtotal</span>
                  <span>{COP(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-ink-2">
                  <span>IVA</span>
                  <span>{COP(totales.iva)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-ink border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-accent">{COP(totalCompra)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nota informativa stock */}
        {compra.estado === 'recibida' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <PackageCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-success">Stock actualizado</p>
              <p className="text-xs text-success/80 mt-0.5">
                El inventario de los productos de esta compra fue actualizado al marcarla como recibida.
              </p>
            </div>
          </div>
        )}

        {/* CTA recibir */}
        {compra.estado === 'borrador' && (
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">¿Recibiste esta mercancía?</p>
              <p className="text-xs text-ink-2 mt-0.5">
                Confirma la recepción para actualizar el stock de todos los productos.
              </p>
            </div>
            <button
              onClick={handleRecibir}
              disabled={recibirMutation.isPending}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <PackageCheck className="w-4 h-4" />
              {recibirMutation.isPending ? 'Procesando...' : 'Marcar como recibida'}
            </button>
          </div>
        )}

    </div>
  )
}

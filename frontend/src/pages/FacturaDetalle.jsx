import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileDown, XCircle } from 'lucide-react'
import { facturasService } from '../services/facturas'
import { Loading } from '../components/Common/Loading'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'

export default function FacturaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: factura, isLoading } = useQuery({
    queryKey: ['factura', id],
    queryFn: () => facturasService.getById(id),
  })

  const anularMutation = useMutation({
    mutationFn: () => facturasService.anular(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factura', id] }),
  })

  const pdfMutation = useMutation({
    mutationFn: () => facturasService.getPDF(id),
    onSuccess: (data) => { if (data.pdf_url) window.open(data.pdf_url, '_blank') },
  })

  if (isLoading) return <Loading />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => pdfMutation.mutate()} loading={pdfMutation.isPending}>
            <FileDown className="w-4 h-4" />Ver PDF
          </Button>
          {factura?.estado !== 'anulada' && (
            <Button variant="danger" onClick={() => { if (window.confirm('¿Anular esta factura?')) anularMutation.mutate() }} loading={anularMutation.isPending}>
              <XCircle className="w-4 h-4" />Anular
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{factura?.numero_factura || 'Sin número'}</h2>
            <p className="text-gray-500 text-sm mt-1">{factura && new Date(factura.fecha_emision).toLocaleString('es-CO')}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
            factura?.estado === 'enviada' || factura?.estado === 'aceptada' ? 'bg-green-100 text-green-700' :
            factura?.estado === 'anulada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}>{factura?.estado}</span>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Cliente</h3>
            <p className="font-medium text-gray-900">{factura?.cliente_nombre || 'Consumidor final'}</p>
            {factura?.numero_documento && <p className="text-sm text-gray-500">{factura.numero_documento}</p>}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Pago</h3>
            <p className="font-medium text-gray-900 capitalize">{factura?.metodo_pago?.replace('_', ' ')}</p>
            {factura?.vendedor_nombre && <p className="text-sm text-gray-500">Vendedor: {factura.vendedor_nombre}</p>}
          </div>
        </div>

        {factura?.cufe && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">CUFE (DIAN)</p>
            <p className="text-xs text-gray-600 break-all font-mono">{factura.cufe}</p>
          </div>
        )}

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-gray-500 font-medium">Producto</th>
              <th className="text-right py-2 text-gray-500 font-medium">Cant.</th>
              <th className="text-right py-2 text-gray-500 font-medium">Precio</th>
              <th className="text-right py-2 text-gray-500 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {factura?.items?.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2.5 text-gray-900">{item.descripcion}</td>
                <td className="py-2.5 text-right text-gray-600">{item.cantidad}</td>
                <td className="py-2.5 text-right text-gray-600">{COP(item.precio_unitario)}</td>
                <td className="py-2.5 text-right font-medium">{COP(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-48 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{COP(factura?.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA</span><span>{COP(factura?.impuesto_total)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span><span className="text-blue-700">{COP(factura?.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

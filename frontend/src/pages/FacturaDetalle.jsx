import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileDown, XCircle, Printer, Send, CheckCircle2, X } from 'lucide-react'
import { facturasService } from '../services/facturas'
import { Loading } from '../components/Common/Loading'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'
import { TicketImpresion } from '../components/POS/TicketImpresion'
import { useQZTray } from '../hooks/useQZTray'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function FacturaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { tenant } = useAuth()
  const qzTray = useQZTray()

  const [showTicket, setShowTicket] = useState(false)

  // Modal email
  const [showEmail, setShowEmail] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')

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

  const emailMutation = useMutation({
    mutationFn: (email) => api.post(`/api/facturas/${id}/enviar-email`, { email }),
    onSuccess: () => {
      setEmailMsg('Factura enviada correctamente al correo.')
      setEmailErr('')
      setTimeout(() => {
        setShowEmail(false)
        setEmailMsg('')
      }, 2500)
    },
    onError: (err) => {
      setEmailErr(err.response?.data?.error || 'Error al enviar el correo. Intenta nuevamente.')
    },
  })

  // Abrir modal email: pre-cargar email del cliente si existe
  const handleOpenEmail = () => {
    setEmailInput(factura?.cliente_email || '')
    setEmailMsg('')
    setEmailErr('')
    setShowEmail(true)
  }

  const handleEnviarEmail = () => {
    const email = emailInput.trim()
    if (!email) {
      setEmailErr('Ingresa un correo electrónico.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('El correo no es válido.')
      return
    }
    setEmailErr('')
    emailMutation.mutate(email)
  }

  if (isLoading) return <Loading />

  // Construir objeto venta para TicketImpresion
  const ventaParaTicket = factura ? {
    numero_factura: factura.numero_factura,
    cufe: factura.cufe,
    total: factura.total,
    subtotal: factura.subtotal,
    impuesto_total: factura.impuesto_total,
    metodo_pago: factura.metodo_pago,
    efectivo_recibido: 0,
    items: (factura.items || []).map(i => ({
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal,
    })),
  } : null

  // Cliente para el ticket
  const clienteParaTicket = factura?.cliente_nombre
    ? { nombre: factura.cliente_nombre }
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="secondary" onClick={() => pdfMutation.mutate()} loading={pdfMutation.isPending}>
            <FileDown className="w-4 h-4" />Ver PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowTicket(true)}>
            <Printer className="w-4 h-4" />Reimprimir ticket
          </Button>
          <Button variant="secondary" onClick={handleOpenEmail}>
            <Send className="w-4 h-4" />Enviar email
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
            {factura?.cliente_email && <p className="text-sm text-gray-400">{factura.cliente_email}</p>}
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

      {/* Modal reimprimir ticket */}
      {showTicket && ventaParaTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-gray-500" />
                Reimprimir ticket
              </h3>
              <button
                onClick={() => setShowTicket(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <TicketImpresion
                venta={ventaParaTicket}
                tenant={tenant}
                cliente={clienteParaTicket}
                qzTray={qzTray}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar email */}
      {showEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-gray-500" />
                Enviar factura por email
              </h3>
              <button
                onClick={() => setShowEmail(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Se enviará la factura <span className="font-semibold text-gray-900">{factura?.numero_factura}</span> al siguiente correo:
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setEmailErr('') }}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleEnviarEmail()}
                />
              </div>

              {emailErr && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{emailErr}</div>
              )}
              {emailMsg && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{emailMsg}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleEnviarEmail}
                  loading={emailMutation.isPending}
                  className="flex-1"
                >
                  <Send className="w-4 h-4" />Enviar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowEmail(false)}
                  disabled={emailMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, XCircle, Printer, Send, CheckCircle2, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { facturasService } from '../services/facturas'
import { Loading } from '../components/Common/Loading'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'
import { TicketImpresion } from '../components/POS/TicketImpresion'
import { useLocalPrint } from '../hooks/useLocalPrint'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function FacturaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { tenant } = useAuth()
  const qzTray = useLocalPrint()

  const [showTicket, setShowTicket] = useState(false)

  // Modal email
  const [showEmail, setShowEmail] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailErr, setEmailErr] = useState('')

  const { data: factura, isLoading } = useQuery({
    queryKey: ['factura', id],
    queryFn: () => facturasService.getById(id),
  })

  const anularMutation = useMutation({
    mutationFn: () => facturasService.anular(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factura', id] }); toast.success('Factura anulada') },
    onError: (err) => toast.error(err?.response?.data?.error || 'Error al anular la factura'),
  })

  const pdfMutation = useMutation({
    mutationFn: () => facturasService.getPDF(id),
    onSuccess: (data) => {
      if (!data.pdf_url) return
      if (data.pdf_url.startsWith('data:')) {
        const base64 = data.pdf_url.split(',')[1]
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } else {
        window.open(data.pdf_url, '_blank')
      }
    },
  })

  const emailMutation = useMutation({
    mutationFn: (email) => api.post(`/api/facturas/${id}/enviar-email`, { email }),
    onSuccess: () => {
      setEmailErr('')
      setShowEmail(false)
      toast.success('Factura enviada correctamente al correo')
    },
    onError: (err) => {
      setEmailErr(err.response?.data?.error || 'Error al enviar el correo. Intenta nuevamente.')
    },
  })

  const handleOpenEmail = () => {
    setEmailInput(factura?.cliente_email || '')
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

  const clienteParaTicket = factura?.cliente_nombre
    ? { nombre: factura.cliente_nombre }
    : null

  const estadoColor =
    factura?.estado === 'enviada' || factura?.estado === 'aceptada'
      ? 'bg-green-50 text-success border border-green-200'
      : factura?.estado === 'anulada'
      ? 'bg-red-50 text-danger border border-red-200'
      : 'bg-yellow-50 text-warning border border-yellow-200'

  return (
    <div className="min-h-screen bg-surface-soft p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink mb-2 w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a facturas
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">{factura?.numero_factura || 'Sin número'}</h1>
            <p className="text-sm text-ink-2 mt-1">
              {factura && new Date(factura.fecha_emision).toLocaleString('es-CO')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColor}`}>
              {factura?.estado}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => pdfMutation.mutate()}
            disabled={pdfMutation.isPending}
            className="flex items-center gap-2 border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {pdfMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generando...</span>
            ) : (
              <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Descargar PDF</span>
            )}
          </button>
          <button
            onClick={handleOpenEmail}
            className="flex items-center gap-2 border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            Enviar email
          </button>
          <button
            onClick={() => setShowTicket(true)}
            className="flex items-center gap-2 border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Reimprimir ticket
          </button>
          {factura?.estado !== 'anulada' && (
            <button
              onClick={() => { if (window.confirm('¿Anular esta factura?')) anularMutation.mutate() }}
              disabled={anularMutation.isPending}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-danger border border-red-200 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {anularMutation.isPending ? 'Anulando...' : 'Anular'}
            </button>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-6">

          {/* Empresa / Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Cliente</p>
              <p className="font-semibold text-ink">{factura?.cliente_nombre || 'Consumidor final'}</p>
              {factura?.numero_documento && (
                <p className="text-sm text-ink-2 mt-0.5">{factura.numero_documento}</p>
              )}
              {factura?.cliente_email && (
                <p className="text-sm text-ink-2 mt-0.5">{factura.cliente_email}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Pago</p>
              <p className="font-semibold text-ink capitalize">{factura?.metodo_pago?.replace('_', ' ')}</p>
              {factura?.vendedor_nombre && (
                <p className="text-sm text-ink-2 mt-0.5">Vendedor: {factura.vendedor_nombre}</p>
              )}
            </div>
          </div>

          {/* CUFE */}
          {factura?.cufe && (
            <div className="bg-surface-soft rounded-lg p-3 border border-border">
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">CUFE (DIAN)</p>
              <p className="text-xs text-ink-2 break-all font-mono">{factura.cufe}</p>
            </div>
          )}

          {/* Tabla de ítems */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-soft border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Descripción</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Cant.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">P. Unit.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">IVA</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {factura?.items?.map((item, i) => {
                  // IVA colombiano: precio incluye IVA. base = total / (1 + iva/100)
                  const sub = Number(item.subtotal) || 0
                  return (
                    <tr key={i} className="border-b border-border hover:bg-surface-soft px-4 py-3">
                      <td className="px-4 py-3 text-ink">{item.descripcion}</td>
                      <td className="px-4 py-3 text-right text-ink-2">{item.cantidad}</td>
                      <td className="px-4 py-3 text-right text-ink-2">{COP(item.precio_unitario)}</td>
                      <td className="px-4 py-3 text-right text-ink-2">{item.iva_porcentaje != null ? `${item.iva_porcentaje}%` : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{COP(sub)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-sm text-ink-2">
                <span>Subtotal</span>
                <span>{COP(factura?.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-ink-2">
                <span>IVA</span>
                <span>{COP(factura?.impuesto_total)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                <span className="text-ink">Total</span>
                <span className="text-accent">{COP(factura?.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal reimprimir ticket */}
        {showTicket && ventaParaTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <Printer className="w-4 h-4 text-ink-2" />
                  Reimprimir ticket
                </h3>
                <button
                  onClick={() => setShowTicket(false)}
                  className="text-ink-2 hover:text-ink transition-colors"
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
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <Send className="w-4 h-4 text-ink-2" />
                  Enviar factura por email
                </h3>
                <button onClick={() => setShowEmail(false)} className="text-ink-2 hover:text-ink transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-ink-2">
                  Se enviará la factura{' '}
                  <span className="font-semibold text-ink">{factura?.numero_factura}</span>{' '}
                  al siguiente correo:
                </p>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailErr('') }}
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleEnviarEmail(); } }}
                  />
                </div>
                {emailErr && (
                  <div className="bg-red-50 text-danger px-3 py-2 rounded-lg text-sm border border-red-200">{emailErr}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleEnviarEmail}
                    disabled={emailMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {emailMutation.isPending ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button
                    onClick={() => setShowEmail(false)}
                    disabled={emailMutation.isPending}
                    className="border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

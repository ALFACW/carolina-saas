import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, KeyRound, FileCog, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import api from '../services/api'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

function useSIIConfig() {
  return useQuery({
    queryKey: ['sii-config'],
    queryFn: async () => { const { data } = await api.get('/api/sii/config'); return data },
  })
}

// ── Sección: Token SimpleFactura ───────────────────────

function SeccionToken({ config }) {
  const qc = useQueryClient()
  const [token, setToken] = useState('')
  const [sucursal, setSucursal] = useState(config?.simplefactura_sucursal || 'Casa Matriz')
  const [ambiente, setAmbiente] = useState(config?.simplefactura_ambiente ?? 0)

  useEffect(() => {
    if (config) {
      setSucursal(config.simplefactura_sucursal || 'Casa Matriz')
      setAmbiente(config.simplefactura_ambiente ?? 0)
    }
  }, [config])

  const mutation = useMutation({
    mutationFn: (body) => api.put('/api/sii/config', body),
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries(['sii-config']) },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al guardar'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = { simplefactura_sucursal: sucursal, simplefactura_ambiente: Number(ambiente) }
    if (token.trim()) body.simplefactura_token = token.trim()
    mutation.mutate(body)
  }

  return (
    <form onSubmit={handleSubmit} className="card-base p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
          <KeyRound size={20} className="text-accent" />
          SimpleFactura
        </h2>
        {config?.tiene_token
          ? <span className="badge badge-green flex items-center gap-1"><CheckCircle2 size={12} /> Token activo</span>
          : <span className="badge badge-yellow flex items-center gap-1"><AlertTriangle size={12} /> Sin token</span>
        }
      </div>

      <p className="text-sm text-ink-2">
        Ingresa el Bearer token de tu cuenta{' '}
        <a href="https://simplefactura.cl" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          SimpleFactura
        </a>.
        No necesitas subir certificados ni CAF — SimpleFactura los gestiona en su portal.
      </p>

      <div>
        <label className="label-base">Bearer Token</label>
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={config?.tiene_token ? '••••••••  (dejar vacío para mantener)' : 'Pegar token de SimpleFactura'}
          autoComplete="new-password"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-base">Nombre de sucursal</label>
          <Input
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            placeholder="Casa Matriz"
          />
          <p className="text-xs text-ink-2 mt-1">Debe coincidir exactamente con la sucursal configurada en SimpleFactura.</p>
        </div>
        <div>
          <label className="label-base">Ambiente</label>
          <select
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
            className="input-base w-full"
          >
            <option value={0}>Certificación (pruebas)</option>
            <option value={1}>Producción</option>
          </select>
        </div>
      </div>

      <Button type="submit" loading={mutation.isPending} className="btn-primary flex items-center gap-2">
        <Save size={16} />
        Guardar
      </Button>
    </form>
  )
}

// ── Sección: Datos resolución SII ─────────────────────

function SeccionResolucion({ config }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    sii_numero_resolucion: config?.sii_numero_resolucion ?? '',
    sii_fecha_resolucion:  config?.sii_fecha_resolucion?.split('T')[0] ?? '',
    sii_unidad:            config?.sii_unidad ?? '',
  })

  useEffect(() => {
    if (config) {
      setForm({
        sii_numero_resolucion: config.sii_numero_resolucion ?? '',
        sii_fecha_resolucion:  config.sii_fecha_resolucion?.split('T')[0] ?? '',
        sii_unidad:            config.sii_unidad ?? '',
      })
    }
  }, [config])

  const mutation = useMutation({
    mutationFn: (body) => api.put('/api/sii/config', body),
    onSuccess: () => { toast.success('Datos de resolución guardados'); qc.invalidateQueries(['sii-config']) },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al guardar'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = {}
    if (form.sii_numero_resolucion !== '') body.sii_numero_resolucion = parseInt(form.sii_numero_resolucion)
    if (form.sii_fecha_resolucion)         body.sii_fecha_resolucion  = form.sii_fecha_resolucion
    if (form.sii_unidad)                   body.sii_unidad            = form.sii_unidad
    mutation.mutate(body)
  }

  return (
    <form onSubmit={handleSubmit} className="card-base p-6 space-y-4">
      <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
        <FileCog size={20} className="text-accent" />
        Resolución SII
      </h2>
      <p className="text-sm text-ink-2">
        Estos datos aparecen en los DTE emitidos. En ambiente de certificación usa número 0 y fecha actual.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label-base">N° resolución</label>
          <Input
            type="number"
            value={form.sii_numero_resolucion}
            onChange={(e) => setForm(f => ({ ...f, sii_numero_resolucion: e.target.value }))}
            placeholder="0 en certificación"
          />
        </div>
        <div>
          <label className="label-base">Fecha resolución</label>
          <Input
            type="date"
            value={form.sii_fecha_resolucion}
            onChange={(e) => setForm(f => ({ ...f, sii_fecha_resolucion: e.target.value }))}
          />
        </div>
        <div>
          <label className="label-base">Unidad SII</label>
          <Input
            value={form.sii_unidad}
            onChange={(e) => setForm(f => ({ ...f, sii_unidad: e.target.value }))}
            placeholder="SANTIAGO"
          />
        </div>
      </div>

      <Button type="submit" loading={mutation.isPending} className="btn-primary flex items-center gap-2">
        <Save size={16} />
        Guardar resolución
      </Button>
    </form>
  )
}

// ── Página principal ───────────────────────────────────

export default function ConfiguracionSII() {
  const { data: config, isLoading, error } = useSIIConfig()

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-danger">Error cargando configuración SII</div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Configuración SII Chile</h1>
        <p className="text-ink-2 mt-1">
          Conexión con SimpleFactura para emisión de boletas y facturas electrónicas.
        </p>
      </div>

      <SeccionToken config={config} />
      <SeccionResolucion config={config} />
    </div>
  )
}

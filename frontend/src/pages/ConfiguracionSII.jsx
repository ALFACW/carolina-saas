import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileCheck2, AlertTriangle, ChevronRight, Save, KeyRound, FileCog } from 'lucide-react'
import { toast } from 'sonner'
import api from '../services/api'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

const TIPO_DTE_LABEL = {
  33: 'Factura Electrónica (33)',
  39: 'Boleta Electrónica (39)',
  61: 'Nota de Crédito (61)',
  43: 'Liquidación (43)',
  52: 'Guía de Despacho (52)',
}

// ── Hooks ──────────────────────────────────────────────

function useSIIConfig() {
  return useQuery({
    queryKey: ['sii-config'],
    queryFn: async () => { const { data } = await api.get('/api/sii/config'); return data },
  })
}

// ── Sección: Datos SII ─────────────────────────────────

function SeccionDatosSII({ config }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    sii_numero_resolucion: config?.sii_numero_resolucion ?? '',
    sii_fecha_resolucion:  config?.sii_fecha_resolucion?.split('T')[0] ?? '',
    sii_unidad:            config?.sii_unidad ?? '',
    cert_pfx_rut:          config?.cert_pfx_rut ?? '',
    simpleapi_key:         '',
  })

  const mutation = useMutation({
    mutationFn: (body) => api.put('/api/sii/config', body),
    onSuccess: () => { toast.success('Datos SII guardados'); qc.invalidateQueries(['sii-config']) },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al guardar'),
  })

  const handleChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = {}
    if (form.sii_numero_resolucion !== '') body.sii_numero_resolucion = parseInt(form.sii_numero_resolucion)
    if (form.sii_fecha_resolucion)  body.sii_fecha_resolucion  = form.sii_fecha_resolucion
    if (form.sii_unidad)            body.sii_unidad            = form.sii_unidad
    if (form.cert_pfx_rut)          body.cert_pfx_rut          = form.cert_pfx_rut
    if (form.simpleapi_key)         body.simpleapi_key         = form.simpleapi_key
    mutation.mutate(body)
  }

  return (
    <form onSubmit={handleSubmit} className="card-base p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <FileCog size={20} className="text-primary-600" />
        Datos SII
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-base">Número de Resolución</label>
          <Input
            type="number"
            value={form.sii_numero_resolucion}
            onChange={handleChange('sii_numero_resolucion')}
            placeholder="0 en certificación"
          />
        </div>
        <div>
          <label className="label-base">Fecha de Resolución</label>
          <Input
            type="date"
            value={form.sii_fecha_resolucion}
            onChange={handleChange('sii_fecha_resolucion')}
          />
        </div>
        <div>
          <label className="label-base">Unidad SII</label>
          <Input
            value={form.sii_unidad}
            onChange={handleChange('sii_unidad')}
            placeholder="Ej: SANTIAGO, VALPARAÍSO"
          />
        </div>
        <div>
          <label className="label-base">RUT titular del certificado PFX</label>
          <Input
            value={form.cert_pfx_rut}
            onChange={handleChange('cert_pfx_rut')}
            placeholder="17096073-4"
          />
          <p className="text-xs text-gray-500 mt-1">
            El RUT de la persona (no empresa) a quien fue emitido el certificado digital.
          </p>
        </div>
      </div>

      <div>
        <label className="label-base flex items-center gap-2">
          <KeyRound size={14} />
          API Key SimpleAPI
          {config?.tiene_apikey && (
            <span className="badge badge-green text-xs">Configurada</span>
          )}
        </label>
        <Input
          type="password"
          value={form.simpleapi_key}
          onChange={handleChange('simpleapi_key')}
          placeholder={config?.tiene_apikey ? '••••••••  (dejar vacío para mantener)' : 'Pegar API Key de SimpleAPI'}
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" loading={mutation.isPending} className="btn-primary flex items-center gap-2">
        <Save size={16} />
        Guardar datos SII
      </Button>
    </form>
  )
}

// ── Sección: Certificado PFX ───────────────────────────

function SeccionCertificado({ config }) {
  const qc   = useQueryClient()
  const ref  = useRef(null)
  const [pwd, setPwd] = useState('')
  const [file, setFile] = useState(null)

  const mutation = useMutation({
    mutationFn: ({ file, password }) => {
      const fd = new FormData()
      fd.append('cert', file)
      fd.append('password', password)
      return api.post('/api/sii/certificado', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      toast.success('Certificado guardado correctamente')
      setFile(null)
      setPwd('')
      qc.invalidateQueries(['sii-config'])
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al subir certificado'),
  })

  return (
    <div className="card-base p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Upload size={20} className="text-primary-600" />
        Certificado Digital PFX
        {config?.tiene_certificado && (
          <span className="badge badge-green text-xs">Cargado</span>
        )}
      </h2>

      <p className="text-sm text-gray-600">
        Archivo .pfx emitido por una entidad certificadora acreditada por el SII.
        Se cifra con AES-256-GCM antes de guardarse.
      </p>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
        onClick={() => ref.current?.click()}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-700">
            <FileCheck2 size={20} />
            <span className="font-medium">{file.name}</span>
          </div>
        ) : (
          <div className="text-gray-500">
            <Upload size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium">Haz clic para seleccionar el .pfx</p>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept=".pfx"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
      </div>

      <div>
        <label className="label-base">Contraseña del certificado</label>
        <Input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Contraseña del .pfx"
          autoComplete="new-password"
        />
      </div>

      <Button
        onClick={() => mutation.mutate({ file, password: pwd })}
        disabled={!file}
        loading={mutation.isPending}
        className="btn-primary flex items-center gap-2"
      >
        <Upload size={16} />
        Subir certificado
      </Button>
    </div>
  )
}

// ── Sección: CAF Folios ────────────────────────────────

function SeccionCAF({ config }) {
  const qc  = useQueryClient()
  const ref = useRef(null)
  const [file, setFile] = useState(null)

  const mutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('caf', file)
      return api.post('/api/sii/caf', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: (res) => {
      const d = res.data
      toast.success(`CAF tipo ${d.tipo_dte} cargado — folios ${d.folio_desde}–${d.folio_hasta}`)
      setFile(null)
      qc.invalidateQueries(['sii-config'])
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al subir CAF'),
  })

  const folios = config?.caf_folios || []

  return (
    <div className="card-base p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <ChevronRight size={20} className="text-primary-600" />
        Folios CAF
      </h2>

      {folios.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">Tipo DTE</th>
              <th className="pb-2">Rango</th>
              <th className="pb-2">Próximo folio</th>
              <th className="pb-2">Disponibles</th>
              <th className="pb-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {folios.map((f, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 text-gray-800">{TIPO_DTE_LABEL[f.tipo_dte] || `Tipo ${f.tipo_dte}`}</td>
                <td className="py-2">{f.folio_desde}–{f.folio_hasta}</td>
                <td className="py-2 font-mono">{f.folio_actual}</td>
                <td className="py-2">{f.disponibles}</td>
                <td className="py-2">
                  {f.agotado
                    ? <span className="badge badge-red text-xs">Agotado</span>
                    : f.disponibles <= 10
                    ? <span className="badge badge-yellow text-xs">Pocos</span>
                    : <span className="badge badge-green text-xs">OK</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {folios.length === 0 && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} />
          Sin folios CAF cargados. Solicítalos en el SII y súbelos aquí.
        </div>
      )}

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
        onClick={() => ref.current?.click()}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-700">
            <FileCheck2 size={18} />
            <span className="font-medium">{file.name}</span>
          </div>
        ) : (
          <div className="text-gray-500">
            <Upload size={28} className="mx-auto mb-1 opacity-50" />
            <p className="text-sm font-medium">Seleccionar CAF XML</p>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept=".xml"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
      </div>

      <Button
        onClick={() => mutation.mutate(file)}
        disabled={!file}
        loading={mutation.isPending}
        className="btn-primary flex items-center gap-2"
      >
        <Upload size={16} />
        Subir CAF
      </Button>
    </div>
  )
}

// ── Página principal ───────────────────────────────────

export default function ConfiguracionSII() {
  const { data: config, isLoading, error } = useSIIConfig()

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-red-600">Error cargando configuración SII</div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración SII Chile</h1>
        <p className="text-gray-500 mt-1">
          Certificado digital, API Key SimpleAPI y folios CAF para emisión de DTE.
        </p>
      </div>

      <SeccionDatosSII config={config} />
      <SeccionCertificado config={config} />
      <SeccionCAF config={config} />
    </div>
  )
}

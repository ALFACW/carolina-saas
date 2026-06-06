import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, CheckCircle, XCircle, Eye, Check, Layers, History } from 'lucide-react'
import { cajasService } from '../services/cajas'
import { Table } from '../components/Common/Table'
import { Modal } from '../components/Common/Modal'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { COP } from '../lib/format'

const TABS = [
  { id: 'cajas', label: 'Cajas', icon: Layers },
  { id: 'sesiones', label: 'Sesiones', icon: History },
]

const ESTADO_BADGE = {
  abierta:  'bg-green-100 text-green-700',
  cerrada:  'bg-yellow-100 text-yellow-700',
  aprobada: 'bg-blue-100 text-blue-700',
}

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_BADGE[estado] || 'bg-surface-soft text-ink-2'}`}>
      {estado}
    </span>
  )
}

const CAJA_VACÍA = { nombre: '', descripcion: '', activa: true }

export default function Cajas() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [tab, setTab] = useState('cajas')

  // Estado cajas
  const [modalCaja, setModalCaja] = useState(false)
  const [editandoCaja, setEditandoCaja] = useState(null)
  const [formCaja, setFormCaja] = useState(CAJA_VACÍA)
  const [errorsCaja, setErrorsCaja] = useState({})

  // Filtros sesiones
  const [filtros, setFiltros] = useState({ caja_id: '', fecha_desde: '', fecha_hasta: '' })

  const { data: cajas = [], isLoading: loadingCajas } = useQuery({
    queryKey: ['cajas'],
    queryFn: cajasService.getCajas,
  })

  const { data: sesiones = [], isLoading: loadingSesiones } = useQuery({
    queryKey: ['sesiones', filtros],
    queryFn: () => cajasService.getSesiones(filtros),
  })

  const crearCajaMutation = useMutation({
    mutationFn: (c) => cajasService.createCaja(c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cajas'] }); cerrarModalCaja() },
  })

  const editarCajaMutation = useMutation({
    mutationFn: ({ id, datos }) => cajasService.updateCaja(id, datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cajas'] }); cerrarModalCaja() },
  })

  const aprobarMutation = useMutation({
    mutationFn: (id) => cajasService.aprobarSesion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sesiones'] }),
  })

  const abrirCrearCaja = () => {
    setEditandoCaja(null)
    setFormCaja(CAJA_VACÍA)
    setErrorsCaja({})
    setModalCaja(true)
  }

  const abrirEditarCaja = (c) => {
    setEditandoCaja(c)
    setFormCaja({ nombre: c.nombre, descripcion: c.descripcion || '', activa: c.activa })
    setErrorsCaja({})
    setModalCaja(true)
  }

  const cerrarModalCaja = () => {
    setModalCaja(false)
    setEditandoCaja(null)
    setFormCaja(CAJA_VACÍA)
    setErrorsCaja({})
  }

  const cambiarCaja = (e) => {
    const { name, value, type, checked } = e.target
    setFormCaja(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errorsCaja[name]) setErrorsCaja(prev => ({ ...prev, [name]: '' }))
  }

  const validarCaja = () => {
    const e = {}
    if (!formCaja.nombre.trim()) e.nombre = 'Requerido'
    return e
  }

  const handleSubmitCaja = (e) => {
    e.preventDefault()
    const errs = validarCaja()
    if (Object.keys(errs).length > 0) { setErrorsCaja(errs); return }

    if (editandoCaja) {
      editarCajaMutation.mutate({ id: editandoCaja.id || editandoCaja._id, datos: formCaja })
    } else {
      crearCajaMutation.mutate(formCaja)
    }
  }

  const formatFecha = (f) => {
    if (!f) return '—'
    return new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  }

  const columnasCajas = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'activa',
      label: 'Estado',
      render: (val) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${val ? 'text-green-600' : 'text-ink-2'}`}>
          {val ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {val ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => (
        <button
          onClick={() => abrirEditarCaja(row)}
          className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors"
          title="Editar"
        >
          <Edit className="w-4 h-4" />
        </button>
      ),
    },
  ]

  const columnasSesiones = [
    { key: 'cajero', label: 'Cajero', render: (_, r) => r.usuario?.nombre || r.cajero?.nombre || '—' },
    { key: 'caja', label: 'Caja', render: (_, r) => r.caja?.nombre || '—' },
    { key: 'apertura', label: 'Apertura', render: (_, r) => formatFecha(r.fecha_apertura) },
    { key: 'cierre', label: 'Cierre', render: (_, r) => formatFecha(r.fecha_cierre) },
    {
      key: 'total_ventas',
      label: 'Ventas',
      render: (val) => <span className="font-medium">{COP(val || 0)}</span>,
    },
    {
      key: 'diferencia',
      label: 'Diferencia',
      render: (val) => {
        if (val === undefined || val === null) return '—'
        const n = Number(val)
        return (
          <span className={`font-medium ${n > 0 ? 'text-green-600' : n < 0 ? 'text-red-600' : 'text-ink-2'}`}>
            {n > 0 ? '+' : ''}{COP(n)}
          </span>
        )
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (val) => <EstadoBadge estado={val} />,
    },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => {
        const id = row.id || row._id
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/sesiones/${id}`)}
              className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors"
              title="Ver detalle"
            >
              <Eye className="w-4 h-4" />
            </button>
            {row.estado === 'cerrada' && (
              <button
                onClick={() => aprobarMutation.mutate(id)}
                disabled={aprobarMutation.isPending}
                className="p-1.5 text-ink-2 hover:text-accent hover:bg-accent-soft rounded-lg transition-colors"
                title="Aprobar cuadratura"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Caja y Sesiones</h1>
          <p className="text-sm text-ink-2 mt-0.5">Gestiona tus cajas registradoras y turnos</p>
        </div>
        {tab === 'cajas' && (
          <Button onClick={abrirCrearCaja}>
            <Plus className="w-4 h-4" />
            Nueva caja
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-accent text-accent bg-accent-soft/40'
                  : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface-soft'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ═══════════ TAB: CAJAS ═══════════ */}
          {tab === 'cajas' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-2">Administra las cajas registradoras del negocio</p>
              <Table
                columns={columnasCajas}
                data={cajas}
                loading={loadingCajas}
                emptyMessage="No hay cajas registradas"
              />
            </div>
          )}

          {/* ═══════════ TAB: SESIONES ═══════════ */}
          {tab === 'sesiones' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-2">Registro de aperturas y cierres de caja</p>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3 p-4 bg-surface-soft rounded-xl border border-border">
                <div className="flex-1 min-w-36">
                  <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Caja</label>
                  <select
                    value={filtros.caja_id}
                    onChange={(e) => setFiltros(prev => ({ ...prev, caja_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">Todas las cajas</option>
                    {cajas.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Desde</label>
                  <input
                    type="date"
                    value={filtros.fecha_desde}
                    onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                    className="px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Hasta</label>
                  <input
                    type="date"
                    value={filtros.fecha_hasta}
                    onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                    className="px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFiltros({ caja_id: '', fecha_desde: '', fecha_hasta: '' })}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <Table
                columns={columnasSesiones}
                data={sesiones}
                loading={loadingSesiones}
                emptyMessage="No hay turnos en este período"
              />
            </div>
          )}

        </div>
      </div>

      {/* Modal caja */}
      <Modal
        isOpen={modalCaja}
        onClose={cerrarModalCaja}
        title={editandoCaja ? 'Editar caja' : 'Nueva caja'}
        size="sm"
      >
        <form onSubmit={handleSubmitCaja} className="space-y-4">
          <Input
            label="Nombre de la caja"
            name="nombre"
            value={formCaja.nombre}
            onChange={cambiarCaja}
            error={errorsCaja.nombre}
            placeholder="Ej: Caja principal, Caja 1..."
          />
          <Input
            label="Descripción (opcional)"
            name="descripcion"
            value={formCaja.descripcion}
            onChange={cambiarCaja}
            placeholder="Ubicación u observaciones"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="activa"
              checked={formCaja.activa}
              onChange={cambiarCaja}
              className="w-4 h-4 rounded border-border text-ink focus:ring-accent/30"
            />
            <span className="text-sm text-ink">Caja activa</span>
          </label>
          {(crearCajaMutation.isError || editarCajaMutation.isError) && (
            <p className="text-xs text-red-500">
              {(crearCajaMutation.error || editarCajaMutation.error)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={cerrarModalCaja}>Cancelar</Button>
            <Button type="submit" loading={crearCajaMutation.isPending || editarCajaMutation.isPending}>
              {editandoCaja ? 'Guardar cambios' : 'Crear caja'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

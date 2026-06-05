import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, CheckCircle, XCircle,
  LogOut, Edit, RefreshCw, Search
} from 'lucide-react'
import { superAdminService } from '../services/superAdmin'
import { Table } from '../components/Common/Table'
import { Modal } from '../components/Common/Modal'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

const PLANES = ['basico', 'estandar', 'premium', 'enterprise']

const PLAN_BADGE = {
  basico:     'bg-surface-soft text-ink-2 border border-border',
  estandar:   'bg-accent-soft text-accent border border-accent/20',
  premium:    'bg-purple-50 text-purple-700 border border-purple-200',
  enterprise: 'bg-yellow-50 text-warning border border-yellow-200',
}

function PlanBadge({ plan }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_BADGE[plan] || 'bg-surface-soft text-ink-2 border border-border'}`}>
      {plan || '—'}
    </span>
  )
}

function EstadoBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
      <CheckCircle className="w-3 h-3" /> Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
      <XCircle className="w-3 h-3" /> Suspendida
    </span>
  )
}

function KPI({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent || 'bg-accent-soft'}`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-white' : 'text-accent'}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-ink-2">{label}</p>
        <p className="text-2xl font-bold text-ink mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function SuperAdmin() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [busqueda, setBusqueda] = useState('')
  const [modalEditar, setModalEditar] = useState(false)
  const [tenantEditando, setTenantEditando] = useState(null)
  const [formEditar, setFormEditar] = useState({ plan: '', activo: true })

  useEffect(() => {
    const token = localStorage.getItem('carolina_sa_token')
    if (!token) navigate('/super-admin/login', { replace: true })
  }, [navigate])

  const { data: estadisticas, isLoading: loadingStats } = useQuery({
    queryKey: ['sa-estadisticas'],
    queryFn: superAdminService.getEstadisticas,
    retry: 1,
  })

  const { data: tenantsData, isLoading: loadingTenants, refetch } = useQuery({
    queryKey: ['sa-tenants', busqueda],
    queryFn: () => superAdminService.getTenants(busqueda ? { q: busqueda } : {}),
    retry: 1,
  })
  const tenants = Array.isArray(tenantsData) ? tenantsData : (tenantsData?.tenants || [])

  const actualizarMutation = useMutation({
    mutationFn: ({ id, updates }) => superAdminService.updateTenant(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-tenants'] })
      qc.invalidateQueries({ queryKey: ['sa-estadisticas'] })
      setModalEditar(false)
      setTenantEditando(null)
    },
  })

  const abrirEditar = (t) => {
    setTenantEditando(t)
    setFormEditar({ plan: t.plan || 'basico', activo: t.activo !== false })
    setModalEditar(true)
  }

  const handleSubmitEditar = (e) => {
    e.preventDefault()
    actualizarMutation.mutate({ id: tenantEditando.id || tenantEditando._id, updates: formEditar })
  }

  const toggleSuspender = (t) => {
    actualizarMutation.mutate({ id: t.id || t._id, updates: { activo: !t.activo } })
  }

  const handleLogout = () => {
    localStorage.removeItem('carolina_sa_token')
    navigate('/super-admin/login', { replace: true })
  }

  const formatFecha = (f) => {
    if (!f) return '—'
    return new Date(f).toLocaleDateString('es-CO', { dateStyle: 'medium' })
  }

  const statsT = estadisticas?.tenants || estadisticas || {}
  const totalTenants = parseInt(statsT.total_tenants ?? statsT.total_empresas ?? tenants.length)
  const activos      = parseInt(statsT.tenants_activos ?? statsT.empresas_activas ?? tenants.filter(t => t.activo !== false).length)
  const inactivos    = parseInt(statsT.tenants_suspendidos ?? statsT.empresas_inactivas ?? tenants.filter(t => t.activo === false).length)

  const columnas = [
    {
      key: 'nombre',
      label: 'Empresa',
      render: (val, row) => (
        <div>
          <p className="font-medium text-ink">{val || '—'}</p>
          <p className="text-xs text-ink-2 mt-0.5">{row.nit || row.documento || '—'}</p>
        </div>
      ),
    },
    { key: 'plan', label: 'Plan', render: (val) => <PlanBadge plan={val} /> },
    { key: 'activo', label: 'Estado', render: (val) => <EstadoBadge activo={val !== false} /> },
    { key: 'created_at', label: 'Registro', render: (val) => <span className="text-sm text-ink-2">{formatFecha(val)}</span> },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => abrirEditar(row)}
            className="p-1.5 text-ink-2 hover:text-accent hover:bg-accent-soft rounded-lg transition-colors" title="Editar">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => toggleSuspender(row)}
            className={`p-1.5 rounded-lg transition-colors ${row.activo !== false ? 'text-ink-2 hover:text-danger hover:bg-red-50' : 'text-ink-2 hover:text-success hover:bg-green-50'}`}
            title={row.activo !== false ? 'Suspender' : 'Reactivar'}>
            {row.activo !== false ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ]

  const tenantsFiltrados = busqueda
    ? tenants.filter(t =>
        (t.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (t.nit || '').includes(busqueda) ||
        (t.email || '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : tenants

  return (
    <div className="min-h-screen bg-surface-soft">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-lg text-white">C</span>
          <div>
            <span className="font-brand font-semibold text-base text-ink flex items-center">
              Carolina<span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
            </span>
            <p className="text-xs text-ink-2">Panel de administración</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

        {/* KPI cards */}
        {!loadingStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI icon={Building2} label="Total empresas" value={totalTenants} />
            <KPI icon={CheckCircle} label="Activas" value={activos} accent="bg-green-500" />
            <KPI icon={XCircle} label="Suspendidas" value={inactivos} accent="bg-danger" />
          </div>
        )}

        {/* Tabla de empresas */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Empresas registradas</h2>
              <p className="text-sm text-ink-2 mt-0.5">Todos los tenants del sistema</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, NIT..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <Table
              columns={columnas}
              data={tenantsFiltrados}
              loading={loadingTenants}
              emptyMessage="No hay empresas registradas"
            />
          </div>
        </div>
      </div>

      {/* Modal editar tenant */}
      <Modal
        isOpen={modalEditar}
        onClose={() => setModalEditar(false)}
        title={`Editar empresa — ${tenantEditando?.nombre || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitEditar} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink mb-1.5">Plan</label>
            <select
              value={formEditar.plan}
              onChange={(e) => setFormEditar(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2.5 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            >
              {PLANES.map(p => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formEditar.activo}
              onChange={(e) => setFormEditar(prev => ({ ...prev, activo: e.target.checked }))}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
            />
            <span className="text-sm text-ink">Empresa activa</span>
          </label>

          {actualizarMutation.isError && (
            <p className="text-xs text-danger">
              {actualizarMutation.error?.response?.data?.message || 'Error al actualizar'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalEditar(false)}
              className="border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={actualizarMutation.isPending}
              className="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
              {actualizarMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}

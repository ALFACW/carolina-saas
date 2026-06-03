import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, CheckCircle, XCircle, AlertCircle, TrendingUp,
  LogOut, Edit, RefreshCw, Link as LinkIcon
} from 'lucide-react'
import { superAdminService } from '../services/superAdmin'
import { Table } from '../components/Common/Table'
import { Modal } from '../components/Common/Modal'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

const PLANES = ['basico', 'estandar', 'premium', 'enterprise']

const PLAN_BADGE = {
  basico:     'bg-gray-100 text-gray-600',
  estandar:   'bg-blue-100 text-blue-700',
  premium:    'bg-purple-100 text-purple-700',
  enterprise: 'bg-yellow-100 text-yellow-700',
}

function PlanBadge({ plan }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PLAN_BADGE[plan] || 'bg-gray-100 text-gray-600'}`}>
      {plan || '—'}
    </span>
  )
}

function EstadoBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <CheckCircle className="w-3.5 h-3.5" /> Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <XCircle className="w-3.5 h-3.5" /> Suspendida
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color = 'text-gray-900', bg = 'bg-gray-50' }) {
  return (
    <div className={`${bg} rounded-xl p-5 flex items-start gap-4`}>
      <div className="p-2 bg-white rounded-lg shadow-sm">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
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
  const [formEditar, setFormEditar] = useState({ plan: '', activo: true, alegra_token: '' })
  const [modalAlegra, setModalAlegra] = useState(false)
  const [tenantAlegra, setTenantAlegra] = useState(null)
  const [alegraToken, setAlegraToken] = useState('')

  // Verificar token
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
  // El API devuelve { tenants: [...], total: N } o directamente un array
  const tenants = Array.isArray(tenantsData) ? tenantsData : (tenantsData?.tenants || [])

  const actualizarMutation = useMutation({
    mutationFn: ({ id, updates }) => superAdminService.updateTenant(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-tenants'] })
      qc.invalidateQueries({ queryKey: ['sa-estadisticas'] })
      setModalEditar(false)
      setModalAlegra(false)
      setTenantEditando(null)
      setTenantAlegra(null)
    },
  })

  const abrirEditar = (t) => {
    setTenantEditando(t)
    setFormEditar({ plan: t.plan || 'basico', activo: t.activo !== false, alegra_token: t.alegra_token || '' })
    setModalEditar(true)
  }

  const handleSubmitEditar = (e) => {
    e.preventDefault()
    actualizarMutation.mutate({ id: tenantEditando.id || tenantEditando._id, updates: formEditar })
  }

  const toggleSuspender = (t) => {
    actualizarMutation.mutate({
      id: t.id || t._id,
      updates: { activo: !t.activo },
    })
  }

  const abrirAlegra = (t) => {
    setTenantAlegra(t)
    setAlegraToken(t.alegra_token || '')
    setModalAlegra(true)
  }

  const handleSubmitAlegra = (e) => {
    e.preventDefault()
    actualizarMutation.mutate({ id: tenantAlegra.id || tenantAlegra._id, updates: { alegra_token: alegraToken } })
  }

  const handleLogout = () => {
    localStorage.removeItem('carolina_sa_token')
    navigate('/super-admin/login', { replace: true })
  }

  const formatFecha = (f) => {
    if (!f) return '—'
    return new Date(f).toLocaleDateString('es-CO', { dateStyle: 'medium' })
  }

  const columnas = [
    {
      key: 'nombre',
      label: 'Empresa',
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{val || '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{row.nit || row.documento || '—'}</p>
        </div>
      ),
    },
    { key: 'nit', label: 'NIT', render: (val) => val || '—' },
    {
      key: 'plan',
      label: 'Plan',
      render: (val) => <PlanBadge plan={val} />,
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (val) => <EstadoBadge activo={val !== false} />,
    },
    {
      key: 'alegra_token',
      label: 'Alegra',
      render: (val) => val ? (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="w-3.5 h-3.5" /> Conectado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          <AlertCircle className="w-3.5 h-3.5" /> Sin conectar
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registro',
      render: (val) => formatFecha(val),
    },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => abrirEditar(row)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Editar plan / estado"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => abrirAlegra(row)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Configurar Alegra"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleSuspender(row)}
            className={`p-1.5 rounded transition-colors ${
              row.activo !== false
                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            }`}
            title={row.activo !== false ? 'Suspender' : 'Reactivar'}
          >
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

  // API devuelve { tenants: { total_tenants, tenants_activos, ... }, ventas: {...} }
  const statsT = estadisticas?.tenants || estadisticas || {}
  const totalTenants = parseInt(statsT.total_tenants ?? statsT.total_empresas ?? tenants.length)
  const activos      = parseInt(statsT.tenants_activos ?? statsT.empresas_activas ?? tenants.filter(t => t.activo !== false).length)
  const inactivos    = parseInt(statsT.tenants_suspendidos ?? statsT.empresas_inactivas ?? tenants.filter(t => t.activo === false).length)
  const conAlegra    = parseInt(statsT.con_alegra ?? tenants.filter(t => t.alegra_conectado).length)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">C</span>
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Carolina Admin</p>
            <p className="text-xs text-gray-400">Panel de control del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Métricas */}
        {!loadingStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Building2}
              label="Total empresas"
              value={totalTenants}
              bg="bg-white border border-gray-100"
            />
            <StatCard
              icon={CheckCircle}
              label="Activas"
              value={activos}
              color="text-green-600"
              bg="bg-white border border-gray-100"
            />
            <StatCard
              icon={XCircle}
              label="Suspendidas"
              value={inactivos}
              color="text-red-500"
              bg="bg-white border border-gray-100"
            />
            <StatCard
              icon={TrendingUp}
              label="Con Alegra"
              value={conAlegra}
              color="text-indigo-600"
              bg="bg-white border border-gray-100"
            />
          </div>
        )}

        {/* Tabla de empresas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Empresas registradas</h2>
              <p className="text-sm text-gray-400 mt-0.5">Todos los tenants del sistema</p>
            </div>
            <div className="w-64">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, NIT..."
                className="w-full px-3 py-2 border border-gray-200 text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          </div>

          <Table
            columns={columnas}
            data={tenantsFiltrados}
            loading={loadingTenants}
            emptyMessage="No hay empresas registradas"
          />
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
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</label>
            <select
              value={formEditar.plan}
              onChange={(e) => setFormEditar(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
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
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">Empresa activa</span>
          </label>

          {actualizarMutation.isError && (
            <p className="text-xs text-red-500">
              {actualizarMutation.error?.response?.data?.message || 'Error al actualizar'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalEditar(false)}>Cancelar</Button>
            <Button type="submit" loading={actualizarMutation.isPending}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* Modal configurar Alegra */}
      <Modal
        isOpen={modalAlegra}
        onClose={() => setModalAlegra(false)}
        title={`Configurar Alegra — ${tenantAlegra?.nombre || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitAlegra} className="space-y-4">
          <p className="text-sm text-gray-500">
            Ingresa el token de API de Alegra para esta empresa. Esto permite la sincronización de facturas DIAN.
          </p>
          <Input
            label="Token de Alegra"
            value={alegraToken}
            onChange={(e) => setAlegraToken(e.target.value)}
            placeholder="alegra_token_xxxx"
            hint="Obtenido desde el panel de desarrolladores de Alegra"
          />
          {actualizarMutation.isError && (
            <p className="text-xs text-red-500">
              {actualizarMutation.error?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalAlegra(false)}>Cancelar</Button>
            <Button type="submit" loading={actualizarMutation.isPending}>Guardar token</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, CheckCircle, XCircle, Users, User } from 'lucide-react'
import { cajasService } from '../services/cajas'
import { useTenant } from '../hooks/useTenant'
import { Table } from '../components/Common/Table'
import { Modal } from '../components/Common/Modal'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

const CAJA_VACÍA = { nombre: '', descripcion: '', activa: true }

export default function Cajas() {
  const qc = useQueryClient()
  const { tenant, update: updateTenant } = useTenant()

  const [modalCaja,    setModalCaja]    = useState(false)
  const [editandoCaja, setEditandoCaja] = useState(null)
  const [formCaja,     setFormCaja]     = useState(CAJA_VACÍA)
  const [errorsCaja,   setErrorsCaja]   = useState({})

  const { data: cajas = [], isLoading } = useQuery({
    queryKey: ['cajas'],
    queryFn: cajasService.getCajas,
  })

  const crearMutation = useMutation({
    mutationFn: (c) => cajasService.createCaja(c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cajas'] }); cerrarModal() },
  })

  const editarMutation = useMutation({
    mutationFn: ({ id, datos }) => cajasService.updateCaja(id, datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cajas'] }); cerrarModal() },
  })

  const abrirCrear = () => { setEditandoCaja(null); setFormCaja(CAJA_VACÍA); setErrorsCaja({}); setModalCaja(true) }
  const abrirEditar = (c) => { setEditandoCaja(c); setFormCaja({ nombre: c.nombre, descripcion: c.descripcion || '', activa: c.activa }); setErrorsCaja({}); setModalCaja(true) }
  const cerrarModal = () => { setModalCaja(false); setEditandoCaja(null); setFormCaja(CAJA_VACÍA); setErrorsCaja({}) }

  const cambiarCaja = (e) => {
    const { name, value, type, checked } = e.target
    setFormCaja(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errorsCaja[name]) setErrorsCaja(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formCaja.nombre.trim()) { setErrorsCaja({ nombre: 'Requerido' }); return }
    if (editandoCaja) {
      editarMutation.mutate({ id: editandoCaja.id, datos: formCaja })
    } else {
      crearMutation.mutate(formCaja)
    }
  }

  const columnas = [
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
        <button onClick={() => abrirEditar(row)}
          className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors" title="Editar">
          <Edit className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Caja y Sesiones</h1>
          <p className="text-sm text-ink-2 mt-0.5">Gestiona tus cajas registradoras y modo de operación</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="w-4 h-4" />
          Nueva caja
        </Button>
      </div>

      {/* Modo de operación */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-ink">Modo de operación</h3>
          <p className="text-xs text-ink-2 mt-0.5">Define cómo se gestionan los turnos en tu negocio</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <button type="button"
            onClick={() => tenant?.modo_turnos && updateTenant({ modo_turnos: false })}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              !tenant?.modo_turnos ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong bg-white'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!tenant?.modo_turnos ? 'bg-accent' : 'bg-surface-soft'}`}>
              <User className={`w-4 h-4 ${!tenant?.modo_turnos ? 'text-white' : 'text-ink-2'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${!tenant?.modo_turnos ? 'text-accent' : 'text-ink'}`}>
                Caja simple
                {!tenant?.modo_turnos && <span className="ml-2 text-xs font-normal bg-accent text-white px-1.5 py-0.5 rounded-md">Activo</span>}
              </p>
              <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
                Abres la caja una vez al día y la cierras al final. Ideal para negocios atendidos por una o dos personas.
              </p>
              <p className="text-xs text-accent/80 font-medium mt-1.5">Recomendado para la mayoría</p>
            </div>
          </button>

          <button type="button"
            onClick={() => !tenant?.modo_turnos && updateTenant({ modo_turnos: true })}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              tenant?.modo_turnos ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong bg-white'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tenant?.modo_turnos ? 'bg-accent' : 'bg-surface-soft'}`}>
              <Users className={`w-4 h-4 ${tenant?.modo_turnos ? 'text-white' : 'text-ink-2'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${tenant?.modo_turnos ? 'text-accent' : 'text-ink'}`}>
                Múltiples turnos
                {tenant?.modo_turnos && <span className="ml-2 text-xs font-normal bg-accent text-white px-1.5 py-0.5 rounded-md">Activo</span>}
              </p>
              <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
                Cajeros con turnos definidos: al cerrar puedes indicar si hay cajero entrante y dejar un fondo.
              </p>
              <p className="text-xs text-ink-2 font-medium mt-1.5">Para negocios con relevo de cajeros</p>
            </div>
          </button>

        </div>
      </div>

      {/* Tabla cajas */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-ink">Cajas registradoras</h3>
          <p className="text-xs text-ink-2 mt-0.5">Administra las cajas del negocio</p>
        </div>
        <div className="p-5">
          <Table columns={columnas} data={cajas} loading={isLoading} emptyMessage="No hay cajas registradas" />
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalCaja} onClose={cerrarModal} title={editandoCaja ? 'Editar caja' : 'Nueva caja'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre de la caja" name="nombre" value={formCaja.nombre} onChange={cambiarCaja}
            error={errorsCaja.nombre} placeholder="Ej: Caja principal, Caja 1..." />
          <Input label="Descripción (opcional)" name="descripcion" value={formCaja.descripcion}
            onChange={cambiarCaja} placeholder="Ubicación u observaciones" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="activa" checked={formCaja.activa} onChange={cambiarCaja}
              className="w-4 h-4 rounded border-border text-ink focus:ring-accent/30" />
            <span className="text-sm text-ink">Caja activa</span>
          </label>
          {(crearMutation.isError || editarMutation.isError) && (
            <p className="text-xs text-red-500">
              {(crearMutation.error || editarMutation.error)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={cerrarModal}>Cancelar</Button>
            <Button type="submit" loading={crearMutation.isPending || editarMutation.isPending}>
              {editandoCaja ? 'Guardar cambios' : 'Crear caja'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

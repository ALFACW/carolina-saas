import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Key, UserCheck, UserX } from 'lucide-react'
import { usuariosService } from '../services/usuarios'
import { Table } from '../components/Common/Table'
import { Modal } from '../components/Common/Modal'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

const ROLES = ['admin', 'supervisor', 'cajero', 'inventario']

const ROL_BADGE = {
  admin:      'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
  cajero:     'bg-green-100 text-green-700',
  vendedor:   'bg-green-100 text-green-700',
  inventario: 'bg-orange-100 text-orange-700',
}

function RolBadge({ rol }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ROL_BADGE[rol] || 'bg-gray-100 text-gray-600'}`}>
      {rol}
    </span>
  )
}

const FORM_VACÍO = { nombre: '', email: '', password: '', rol: 'cajero', activo: true }

export default function Usuarios() {
  const qc = useQueryClient()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null) // null = crear, objeto = editar
  const [form, setForm] = useState(FORM_VACÍO)
  const [errors, setErrors] = useState({})

  const [modalPassword, setModalPassword] = useState(false)
  const [usuarioPassword, setUsuarioPassword] = useState(null)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [errorPassword, setErrorPassword] = useState('')

  const [modalEliminar, setModalEliminar] = useState(false)
  const [usuarioEliminar, setUsuarioEliminar] = useState(null)

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosService.getAll,
  })

  const crearMutation = useMutation({
    mutationFn: (u) => usuariosService.create(u),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      cerrarModal()
    },
  })

  const editarMutation = useMutation({
    mutationFn: ({ id, datos }) => usuariosService.update(id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      cerrarModal()
    },
  })

  const eliminarMutation = useMutation({
    mutationFn: (id) => usuariosService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setModalEliminar(false)
      setUsuarioEliminar(null)
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => usuariosService.resetPassword(id, password),
    onSuccess: () => {
      setModalPassword(false)
      setUsuarioPassword(null)
      setNuevaPassword('')
      setErrorPassword('')
    },
  })

  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_VACÍO)
    setErrors({})
    setModalAbierto(true)
  }

  const abrirEditar = (u) => {
    setEditando(u)
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo })
    setErrors({})
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditando(null)
    setForm(FORM_VACÍO)
    setErrors({})
  }

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validar = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (!editando && !form.password) e.password = 'Requerido'
    if (!form.rol) e.rol = 'Requerido'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }

    if (editando) {
      const datos = { nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo }
      editarMutation.mutate({ id: editando.id || editando._id, datos })
    } else {
      crearMutation.mutate({ nombre: form.nombre, email: form.email, password: form.password, rol: form.rol })
    }
  }

  const abrirResetPassword = (u) => {
    setUsuarioPassword(u)
    setNuevaPassword('')
    setErrorPassword('')
    setModalPassword(true)
  }

  const handleResetPassword = (e) => {
    e.preventDefault()
    if (!nuevaPassword || nuevaPassword.length < 6) {
      setErrorPassword('Mínimo 6 caracteres')
      return
    }
    resetPasswordMutation.mutate({ id: usuarioPassword.id || usuarioPassword._id, password: nuevaPassword })
  }

  const confirmarEliminar = (u) => {
    setUsuarioEliminar(u)
    setModalEliminar(true)
  }

  const columnas = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    {
      key: 'rol',
      label: 'Rol',
      render: (val) => <RolBadge rol={val} />,
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (val) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${val ? 'text-green-600' : 'text-gray-400'}`}>
          {val ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
          {val ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => abrirEditar(row)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => abrirResetPassword(row)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Resetear contraseña"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => confirmarEliminar(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  const mutacionActiva = crearMutation.isPending || editarMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestiona los usuarios y sus roles</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Tabla */}
      <Table
        columns={columnas}
        data={usuarios}
        loading={isLoading}
        emptyMessage="No hay usuarios registrados"
      />

      {/* Modal crear / editar */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={editando ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            name="nombre"
            value={form.nombre}
            onChange={cambiar}
            error={errors.nombre}
            placeholder="Juan Pérez"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={cambiar}
            error={errors.email}
            placeholder="juan@empresa.com"
          />
          {!editando && (
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={cambiar}
              error={errors.password}
              placeholder="Mínimo 6 caracteres"
            />
          )}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Rol
            </label>
            <select
              name="rol"
              value={form.rol}
              onChange={cambiar}
              className="w-full px-3 py-2 border border-gray-200 text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              {ROLES.map(r => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
            {errors.rol && <p className="text-xs text-red-500">{errors.rol}</p>}
          </div>
          {editando && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="activo"
                checked={form.activo}
                onChange={cambiar}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Usuario activo</span>
            </label>
          )}
          {(crearMutation.isError || editarMutation.isError) && (
            <p className="text-xs text-red-500">
              {(crearMutation.error || editarMutation.error)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={cerrarModal}>Cancelar</Button>
            <Button type="submit" loading={mutacionActiva}>
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal reset password */}
      <Modal
        isOpen={modalPassword}
        onClose={() => setModalPassword(false)}
        title={`Resetear contraseña — ${usuarioPassword?.nombre || ''}`}
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-500">
            Establece una nueva contraseña para este usuario. Se le pedirá que la cambie en su próximo inicio de sesión.
          </p>
          <Input
            label="Nueva contraseña"
            type="password"
            value={nuevaPassword}
            onChange={(e) => { setNuevaPassword(e.target.value); setErrorPassword('') }}
            error={errorPassword}
            placeholder="Mínimo 6 caracteres"
          />
          {resetPasswordMutation.isError && (
            <p className="text-xs text-red-500">
              {resetPasswordMutation.error?.response?.data?.message || 'Error al resetear'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalPassword(false)}>Cancelar</Button>
            <Button type="submit" loading={resetPasswordMutation.isPending}>Resetear contraseña</Button>
          </div>
        </form>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        isOpen={modalEliminar}
        onClose={() => setModalEliminar(false)}
        title="Eliminar usuario"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que quieres eliminar a <strong>{usuarioEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          {eliminarMutation.isError && (
            <p className="text-xs text-red-500">
              {eliminarMutation.error?.response?.data?.message || 'Error al eliminar'}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalEliminar(false)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={eliminarMutation.isPending}
              onClick={() => eliminarMutation.mutate(usuarioEliminar?.id || usuarioEliminar?._id)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

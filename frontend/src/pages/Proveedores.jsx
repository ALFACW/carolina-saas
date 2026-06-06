import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { proveedoresService } from '../services/proveedores'
import { Table } from '../components/Common/Table'
import { Button } from '../components/Common/Button'
import { Modal } from '../components/Common/Modal'
import { Input } from '../components/Common/Input'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const EMPTY_FORM = {
  nombre: '',
  nit: '',
  email: '',
  telefono: '',
  ciudad: '',
  contacto: '',
  notas: '',
}

export default function Proveedores() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, nombre: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['proveedores', search, page],
    queryFn: () => proveedoresService.getAll({ search, page, limit: 20 }),
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: proveedoresService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => proveedoresService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: proveedoresService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModal(true)
  }

  const openEdit = (prov) => {
    setEditing(prov)
    setForm({
      nombre:   prov.nombre   || '',
      nit:      prov.nit      || '',
      email:    prov.email    || '',
      telefono: prov.telefono || '',
      ciudad:   prov.ciudad   || '',
      contacto: prov.contacto || '',
      notas:    prov.notas    || '',
    })
    setErrors({})
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleDelete = (prov) => {
    setConfirmDialog({ open: true, id: prov.id, nombre: prov.nombre })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const columns = [
    {
      key: 'nombre',
      label: 'Proveedor',
      render: (v, row) => (
        <div>
          <p className="font-medium text-ink">{v}</p>
          {row.nit && <p className="text-xs text-ink-2">NIT: {row.nit}</p>}
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: v => v || '—' },
    { key: 'email',    label: 'Email',    render: v => v || '—' },
    { key: 'ciudad',   label: 'Ciudad',   render: v => v || '—' },
    { key: 'contacto', label: 'Contacto', render: v => v || '—' },
    {
      key: 'acciones',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 text-accent hover:bg-accent-soft rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Proveedores</h1>
          <p className="text-sm text-ink-2 mt-0.5">Gestiona tus proveedores ({data?.total || 0})</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          Nuevo proveedor
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-ink placeholder:text-ink-2/60"
          placeholder="Buscar por nombre o NIT..."
          aria-label="Buscar"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <Table
          columns={columns}
          data={data?.proveedores || []}
          loading={isLoading}
          emptyMessage="No hay proveedores registrados"
        />
      </div>

      {/* Paginación */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 text-ink hover:bg-surface-soft"
          >
            Anterior
          </button>
          <span className="text-sm text-ink-2">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 text-ink hover:bg-surface-soft"
          >
            Siguiente
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null, nombre: '' })}
        onConfirm={() => { deleteMutation.mutate(confirmDialog.id); setConfirmDialog({ open: false, id: null, nombre: '' }) }}
        title="¿Eliminar proveedor?"
        message={`"${confirmDialog.nombre}" será eliminado permanentemente.`}
        confirmLabel="Sí, eliminar"
        loading={deleteMutation.isPending}
      />

      {/* Modal de creación/edición */}
      <Modal
        isOpen={modal}
        onClose={closeModal}
        title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre *"
                value={form.nombre}
                onChange={e => setField('nombre', e.target.value)}
                error={errors.nombre}
                placeholder="Nombre o razón social"
              />
            </div>
            <Input
              label="NIT"
              value={form.nit}
              onChange={e => setField('nit', e.target.value)}
              placeholder="900.123.456-7"
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={e => setField('telefono', e.target.value)}
              placeholder="310 000 0000"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="proveedor@empresa.com"
            />
            <Input
              label="Ciudad"
              value={form.ciudad}
              onChange={e => setField('ciudad', e.target.value)}
              placeholder="Bogotá"
            />
            <div className="col-span-2">
              <Input
                label="Nombre del contacto"
                value={form.contacto}
                onChange={e => setField('contacto', e.target.value)}
                placeholder="Persona de contacto"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wide">
                Notas
              </label>
              <textarea
                value={form.notas}
                onChange={e => setField('notas', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent hover:border-border-strong resize-none"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSaving}>
              {editing ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

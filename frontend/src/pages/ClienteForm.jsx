import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { clientesService } from '../services/clientes'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

export default function ClienteForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { tipo_documento: 'CC' }
  })

  const { data: cliente } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesService.getById(id),
    enabled: isEdit,
  })

  useEffect(() => { if (cliente) reset(cliente) }, [cliente, reset])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? clientesService.update(id, data) : clientesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado')
      navigate('/clientes')
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Error al guardar el cliente'),
  })

  return (
    <div className="min-h-screen bg-surface-soft p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </button>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            {isEdit ? 'Modifica los datos del cliente' : 'Registra un nuevo cliente en el sistema'}
          </p>
        </div>

        {/* Card formulario */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Tipo de documento *</label>
                <select
                  {...register('tipo_documento', { required: true })}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">Cédula Extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>

              <Input
                label="Número de documento *"
                error={errors.numero_documento?.message}
                {...register('numero_documento', { required: 'Requerido' })}
                placeholder="1234567890"
              />

              <div className="col-span-2">
                <Input
                  label="Nombre completo *"
                  error={errors.nombre?.message}
                  {...register('nombre', { required: 'Nombre requerido' })}
                  placeholder="Juan Pérez / Empresa SAS"
                />
              </div>

              <Input label="Email" type="email" {...register('email')} placeholder="cliente@email.com" />
              <Input label="Teléfono" {...register('telefono')} placeholder="+57 300 000 0000" />
              <Input label="Dirección" {...register('direccion')} placeholder="Calle 1 # 2-3" />
              <Input label="Ciudad" {...register('ciudad')} placeholder="Bogotá" />
            </div>

            {mutation.isError && (
              <p className="text-sm text-danger">
                {mutation.error?.response?.data?.error || 'Error al guardar'}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

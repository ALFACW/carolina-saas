import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); navigate('/clientes') },
  })

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />Volver
      </button>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
              <select {...register('tipo_documento', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="NIT">NIT</option>
                <option value="CE">Cédula Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <Input label="Número de documento *" error={errors.numero_documento?.message}
              {...register('numero_documento', { required: 'Requerido' })} placeholder="1234567890" />
            <div className="col-span-2">
              <Input label="Nombre completo *" error={errors.nombre?.message}
                {...register('nombre', { required: 'Nombre requerido' })} placeholder="Juan Pérez / Empresa SAS" />
            </div>
            <Input label="Email" type="email" {...register('email')} placeholder="cliente@email.com" />
            <Input label="Teléfono" {...register('telefono')} placeholder="+57 300 000 0000" />
            <Input label="Dirección" {...register('direccion')} placeholder="Calle 1 # 2-3" />
            <Input label="Ciudad" {...register('ciudad')} placeholder="Bogotá" />
          </div>
          {mutation.isError && <p className="text-sm text-red-600">{mutation.error?.response?.data?.error || 'Error al guardar'}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending}>{isEdit ? 'Guardar cambios' : 'Crear cliente'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

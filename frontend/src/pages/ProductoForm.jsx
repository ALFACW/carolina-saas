import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ScanBarcode, Info } from 'lucide-react'
import { productosService } from '../services/productos'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

function useBarcodeScanner(onScan, enabled = true) {
  const buffer  = useRef('')
  const timerRef = useRef(null)
  const lastTime = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase()
      const isOtherInput = (tag === 'input' || tag === 'textarea') && e.target.dataset.barcode !== 'true'
      if (isOtherInput) return

      const now = Date.now()
      const gap = now - lastTime.current
      lastTime.current = now

      if (e.key === 'Enter') {
        const code = buffer.current
        buffer.current = ''
        clearTimeout(timerRef.current)
        if (code.length >= 3) {
          e.preventDefault()
          onScan(code)
        }
        return
      }

      if (e.key.length === 1) {
        if (gap < 80 || buffer.current === '') {
          buffer.current += e.key
        } else {
          buffer.current = e.key
        }
      }

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { buffer.current = '' }, 300)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timerRef.current)
    }
  }, [enabled, onScan])
}

export default function ProductoForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [scanned, setScanned] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { impuesto_iva: 19, stock_minimo: 5, bodega: 'principal' }
  })

  const codigoActual = watch('codigo')

  const { data: producto } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => productosService.getById(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (producto) reset(producto)
  }, [producto, reset])

  useBarcodeScanner((code) => {
    setValue('codigo', code, { shouldDirty: true })
    setScanned(true)
    setTimeout(() => setScanned(false), 2000)
  }, true)

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? productosService.update(id, data) : productosService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      navigate('/productos')
    },
  })

  const onSubmit = (data) => {
    mutation.mutate({
      ...data,
      precio_venta: parseFloat(data.precio_venta),
      precio_costo: parseFloat(data.precio_costo) || 0,
      stock_actual: parseInt(data.stock_actual) || 0,
      stock_minimo: parseInt(data.stock_minimo) || 0,
      impuesto_iva: parseFloat(data.impuesto_iva) || 19,
    })
  }

  return (
    <div className="min-h-screen bg-surface-soft p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a inventario
        </button>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            {isEdit ? 'Modifica los datos del producto' : 'Agrega un nuevo producto al inventario'}
          </p>
        </div>

        {/* Banner scanner */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all border ${
          scanned
            ? 'bg-green-50 border-green-200 text-success'
            : 'bg-accent-soft border-accent/20 text-accent'
        }`}>
          <ScanBarcode className={`w-4 h-4 flex-shrink-0 ${scanned ? 'text-success' : 'text-accent'}`} />
          {scanned
            ? <>Código <strong>{codigoActual}</strong> capturado correctamente</>
            : 'Escanea el código de barras del producto en cualquier momento para rellenar el código automáticamente'
          }
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.type !== 'submit') {
                e.preventDefault()
              }
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="col-span-2">
                <Input
                  label="Nombre del producto *"
                  error={errors.nombre?.message}
                  placeholder="Ej: Camiseta blanca talla M"
                  {...register('nombre', { required: 'Nombre requerido' })}
                />
              </div>

              {/* Campo código */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Código / código de barras
                </label>
                <div className="relative">
                  <input
                    data-barcode="true"
                    placeholder="Escanea o escribe"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${
                      scanned
                        ? 'border-green-400 bg-green-50'
                        : 'border-border hover:border-border-strong'
                    }`}
                    {...register('codigo')}
                  />
                  <ScanBarcode className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    scanned ? 'text-success' : 'text-ink-2'
                  }`} />
                </div>
              </div>

              <Input label="Categoría" placeholder="Ropa, Alimentos..." {...register('categoria')} />

              <div>
                <Input
                  label="Precio de venta *"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  error={errors.precio_venta?.message}
                  {...register('precio_venta', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser mayor a 0' } })}
                />
              </div>
              <Input label="Precio de costo" type="number" step="0.01" placeholder="0" {...register('precio_costo')} />

              <Input label="Stock inicial" type="number" placeholder="0" {...register('stock_actual')} />
              <Input label="Stock mínimo (alerta)" type="number" placeholder="0" {...register('stock_minimo')} />

              <Input label="IVA %" type="number" step="0.01" {...register('impuesto_iva')} />
              <Input label="Bodega" placeholder="principal" {...register('bodega')} />

              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink mb-1.5">Descripción</label>
                <textarea
                  {...register('descripcion')}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            {/* Nota IVA */}
            <div className="flex items-start gap-2 bg-accent-soft border border-accent/20 rounded-lg px-4 py-3 text-sm text-accent">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>El <strong>precio de venta incluye IVA</strong>. No se suma IVA encima del precio ingresado.</span>
            </div>

            {mutation.isError && (
              <p className="text-sm text-danger">{mutation.error?.response?.data?.error || 'Error al guardar'}</p>
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
                {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

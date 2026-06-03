import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ScanBarcode } from 'lucide-react'
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
      // Ignorar si el foco está en un input que NO sea el campo código
      const tag = e.target.tagName.toLowerCase()
      const isOtherInput = (tag === 'input' || tag === 'textarea') && e.target.dataset.barcode !== 'true'
      if (isOtherInput) return

      const now = Date.now()
      const gap = now - lastTime.current
      lastTime.current = now

      // Enter = fin de escaneo
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

      // Acumular solo caracteres imprimibles
      if (e.key.length === 1) {
        // Si viene muy rápido o buffer vacío, acumular
        if (gap < 80 || buffer.current === '') {
          buffer.current += e.key
        } else {
          // Pausa larga = tipeo humano, reiniciar
          buffer.current = e.key
        }
      }

      // Limpiar buffer si no llega Enter en 300ms
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

  // Detectar pistola lectora globalmente — rellena el campo código (funciona en crear Y editar)
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
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver
      </button>

      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-6">
          {isEdit ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        {/* Banner de escaneo — crear y editar */}
        <div className={`flex items-center gap-3 rounded-md px-4 py-3 mb-6 text-sm transition-all ${
            scanned
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-gray-50 border border-gray-100 text-gray-500'
          }`}>
            <ScanBarcode className={`w-4 h-4 flex-shrink-0 ${scanned ? 'text-green-600' : 'text-gray-400'}`} />
            {scanned
              ? <>Código <strong>{codigoActual}</strong> capturado correctamente</>
              : 'Escanea el código de barras del producto en cualquier momento para rellenar el código automáticamente'
            }
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          onKeyDown={(e) => {
            // Bloquar Enter en inputs (evita que el scanner o el usuario
            // cierren el formulario sin querer). Solo el botón Submit lo envía.
            if (e.key === 'Enter' && e.target.type !== 'submit') {
              e.preventDefault()
            }
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nombre del producto *"
                error={errors.nombre?.message}
                placeholder="Ej: Camiseta blanca talla M"
                {...register('nombre', { required: 'Nombre requerido' })}
              />
            </div>

            {/* Campo código — se rellena al escanear */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Código / código de barras
              </label>
              <div className="relative">
                <input
                  data-barcode="true"
                  placeholder="Escanea o escribe"
                  className={`w-full px-3 py-2 border rounded-md text-sm font-mono transition-all focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                    scanned
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  {...register('codigo')}
                />
                <ScanBarcode className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  scanned ? 'text-green-500' : 'text-gray-300'
                }`} />
              </div>
            </div>

            <Input label="Categoría" placeholder="Ropa, Alimentos..." {...register('categoria')} />

            <Input
              label="Precio de venta *"
              type="number"
              step="0.01"
              placeholder="0"
              error={errors.precio_venta?.message}
              {...register('precio_venta', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser mayor a 0' } })}
            />
            <Input label="Precio de costo" type="number" step="0.01" placeholder="0" {...register('precio_costo')} />

            <Input label="Stock inicial" type="number" placeholder="0" {...register('stock_actual')} />
            <Input label="Stock mínimo (alerta)" type="number" placeholder="0" {...register('stock_minimo')} />

            <Input label="IVA %" type="number" step="0.01" {...register('impuesto_iva')} />
            <Input label="Bodega" placeholder="principal" {...register('bodega')} />

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Descripción</label>
              <textarea
                {...register('descripcion')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="Descripción opcional"
              />
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500">{mutation.error?.response?.data?.error || 'Error al guardar'}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

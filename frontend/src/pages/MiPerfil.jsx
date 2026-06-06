import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, User, Lock, Camera, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import api from '../services/api'

export default function MiPerfil() {
  const { user, updateTenant, updateUser } = useAuth()
  const qc = useQueryClient()
  const [errPass, setErrPass] = useState('')
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [foto, setFoto] = useState(() => localStorage.getItem('carolina_foto_perfil') || null)
  const fotoInputRef = useRef(null)

  const { register: regPerfil, handleSubmit: handlePerfil, formState: { errors: errPerfil } } = useForm({
    defaultValues: { nombre: user?.nombre || '', email: user?.email || '' }
  })

  const { register: regPass, handleSubmit: handlePass, reset: resetPass, formState: { errors: errPassForm } } = useForm()

  const perfilMutation = useMutation({
    mutationFn: async (data) => {
      const { data: res } = await api.put('/api/auth/perfil', data)
      return res
    },
    onSuccess: (data, variables) => {
      updateUser({ nombre: variables.nombre, email: variables.email })
      qc.invalidateQueries({ queryKey: ['tenant-me'] })
      toast.success('Perfil actualizado correctamente')
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Error al actualizar el perfil'),
  })

  const passwordMutation = useMutation({
    mutationFn: async (data) => {
      const { data: res } = await api.put('/api/auth/password', {
        password_actual: data.password_actual,
        password_nuevo: data.password_nuevo,
      })
      return res
    },
    onSuccess: () => {
      setErrPass('')
      resetPass()
      toast.success('Contraseña actualizada correctamente')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Error al cambiar la contraseña'
      setErrPass(msg)
      toast.error(msg)
    },
  })

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      localStorage.setItem('carolina_foto_perfil', ev.target.result)
      setFoto(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const onSubmitPass = (data) => {
    setErrPass('')
    if (data.password_nuevo !== data.password_confirmar) {
      setErrPass('Las contraseñas nuevas no coinciden')
      return
    }
    passwordMutation.mutate(data)
  }

  const iniciales = user?.nombre
    ? user.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U'

  const rolColors = {
    admin: 'bg-accent-soft text-accent',
    supervisor: 'bg-yellow-50 text-warning',
    cajero: 'bg-green-50 text-success',
    vendedor: 'bg-purple-50 text-purple-700',
    inventario: 'bg-orange-50 text-orange-700',
  }

  return (
    <div className="min-h-screen bg-surface-soft p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-ink">Mi perfil</h1>
          <p className="text-sm text-ink-2 mt-1">Gestiona tu información personal y seguridad</p>
        </div>

        {/* Foto de perfil */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <Camera className="w-5 h-5 text-ink-2" />
            <h2 className="font-semibold text-ink">Foto de perfil</h2>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="relative group flex-shrink-0 focus:outline-none"
              title="Cambiar foto"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border group-hover:border-accent transition-colors">
                {foto ? (
                  <img src={foto} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-accent flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">{iniciales}</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <div>
              <p className="text-sm font-medium text-ink">
                {foto ? 'Foto de perfil cargada' : 'Sin foto de perfil'}
              </p>
              <p className="text-xs text-ink-2 mt-0.5 mb-3">
                Haz clic en el avatar para cambiar la foto. Se guarda localmente.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  className="text-xs px-3 py-1.5 border border-border rounded-lg text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
                >
                  {foto ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {foto && (
                  <button
                    type="button"
                    onClick={() => { localStorage.removeItem('carolina_foto_perfil'); setFoto(null) }}
                    className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-danger hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
            <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </div>
        </div>

        {/* Datos personales */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="w-5 h-5 text-ink-2" />
            <h2 className="font-semibold text-ink">Mis datos</h2>
            {user?.rol && (
              <span className={`ml-auto text-xs font-semibold capitalize px-2.5 py-1 rounded-full ${rolColors[user.rol] || 'bg-surface-soft text-ink-2'}`}>
                {user.rol}
              </span>
            )}
          </div>

          {/* Info de solo lectura */}
          {user?.username && (
            <div className="mb-4 p-3 bg-surface-soft rounded-lg border border-border">
              <p className="text-xs text-ink-2">
                <span className="font-medium text-ink">Usuario:</span> @{user.username}
              </p>
            </div>
          )}

          <form onSubmit={handlePerfil(d => perfilMutation.mutate(d))} className="space-y-4">
            <Input
              label="Nombre completo"
              error={errPerfil.nombre?.message}
              {...regPerfil('nombre', { required: 'El nombre es requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
            />
            <Input
              label="Correo electrónico"
              type="email"
              error={errPerfil.email?.message}
              {...regPerfil('email', { required: 'El email es requerido' })}
            />
            {perfilMutation.isError && (
              <p className="text-sm text-danger">{perfilMutation.error?.response?.data?.error}</p>
            )}
            <button
              type="submit"
              disabled={perfilMutation.isPending}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {perfilMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <Lock className="w-5 h-5 text-ink-2" />
            <h2 className="font-semibold text-ink">Cambiar contraseña</h2>
          </div>

          {errPass && (
            <div className="bg-red-50 text-danger px-4 py-3 rounded-lg mb-4 text-sm border border-red-200">{errPass}</div>
          )}

          <form onSubmit={handlePass(onSubmitPass)} className="space-y-4">
            {/* Contraseña actual */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showActual ? 'text' : 'password'}
                  className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  {...regPass('password_actual', { required: true })}
                />
                <button type="button" onClick={() => setShowActual(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink transition-colors">
                  {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNueva ? 'text' : 'password'}
                  className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  {...regPass('password_nuevo', { required: true, minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                />
                <button type="button" onClick={() => setShowNueva(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink transition-colors">
                  {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Input
              label="Confirmar nueva contraseña"
              type="password"
              error={errPassForm.password_confirmar?.message}
              {...regPass('password_confirmar', { required: 'Confirma la nueva contraseña' })}
            />

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              {passwordMutation.isPending ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Eye, EyeOff, User, Lock, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import api from '../services/api'

export default function MiPerfil() {
  const { user, updateTenant } = useAuth()
  const qc = useQueryClient()
  const [msgPerfil, setMsgPerfil] = useState('')
  const [msgPass, setMsgPass] = useState('')
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
    onSuccess: (data) => {
      setMsgPerfil('Perfil actualizado correctamente')
      qc.invalidateQueries({ queryKey: ['tenant-me'] })
      setTimeout(() => setMsgPerfil(''), 3000)
    },
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
      setMsgPass('Contraseña actualizada correctamente')
      setErrPass('')
      resetPass()
      setTimeout(() => setMsgPass(''), 3000)
    },
    onError: (err) => {
      setErrPass(err.response?.data?.error || 'Error al cambiar la contraseña')
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

  // Obtener iniciales del usuario
  const iniciales = user?.nombre
    ? user.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Foto de perfil */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Camera className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Foto de perfil</h2>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            className="relative group flex-shrink-0 focus:outline-none"
            title="Cambiar foto"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-gray-400 transition-colors">
              {foto ? (
                <img src={foto} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{iniciales}</span>
                </div>
              )}
            </div>
            {/* Overlay al hacer hover */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {foto ? 'Foto de perfil cargada' : 'Sin foto de perfil'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              Haz clic en el avatar para cambiar la foto. Se guarda localmente.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {foto ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {foto && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('carolina_foto_perfil')
                    setFoto(null)
                  }}
                  className="text-xs px-3 py-1.5 border border-red-100 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFoto}
          />
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Mis datos</h2>
          <span className="ml-auto text-xs font-medium text-gray-400 capitalize bg-gray-50 px-2.5 py-1 rounded-full">
            {user?.rol}
          </span>
        </div>

        {msgPerfil && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <CheckCircle2 className="w-4 h-4" />{msgPerfil}
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
            <p className="text-sm text-red-500">{perfilMutation.error?.response?.data?.error}</p>
          )}
          <Button type="submit" loading={perfilMutation.isPending}>
            Guardar cambios
          </Button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>
        </div>

        {msgPass && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <CheckCircle2 className="w-4 h-4" />{msgPass}
          </div>
        )}
        {errPass && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{errPass}</div>
        )}

        <form onSubmit={handlePass(onSubmitPass)} className="space-y-4">
          {/* Contraseña actual */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showActual ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                {...regPass('password_actual', { required: true })}
              />
              <button type="button" onClick={() => setShowActual(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNueva ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                {...regPass('password_nuevo', { required: true, minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
              />
              <button type="button" onClick={() => setShowNueva(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            error={errPassForm.password_confirmar?.message}
            {...regPass('password_confirmar', { required: 'Confirma la nueva contraseña' })}
          />

          <Button type="submit" loading={passwordMutation.isPending}>
            Cambiar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}

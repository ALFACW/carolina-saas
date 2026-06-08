import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { getApiError } from '../lib/errors'

const PLANES = [
  { id: 'basico',      nombre: 'Básico',       precio: '$189.000/mes', desc: '3 usuarios · 2 cajas · 200 ventas/día' },
  { id: 'profesional', nombre: 'Profesional',  precio: '$299.000/mes', desc: '10 usuarios · cajas ilimitadas · 500 ventas/día', popular: true },
  { id: 'empresarial', nombre: 'Empresarial',  precio: '$549.000/mes', desc: 'Usuarios ilimitados · todo ilimitado' },
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const [empresa, setEmpresa] = useState({ nombre: '', nit: '', email: '', telefono: '', ciudad: '', plan: 'basico' })
  const [admin, setAdmin] = useState({ nombre: '', email: '', password: '' })

  const setEmpresaField = (key, value) => {
    setEmpresa(p => ({ ...p, [key]: value }))
    if (fieldErrors[key]) setFieldErrors(p => ({ ...p, [key]: '' }))
  }

  const setAdminField = (key, value) => {
    setAdmin(p => ({ ...p, [key]: value }))
    if (fieldErrors[key]) setFieldErrors(p => ({ ...p, [key]: '' }))
  }

  const validarNIT = (nit) => {
    const limpio = nit.replace(/[.\-\s]/g, '')
    return /^\d{7,10}$/.test(limpio)
  }

  const getPasswordStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const getPasswordLabel = (pwd) => {
    const s = getPasswordStrength(pwd)
    return ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][s]
  }

  const validarStep1 = () => {
    const e = {}
    if (!empresa.nombre.trim()) e.nombre = 'El nombre de la empresa es requerido'
    if (!empresa.nit.trim()) e.nit = 'El NIT es requerido'
    else if (!validarNIT(empresa.nit)) e.nit = 'NIT inválido. Solo números sin puntos ni guión.'
    if (!empresa.email.trim()) e.email = 'El email es requerido'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(empresa.email)) e.email = 'Email inválido'
    return e
  }

  const validarStep2 = () => {
    const e = {}
    if (!admin.nombre.trim()) e.nombre = 'El nombre es requerido'
    if (!admin.email.trim()) e.email = 'El email es requerido'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(admin.email)) e.email = 'Email inválido'
    if (!admin.password) e.password = 'La contraseña es requerida'
    else if (admin.password.length < 8) e.password = 'Mínimo 8 caracteres'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 1) {
      const errs = validarStep1()
      if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
      setFieldErrors({})
      setError('')
      setStep(2)
      return
    }
    const errs = validarStep2()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})
    setError('')
    setLoading(true)
    try {
      await register(empresa, admin)
      navigate('/dashboard')
    } catch (err) {
      setError(getApiError(err, 'Error al registrarse'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-xl text-white">C</span>
            <span className="font-brand font-semibold text-xl text-ink flex items-center">
              Carolina<span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Crear cuenta</h1>
          <p className="text-sm text-ink-2 mt-1">Empieza a facturar electrónicamente hoy</p>

          {/* Steps */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-accent' : s < step ? 'w-4 bg-accent/40' : 'w-4 bg-border-strong'}`} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-8">

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-danger px-4 py-3 rounded-lg mb-5 text-sm border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <h2 className="text-base font-semibold text-ink mb-4">Datos de tu empresa</h2>
                {[
                  { label: 'Nombre de la empresa *', key: 'nombre', placeholder: 'Mi Empresa SAS' },
                  { label: 'NIT *', key: 'nit', placeholder: '9001234567' },
                  { label: 'Email empresarial *', key: 'email', type: 'email', placeholder: 'info@empresa.com' },
                  { label: 'Teléfono', key: 'telefono', placeholder: '+57 300 000 0000' },
                  { label: 'Ciudad', key: 'ciudad', placeholder: 'Bogotá' },
                ].map(({ label, key, ...rest }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
                    <input
                      value={empresa[key]}
                      onChange={e => setEmpresaField(key, e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                        fieldErrors[key]
                          ? 'border-danger bg-red-50 focus:ring-danger/30 focus:border-danger'
                          : 'border-border focus:ring-accent/30 focus:border-accent'
                      }`}
                      {...rest}
                    />
                    {fieldErrors[key]
                      ? <p className="text-xs text-danger mt-1">{fieldErrors[key]}</p>
                      : key === 'nit' && <p className="text-xs text-ink-2 mt-1">Solo números, sin puntos ni guión. Ej: 9001234567</p>
                    }
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Selecciona tu plan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEmpresa(prev => ({ ...prev, plan: p.id }))}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                          empresa.plan === p.id
                            ? 'border-accent bg-accent-soft'
                            : 'border-border hover:border-border-strong'
                        }`}
                      >
                        {p.popular && (
                          <span className="absolute -top-2 right-2 text-xs bg-accent text-white px-1.5 py-0.5 rounded-full">Popular</span>
                        )}
                        {empresa.plan === p.id && (
                          <CheckCircle2 className="w-4 h-4 text-accent absolute top-2 right-2" />
                        )}
                        <p className="font-semibold text-sm text-ink">{p.nombre}</p>
                        <p className="text-accent text-xs font-medium mt-0.5">{p.precio}</p>
                        <p className="text-ink-2 text-xs mt-0.5">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-base font-semibold text-ink mb-4">Datos del administrador</h2>

                {/* Resumen empresa */}
                <div className="bg-accent-soft border border-accent/20 rounded-lg p-3 text-xs text-accent mb-4">
                  <strong>Empresa:</strong> {empresa.nombre} · <strong>Plan:</strong> {empresa.plan}
                  <button type="button" onClick={() => setStep(1)} className="ml-2 underline hover:no-underline">Cambiar</button>
                </div>

                {[
                  { label: 'Nombre completo *', key: 'nombre', placeholder: 'Juan Pérez' },
                  { label: 'Email de acceso *', key: 'email', type: 'email', placeholder: 'admin@empresa.com' },
                  { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 8 caracteres' },
                ].map(({ label, key, ...rest }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
                    <input
                      value={admin[key]}
                      onChange={e => setAdminField(key, e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                        fieldErrors[key]
                          ? 'border-danger bg-red-50 focus:ring-danger/30 focus:border-danger'
                          : 'border-border focus:ring-accent/30 focus:border-accent'
                      }`}
                      {...rest}
                    />
                    {fieldErrors[key] && <p className="text-xs text-danger mt-1">{fieldErrors[key]}</p>}
                    {key === 'password' && admin.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4].map(level => (
                            <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                              getPasswordStrength(admin.password) >= level
                                ? level <= 1 ? 'bg-danger' : level <= 2 ? 'bg-warning' : level <= 3 ? 'bg-yellow-400' : 'bg-success'
                                : 'bg-border'
                            }`} />
                          ))}
                        </div>
                        <p className="text-xs text-ink-2">{getPasswordLabel(admin.password)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-ink hover:bg-surface-soft transition-colors"
                >
                  Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent/90 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando cuenta...' : step === 1 ? 'Continuar' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-ink-2">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

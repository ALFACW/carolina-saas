import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const PLANES = [
  { id: 'starter', nombre: 'Starter', precio: '$129.000/mes', desc: '1 usuario · 30 ventas/día' },
  { id: 'basico', nombre: 'Básico', precio: '$179.000/mes', desc: '3 usuarios · 100 ventas/día' },
  { id: 'profesional', nombre: 'Profesional', precio: '$279.000/mes', desc: '10 usuarios · 300 ventas/día', popular: true },
  { id: 'empresarial', nombre: 'Empresarial', precio: '$489.000/mes', desc: 'Usuarios ilimitados · 800 ventas/día' },
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const [empresa, setEmpresa] = useState({ nombre: '', nit: '', email: '', telefono: '', ciudad: '', plan: 'profesional' })
  const [admin, setAdmin] = useState({ nombre: '', email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setError('')
    setLoading(true)
    try {
      await register(empresa, admin)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse')
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
                  { label: 'Nombre de la empresa *', key: 'nombre', placeholder: 'Mi Empresa SAS', required: true },
                  { label: 'NIT *', key: 'nit', placeholder: '900123456-7', required: true },
                  { label: 'Email empresarial *', key: 'email', type: 'email', placeholder: 'info@empresa.com', required: true },
                  { label: 'Teléfono', key: 'telefono', placeholder: '+57 300 000 0000' },
                  { label: 'Ciudad', key: 'ciudad', placeholder: 'Bogotá' },
                ].map(({ label, key, ...rest }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
                    <input
                      value={empresa[key]}
                      onChange={e => setEmpresa(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm transition-colors"
                      {...rest}
                    />
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
                  { label: 'Nombre completo *', key: 'nombre', placeholder: 'Juan Pérez', required: true },
                  { label: 'Email de acceso *', key: 'email', type: 'email', placeholder: 'admin@empresa.com', required: true },
                  { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 8 caracteres', required: true, minLength: 8 },
                ].map(({ label, key, ...rest }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
                    <input
                      value={admin[key]}
                      onChange={e => setAdmin(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm transition-colors"
                      {...rest}
                    />
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

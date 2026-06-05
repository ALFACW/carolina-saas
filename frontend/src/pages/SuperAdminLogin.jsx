import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminService } from '../services/superAdmin'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { Shield } from 'lucide-react'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('carolina_sa_token')
    if (token) navigate('/super-admin', { replace: true })
  }, [navigate])

  const cambiar = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    setErrorGeneral('')
  }

  const validar = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Requerido'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (!form.password) e.password = 'Requerido'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrorGeneral('')
    try {
      const data = await superAdminService.login(form.email, form.password)
      localStorage.setItem('carolina_sa_token', data.token)
      navigate('/super-admin', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.error
               || err?.response?.data?.message
               || err?.message
               || 'Error al conectar con el servidor'
      setErrorGeneral(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* Logo + título */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-2xl text-white">C</span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Administración CarolinaPOS</h1>
          <p className="text-sm text-ink-2">Acceso exclusivo para operadores del sistema</p>
        </div>

        {/* Card formulario */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-2 text-ink-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Acceso restringido</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={cambiar}
                placeholder="admin@carolinapos.co"
                autoComplete="username"
                className={`w-full px-3 py-2.5 border text-sm rounded-lg bg-white text-ink placeholder-ink-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-border hover:border-border-strong'
                }`}
              />
              {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Contraseña</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={cambiar}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-3 py-2.5 border text-sm rounded-lg bg-white text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${
                  errors.password ? 'border-red-400 bg-red-50' : 'border-border hover:border-border-strong'
                }`}
              />
              {errors.password && <p className="text-xs text-danger">{errors.password}</p>}
            </div>

            {errorGeneral && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-danger">{errorGeneral}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-2">
          Carolina SaaS · Panel interno exclusivo
        </p>
      </div>
    </div>
  )
}

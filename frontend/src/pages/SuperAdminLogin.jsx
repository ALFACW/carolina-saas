import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminService } from '../services/superAdmin'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Si ya hay token de super admin, redirigir
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding super admin */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white text-2xl font-black">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Carolina</h1>
          <p className="text-sm text-gray-400">Panel de administración del sistema</p>
        </div>

        {/* Formulario */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Acceso restringido</h2>
            <p className="text-xs text-gray-500 mt-1">Solo operadores autorizados de Carolina</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={cambiar}
                placeholder="admin@carolina.com"
                autoComplete="username"
                className={`w-full px-3 py-2.5 border text-sm rounded-lg bg-gray-800 text-white placeholder-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                }`}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={cambiar}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-3 py-2.5 border text-sm rounded-lg bg-gray-800 text-white placeholder-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                }`}
              />
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            {errorGeneral && (
              <div className="px-3 py-2 bg-red-950 border border-red-800 rounded-lg">
                <p className="text-xs text-red-400">{errorGeneral}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600">
          Carolina SaaS · Panel interno
        </p>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Crear cuenta en Carolina</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            {[1, 2].map(s => (
              <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-blue-600' : s < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <h2 className="font-semibold text-gray-700">Datos de tu empresa</h2>
              {[
                { label: 'Nombre de la empresa *', key: 'nombre', placeholder: 'Mi Empresa SAS', required: true },
                { label: 'NIT *', key: 'nit', placeholder: '900123456-7', required: true },
                { label: 'Email empresarial *', key: 'email', type: 'email', placeholder: 'info@empresa.com', required: true },
                { label: 'Teléfono', key: 'telefono', placeholder: '+57 300 000 0000' },
                { label: 'Ciudad', key: 'ciudad', placeholder: 'Bogotá' },
              ].map(({ label, key, ...rest }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={empresa[key]} onChange={e => setEmpresa(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" {...rest} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona tu plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLANES.map(p => (
                    <button key={p.id} type="button" onClick={() => setEmpresa(prev => ({ ...prev, plan: p.id }))}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${empresa.plan === p.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      {p.popular && <span className="absolute -top-2 right-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Popular</span>}
                      {empresa.plan === p.id && <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-2 right-2" />}
                      <p className="font-semibold text-sm text-gray-900">{p.nombre}</p>
                      <p className="text-blue-600 text-xs font-medium">{p.precio}</p>
                      <p className="text-gray-500 text-xs">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold text-gray-700">Datos del administrador</h2>
              {[
                { label: 'Nombre completo *', key: 'nombre', placeholder: 'Juan Pérez', required: true },
                { label: 'Email de acceso *', key: 'email', type: 'email', placeholder: 'admin@empresa.com', required: true },
                { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 8 caracteres', required: true, minLength: 8 },
              ].map(({ label, key, ...rest }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={admin[key]} onChange={e => setAdmin(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" {...rest} />
                </div>
              ))}
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <strong>Empresa:</strong> {empresa.nombre} · <strong>Plan:</strong> {empresa.plan}
                <button type="button" onClick={() => setStep(1)} className="ml-2 underline">Cambiar</button>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step === 2 && <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Atrás</button>}
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Creando cuenta...' : step === 1 ? 'Continuar' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 hover:underline font-medium">Ingresar</Link>
        </p>
      </div>
    </div>
  )
}

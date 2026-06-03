import React, { useState } from 'react'
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { onboardingService } from '../../services/onboarding'
import { useAuth } from '../../context/AuthContext'

const STEPS = ['Introducción', 'Crear cuenta', 'Obtener token', 'Conectar']

export function WizardAlegra({ onComplete }) {
  const [step, setStep] = useState(0)
  const [tieneAlegraCuenta, setTieneAlegraCuenta] = useState(null)
  const [alegraUser, setAlegraUser] = useState('')
  const [alegraToken, setAlegraToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { updateTenant } = useAuth()

  const handleConectar = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await onboardingService.validarAlegra(alegraUser, alegraToken)
      setSuccess(true)
      updateTenant({ alegra_conectado: true, onboarding_completado: true })
      setTimeout(() => onComplete && onComplete(), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con Alegra. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progreso */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Paso 0: Introducción */}
        {step === 0 && (
          <div className="text-center">
            <div className="text-5xl mb-4">🇨🇴</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Activa tu facturación electrónica</h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Para emitir facturas legales ante la DIAN necesitas una cuenta en <strong>Alegra</strong>, un proveedor tecnológico autorizado. Es tu cuenta, a tu nombre, con tus datos fiscales.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h3>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li>✅ Tu cuenta Alegra guarda tu resolución DIAN y datos legales</li>
                <li>✅ Carolina se conecta con tu cuenta para emitir facturas en tu nombre</li>
                <li>✅ Tú controlas tus facturas y datos directamente en Alegra</li>
                <li>✅ Solo pagas tu plan de Alegra directamente a ellos</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setTieneAlegraCuenta(false); setStep(1) }}
                className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors">
                Crear cuenta nueva
              </button>
              <button onClick={() => { setTieneAlegraCuenta(true); setStep(2) }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Ya tengo cuenta en Alegra
              </button>
            </div>
          </div>
        )}

        {/* Paso 1: Crear cuenta */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear cuenta en Alegra</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-yellow-800 text-sm font-medium">💡 Necesitarás tu NIT, resolución de facturación DIAN y un plan Pyme o superior de Alegra.</p>
            </div>
            <ol className="space-y-4 mb-8">
              {[
                { n: 1, title: 'Ve a Alegra Colombia', desc: 'Haz clic en el botón de abajo para ir al sitio oficial.', link: 'https://www.alegra.com/colombia', linkText: 'Ir a Alegra.com →' },
                { n: 2, title: 'Regístrate con el NIT de tu empresa', desc: 'Usa el NIT exacto con el que tienes tu resolución DIAN.' },
                { n: 3, title: 'Configura tu resolución DIAN', desc: 'En Alegra: Configuración → Facturación Electrónica → Resoluciones.' },
                { n: 4, title: 'Activa un plan compatible', desc: 'Necesitas mínimo el plan Pyme de Alegra para facturación electrónica.' },
              ].map(({ n, title, desc, link, linkText }) => (
                <div key={n} className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">{n}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{title}</h4>
                    <p className="text-sm text-gray-500">{desc}</p>
                    {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-sm hover:underline mt-1">{linkText}<ExternalLink className="w-3 h-3" /></a>}
                  </div>
                </div>
              ))}
            </ol>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Atrás</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Ya creé mi cuenta →</button>
            </div>
          </div>
        )}

        {/* Paso 2: Obtener token */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Obtén tu token de Alegra</h2>
            <p className="text-gray-500 mb-6 text-sm">Sigue estos pasos dentro de tu cuenta de Alegra para obtener el token de integración:</p>
            <ol className="space-y-4 mb-8">
              {[
                'Inicia sesión en tu cuenta de Alegra.',
                'Haz clic en tu nombre/avatar (esquina superior derecha) → "Mi perfil".',
                'En el menú lateral, ve a "Configuración" → "Integraciones con otros sistemas".',
                'Abre la sección "Integración manual (API)".',
                'Copia tu Usuario (email) y el Token de acceso.',
              ].map((paso, i) => (
                <div key={i} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <p className="text-sm text-gray-700">{paso}</p>
                </div>
              ))}
            </ol>
            <div className="flex gap-3">
              <button onClick={() => setStep(tieneAlegraCuenta ? 0 : 1)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Atrás</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Tengo el token →</button>
            </div>
          </div>
        )}

        {/* Paso 3: Conectar */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Conectar con Alegra</h2>
            <p className="text-gray-500 mb-6 text-sm">Pega aquí las credenciales que copiaste de Alegra.</p>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900">¡Conectado exitosamente!</h3>
                <p className="text-gray-500 mt-2">Ya puedes emitir facturas electrónicas ante la DIAN.</p>
              </div>
            ) : (
              <form onSubmit={handleConectar} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de Alegra (tu email)</label>
                  <input type="email" required value={alegraUser} onChange={e => setAlegraUser(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="tu@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token de Alegra</label>
                  <div className="relative">
                    <input type={showToken ? 'text' : 'password'} required value={alegraToken} onChange={e => setAlegraToken(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      placeholder="tu-token-de-alegra" />
                    <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                  🔒 Tu token se guarda cifrado y nunca se comparte. Solo se usa para comunicarse con Alegra en tu nombre.
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Atrás</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Validando...' : 'Conectar y validar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

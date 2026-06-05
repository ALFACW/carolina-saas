import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'

const SLIDES = [
  { icon: '🏪', title: 'Punto de Venta', desc: 'Escanea productos, cobra al instante y actualiza inventario automáticamente.' },
  { icon: '📄', title: 'Facturación DIAN', desc: 'Emite facturas electrónicas válidas legalmente sin trámites complicados.' },
  { icon: '📊', title: 'Reportes en vivo', desc: 'Visualiza ventas, utilidades y productos top en tiempo real.' },
  { icon: '💳', title: 'Cartera controlada', desc: 'Lleva el registro de fiados y recibe abonos sin perder dinero.' },
  { icon: '🔒', title: 'Seguridad garantizada', desc: 'Tus datos y transacciones están protegidos con encriptación de banco.' },
]

export default function Login() {
  const [loginInput, setLoginInput] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const { login } = useAuth()
  const navigate = useNavigate()
  const timerRef = useRef(null)

  const goTo = (n) => {
    setCurrent((n + SLIDES.length) % SLIDES.length)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 6000)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 6000)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(loginInput, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      fontFamily: '"DM Sans", -apple-system, sans-serif',
      position: 'fixed',
      inset: 0,
      display: 'flex',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        background: '#fff',
      }} className="login-grid">

        {/* ---- IZQUIERDA: formulario ---- */}
        <div style={{ padding: 'clamp(32px,5vw,56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', background: '#fff' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '36px' }}>
            <img src="/brand/logo-lockup.svg" alt="CarolinaPOS" style={{ height: '36px', width: 'auto' }} />
          </Link>

          <h1 style={{ fontSize: 'clamp(26px,3vw,32px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '8px', color: '#15151a' }}>
            Bienvenido
          </h1>
          <p style={{ fontSize: '15px', color: '#565660', marginBottom: '32px', lineHeight: 1.6 }}>
            Accede a tu punto de venta y facturación electrónica DIAN.
          </p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff5f5', color: '#c0392b', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', border: '1px solid #fecdd3' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '7px', color: '#15151a' }}>
                Correo o usuario
              </label>
              <input
                type="text"
                required
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                placeholder="tus@negocios.co o usuario"
                autoComplete="username"
                style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e8e8ea', borderRadius: '11px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s, box-shadow .2s', color: '#15151a' }}
                onFocus={e => { e.target.style.borderColor = '#bfe1fe'; e.target.style.boxShadow = '0 0 0 3px rgba(92,180,250,.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e8e8ea'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '7px', color: '#15151a' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '13px 44px 13px 16px', border: '1.5px solid #e8e8ea', borderRadius: '11px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s, box-shadow .2s', color: '#15151a' }}
                  onFocus={e => { e.target.style.borderColor = '#bfe1fe'; e.target.style.boxShadow = '0 0 0 3px rgba(92,180,250,.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#e8e8ea'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8a8a93', padding: 0 }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px', marginTop: '8px' }}>
              <a href="#" style={{ fontSize: '13px', color: '#1c61c0', fontWeight: 600, textDecoration: 'none' }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', background: loading ? '#5e94d4' : '#1c61c0', color: '#fff',
              border: 'none', borderRadius: '11px', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all .18s ease', boxShadow: '0 4px 12px -4px rgba(28,97,192,.35)',
            }}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: '#565660' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: '#1c61c0', fontWeight: 600, textDecoration: 'none' }}>Regístrate gratis</Link>
          </p>
        </div>

        {/* ---- DERECHA: carrusel ---- */}
        <div style={{
          background: 'linear-gradient(135deg, #1c61c0 0%, #1a4da8 100%)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {SLIDES.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              opacity: i === current ? 1 : 0,
              transition: 'opacity .6s ease-in-out',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 40px', textAlign: 'center', color: '#fff',
              pointerEvents: i === current ? 'auto' : 'none',
            }}>
              <div style={{
                width: '110px', height: '110px', borderRadius: '24px',
                background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '54px', marginBottom: '24px',
              }}>{s.icon}</div>
              <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>{s.title}</h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.88)', maxWidth: '300px', lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}

          {/* Prev / Next */}
          {[['prev', -1, '20px', 'auto'], ['next', 1, 'auto', '20px']].map(([cls, dir, l, r]) => (
            <button key={cls} onClick={() => goTo(current + dir)} style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: l, right: r,
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 4, transition: 'background .2s',
            }}>
              {dir === -1 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          ))}

          {/* Dots */}
          <div style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 5 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === current ? '28px' : '10px', height: '10px',
                borderRadius: '5px', border: 'none', cursor: 'pointer',
                background: i === current ? '#fff' : 'rgba(255,255,255,.4)',
                transition: 'all .3s ease', padding: 0,
              }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .login-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: 280px 1fr;
            overflow-y: auto;
          }
          .login-grid > div:last-child { order: -1; min-height: unset !important; }
          .login-grid > div:first-child { overflow-y: auto; }
        }
      `}</style>
    </div>
  )
}

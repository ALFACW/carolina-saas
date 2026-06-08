import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiError } from '../lib/errors'
import { AlertCircle, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'

const SLIDES = [
  { img: '/brand/screens/pos.png',        title: 'Punto de Venta',     desc: 'Escanea, cobra y actualiza inventario al instante.' },
  { img: '/brand/screens/dashboard.png',  title: 'Dashboard en vivo',  desc: 'Visualiza ventas e ingresos del día y del mes en tiempo real.' },
  { img: '/brand/screens/facturas.png',   title: 'Facturación DIAN',   desc: 'Emite facturas electrónicas válidas legalmente sin complicaciones.' },
  { img: '/brand/screens/productos.png',  title: 'Inventario',         desc: 'Controla stock, precios e IVA de todos tus productos.' },
  { img: '/brand/screens/cierres.png',    title: 'Cierres de caja',    desc: 'Cuadratura de efectivo y seguimiento de turnos por cajero.' },
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
      setError(getApiError(err, 'Error al iniciar sesión'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: '"DM Sans", -apple-system, sans-serif', position: 'fixed', inset: 0, display: 'flex' }}>
      <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', background: '#fff' }} className="login-grid">

        {/* ── IZQUIERDA: formulario ── */}
        <div style={{ padding: 'clamp(32px,5vw,56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto', background: '#fff' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '36px' }}>
            <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1c61c0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: '"Quicksand", sans-serif', fontWeight: 700, fontSize: '20px', color: '#fff' }}>C</span>
            <span style={{ fontFamily: '"Quicksand", sans-serif', fontWeight: 600, fontSize: '18px', color: '#111111', display: 'flex', alignItems: 'center' }}>
              Carolina
              <span style={{ background: '#1c61c0', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '2px 8px', borderRadius: '6px', marginLeft: '5px' }}>POS</span>
            </span>
          </Link>

          <h1 style={{ fontSize: 'clamp(26px,3vw,32px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '8px', color: '#15151a' }}>Bienvenido</h1>
          <p style={{ fontSize: '15px', color: '#565660', marginBottom: '32px', lineHeight: 1.6 }}>Accede a tu punto de venta y facturación electrónica DIAN.</p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff5f5', color: '#c0392b', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', border: '1px solid #fecdd3' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '7px', color: '#15151a' }}>Correo o usuario</label>
              <input type="text" required value={loginInput} onChange={e => setLoginInput(e.target.value)}
                placeholder="tus@negocios.co o usuario" autoComplete="username"
                style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e8e8ea', borderRadius: '11px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s, box-shadow .2s', color: '#15151a', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#bfe1fe'; e.target.style.boxShadow = '0 0 0 3px rgba(92,180,250,.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e8e8ea'; e.target.style.boxShadow = 'none' }} />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '7px', color: '#15151a' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '13px 44px 13px 16px', border: '1.5px solid #e8e8ea', borderRadius: '11px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s, box-shadow .2s', color: '#15151a', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#bfe1fe'; e.target.style.boxShadow = '0 0 0 3px rgba(92,180,250,.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#e8e8ea'; e.target.style.boxShadow = 'none' }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8a8a93', padding: 0 }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px', marginTop: '8px' }}>
              <a href="#" style={{ fontSize: '13px', color: '#1c61c0', fontWeight: 600, textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
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

        {/* ── DERECHA: carrusel ── */}
        <div style={{ background: 'linear-gradient(145deg, #1a4da8 0%, #1c61c0 50%, #1e72d8 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px 64px' }}>

          {/* Círculos decorativos */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          {/* Slides */}
          {SLIDES.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', inset: '32px 28px 64px',
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
              transition: 'opacity .5s ease, transform .5s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: i === current ? 'auto' : 'none',
              gap: 20,
            }}>

              {/* Marco tipo browser */}
              <div style={{
                width: '100%', maxWidth: 500,
                borderRadius: 12,
                boxShadow: '0 24px 64px rgba(0,0,0,0.40), 0 4px 16px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                {/* Barra browser */}
                <div style={{ background: '#1e2433', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 5, padding: '3px 12px', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                    app.carolinapos.co
                  </div>
                </div>

                {/* Screenshot de la app */}
                <div style={{ height: 280, overflow: 'hidden', background: '#f9f9f9' }}>
                  <img
                    src={s.img}
                    alt={s.title}
                    draggable="false"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left', display: 'block' }}
                  />
                </div>
              </div>

              {/* Texto */}
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{s.title}</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', maxWidth: 340, lineHeight: 1.6, margin: '0 auto' }}>{s.desc}</p>
              </div>
            </div>
          ))}

          {/* Flechas */}
          {[[-1, '16px', 'auto'], [1, 'auto', '16px']].map(([dir, l, r]) => (
            <button key={dir} onClick={() => goTo(current + dir)} style={{
              position: 'absolute', top: '42%', transform: 'translateY(-50%)',
              left: l, right: r,
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 4, transition: 'background .2s',
            }}>
              {dir === -1 ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
            </button>
          ))}

          {/* Dots */}
          <div style={{ position: 'absolute', bottom: '22px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 5 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === current ? '26px' : '8px', height: '8px',
                borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: i === current ? '#fff' : 'rgba(255,255,255,.35)',
                transition: 'all .3s ease', padding: 0,
              }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .login-grid { grid-template-columns: 1fr !important; grid-template-rows: 300px 1fr; overflow-y: auto; }
          .login-grid > div:last-child { order: -1; min-height: unset !important; }
          .login-grid > div:first-child { overflow-y: auto; }
        }
      `}</style>
    </div>
  )
}

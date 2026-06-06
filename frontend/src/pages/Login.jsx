import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Paleta de la app ──────────────────────────────────────────────────────────
const C = {
  accent: '#1c61c0', accentSoft: '#dbeefe', accentLine: '#bfe1fe',
  ink: '#111111', ink2: '#565660',
  surface: '#ffffff', surfaceSoft: '#f9f9f9',
  border: '#e8e8ea',
  success: '#0b7d5b', danger: '#c0392b', warning: '#b45309',
}

// ── Componentes reutilizables para los mockups ────────────────────────────────
const Row = ({ children, style }) => <div style={{ display: 'flex', alignItems: 'center', ...style }}>{children}</div>
const Col = ({ children, style }) => <div style={{ display: 'flex', flexDirection: 'column', ...style }}>{children}</div>

const SidebarMock = () => (
  <div style={{ width: 34, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 5, flexShrink: 0 }}>
    <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
      <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>C</span>
    </div>
    {[C.accent, C.border, C.border, C.border, C.border, C.border].map((c, i) => (
      <div key={i} style={{ width: 18, height: 5, borderRadius: 3, background: i === 0 ? C.accentSoft : C.surfaceSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 10, height: 3, borderRadius: 2, background: i === 0 ? C.accent : C.border }} />
      </div>
    ))}
  </div>
)

const HeaderMock = ({ title, btnLabel }) => (
  <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
    <div style={{ fontSize: 8, fontWeight: 700, color: C.ink }}>{title}</div>
    {btnLabel && <div style={{ background: C.accent, color: '#fff', fontSize: 5, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{btnLabel}</div>}
  </Row>
)

const Tag = ({ label, color }) => (
  <span style={{ fontSize: 4.5, padding: '1px 4px', borderRadius: 10, background: color + '22', color, fontWeight: 600 }}>{label}</span>
)

// ── Screen 1: POS ─────────────────────────────────────────────────────────────
function ScreenPOS() {
  const productos = [
    { name: 'Leche Entera 1L', price: '$3.200', color: '#f0f9ff' },
    { name: 'Arroz x 500g', price: '$2.800', color: '#f0fdf4' },
    { name: 'Aceite 500ml', price: '$7.500', color: '#fefce8' },
    { name: 'Azúcar 1kg', price: '$4.100', color: '#fdf4ff' },
    { name: 'Pan tajado', price: '$5.900', color: '#fff7ed' },
    { name: 'Atún lata', price: '$3.600', color: '#f0f9ff' },
  ]
  const cartItems = [
    { name: 'Leche Entera 1L', qty: 2, total: '$6.400' },
    { name: 'Arroz x 500g', qty: 1, total: '$2.800' },
    { name: 'Aceite 500ml', qty: 1, total: '$7.500' },
  ]
  return (
    <Row style={{ height: '100%', gap: 6, padding: 7, background: C.surfaceSoft }}>
      {/* Productos */}
      <Col style={{ flex: 1, gap: 5 }}>
        {/* Buscador */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '3px 6px', fontSize: 5.5, color: C.ink2 }}>🔍 Buscar producto...</div>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {productos.map((p, i) => (
            <div key={i} style={{ background: p.color, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 5px' }}>
              <div style={{ width: 20, height: 14, borderRadius: 3, background: C.accent + '20', marginBottom: 3 }} />
              <div style={{ fontSize: 4.5, fontWeight: 600, color: C.ink, lineHeight: 1.2, marginBottom: 1 }}>{p.name}</div>
              <div style={{ fontSize: 5, fontWeight: 700, color: C.accent }}>{p.price}</div>
            </div>
          ))}
        </div>
      </Col>
      {/* Carrito */}
      <Col style={{ width: 110, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, gap: 4 }}>
        <div style={{ fontSize: 6.5, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.border}`, paddingBottom: 3 }}>Carrito</div>
        <Col style={{ gap: 3, flex: 1 }}>
          {cartItems.map((item, i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <Col style={{ flex: 1 }}>
                <div style={{ fontSize: 4.5, color: C.ink, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 4, color: C.ink2 }}>x{item.qty}</div>
              </Col>
              <div style={{ fontSize: 5, fontWeight: 600, color: C.ink }}>{item.total}</div>
            </Row>
          ))}
        </Col>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 6, fontWeight: 700, color: C.ink }}>Total</span>
            <span style={{ fontSize: 7, fontWeight: 700, color: C.accent }}>$16.700</span>
          </Row>
          <div style={{ background: C.accent, color: '#fff', borderRadius: 5, textAlign: 'center', padding: '4px 0', fontSize: 6, fontWeight: 700 }}>Cobrar</div>
        </div>
      </Col>
    </Row>
  )
}

// ── Screen 2: Dashboard ───────────────────────────────────────────────────────
function ScreenDashboard() {
  const kpis = [
    { label: 'Ventas hoy', value: '24' },
    { label: 'Ingresos hoy', value: '$487k' },
    { label: 'Ventas mes', value: '312' },
    { label: 'Ingresos mes', value: '$6.2M' },
  ]
  const facturas = [
    { num: 'FE-0421', cliente: 'Carlos M.', total: '$45.000', estado: 'enviada' },
    { num: 'FE-0420', cliente: 'Ana López', total: '$18.500', estado: 'aceptada' },
    { num: 'FE-0419', cliente: 'C. Final', total: '$7.200', estado: 'pendiente' },
  ]
  return (
    <Col style={{ height: '100%', padding: 7, background: C.surfaceSoft, gap: 6 }}>
      <HeaderMock title="Dashboard" btnLabel="+ Nueva venta" />
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 6px' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: C.accentSoft, marginBottom: 3 }} />
            <div style={{ fontSize: 4, color: C.ink2 }}>{k.label}</div>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>
      {/* 2 columnas */}
      <Row style={{ gap: 5, flex: 1 }}>
        {/* Últimas facturas */}
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ padding: '4px 6px', borderBottom: `1px solid ${C.border}`, fontSize: 5, fontWeight: 700, color: C.ink }}>Últimas facturas</div>
          {facturas.map((f, i) => (
            <Row key={i} style={{ padding: '3px 6px', justifyContent: 'space-between', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <Col>
                <div style={{ fontSize: 4.5, fontWeight: 600, color: C.ink }}>{f.num}</div>
                <div style={{ fontSize: 4, color: C.ink2 }}>{f.cliente}</div>
              </Col>
              <Col style={{ alignItems: 'flex-end', gap: 1 }}>
                <div style={{ fontSize: 5, fontWeight: 700, color: C.ink }}>{f.total}</div>
                <Tag label={f.estado} color={f.estado === 'enviada' ? C.success : f.estado === 'aceptada' ? C.accent : C.warning} />
              </Col>
            </Row>
          ))}
        </div>
        {/* Top productos */}
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ padding: '4px 6px', borderBottom: `1px solid ${C.border}`, fontSize: 5, fontWeight: 700, color: C.ink }}>Más vendidos</div>
          {['Leche Entera 1L', 'Arroz x 500g', 'Aceite 500ml'].map((p, i) => (
            <Row key={i} style={{ padding: '3px 6px', gap: 4, borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 4, color: C.border, fontWeight: 700, width: 6 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 4.5, color: C.ink }}>{p}</div>
              <div style={{ fontSize: 5, fontWeight: 700, color: C.accent }}>${(32 - i * 8)}k</div>
            </Row>
          ))}
        </div>
      </Row>
    </Col>
  )
}

// ── Screen 3: Facturación ─────────────────────────────────────────────────────
function ScreenFacturas() {
  const rows = [
    { num: 'FE-0421', cliente: 'Carlos Martínez', total: '$45.000', metodo: 'Efectivo', estado: 'enviada', fecha: '06/06/2026' },
    { num: 'FE-0420', cliente: 'Ana López', total: '$18.500', metodo: 'Tarjeta', estado: 'aceptada', fecha: '06/06/2026' },
    { num: 'FE-0419', cliente: 'Consumidor final', total: '$7.200', metodo: 'Efectivo', estado: 'pendiente', fecha: '05/06/2026' },
    { num: 'FE-0418', cliente: 'Tienda Luisa', total: '$132.000', metodo: 'Transferencia', estado: 'enviada', fecha: '05/06/2026' },
    { num: 'FE-0417', cliente: 'Pedro Gómez', total: '$22.400', metodo: 'Efectivo', estado: 'anulada', fecha: '04/06/2026' },
  ]
  const estadoColor = { enviada: C.success, aceptada: C.accent, pendiente: C.warning, anulada: C.ink2 }
  return (
    <Col style={{ height: '100%', padding: 7, background: C.surfaceSoft, gap: 5 }}>
      <HeaderMock title="Facturación DIAN" />
      {/* Filtros */}
      <Row style={{ gap: 4 }}>
        {['Todos los estados', '06/06/2026', '06/06/2026'].map((f, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 4.5, color: C.ink2 }}>{f}</div>
        ))}
      </Row>
      {/* Tabla */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden', flex: 1 }}>
        <Row style={{ background: C.surfaceSoft, borderBottom: `1px solid ${C.border}`, padding: '3px 6px', gap: 0 }}>
          {['Número', 'Cliente', 'Total', 'Método', 'Estado', 'Fecha'].map(h => (
            <div key={h} style={{ flex: 1, fontSize: 4, fontWeight: 700, color: C.ink2, textTransform: 'uppercase' }}>{h}</div>
          ))}
        </Row>
        {rows.map((r, i) => (
          <Row key={i} style={{ padding: '3px 6px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', gap: 0 }}>
            <div style={{ flex: 1, fontSize: 4.5, fontWeight: 600, color: C.ink, fontFamily: 'monospace' }}>{r.num}</div>
            <div style={{ flex: 1, fontSize: 4.5, color: C.ink }}>{r.cliente}</div>
            <div style={{ flex: 1, fontSize: 5, fontWeight: 700, color: C.accent }}>{r.total}</div>
            <div style={{ flex: 1, fontSize: 4, color: C.ink2 }}>{r.metodo}</div>
            <div style={{ flex: 1 }}><Tag label={r.estado} color={estadoColor[r.estado]} /></div>
            <div style={{ flex: 1, fontSize: 4, color: C.ink2 }}>{r.fecha}</div>
          </Row>
        ))}
      </div>
    </Col>
  )
}

// ── Screen 4: Inventario ──────────────────────────────────────────────────────
function ScreenInventario() {
  const items = [
    { name: 'Leche Entera 1L', stock: 48, precio: '$3.200', iva: '19%', alerta: false },
    { name: 'Arroz x 500g', stock: 112, precio: '$2.800', iva: '5%', alerta: false },
    { name: 'Aceite 500ml', stock: 4, precio: '$7.500', iva: '19%', alerta: true },
    { name: 'Azúcar 1kg', stock: 0, precio: '$4.100', iva: '0%', alerta: true },
    { name: 'Pan tajado', stock: 23, precio: '$5.900', iva: '0%', alerta: false },
  ]
  return (
    <Col style={{ height: '100%', padding: 7, background: C.surfaceSoft, gap: 5 }}>
      <HeaderMock title="Inventario" btnLabel="+ Nuevo producto" />
      {/* Alerta stock */}
      <Row style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 4, padding: '3px 6px', gap: 3 }}>
        <span style={{ fontSize: 5, color: '#c2410c' }}>⚠ 2 productos con stock bajo o agotado</span>
      </Row>
      {/* Tabla */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden', flex: 1 }}>
        <Row style={{ background: C.surfaceSoft, borderBottom: `1px solid ${C.border}`, padding: '3px 6px' }}>
          {['Producto', 'Stock', 'Precio', 'IVA', ''].map(h => (
            <div key={h} style={{ flex: 1, fontSize: 4, fontWeight: 700, color: C.ink2, textTransform: 'uppercase' }}>{h}</div>
          ))}
        </Row>
        {items.map((item, i) => (
          <Row key={i} style={{ padding: '3px 6px', borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ flex: 1, fontSize: 4.5, fontWeight: 600, color: C.ink }}>{item.name}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 5, fontWeight: 700, color: item.alerta ? C.danger : C.success }}>
                {item.stock}
              </span>
            </div>
            <div style={{ flex: 1, fontSize: 5, fontWeight: 600, color: C.accent }}>{item.precio}</div>
            <div style={{ flex: 1, fontSize: 4.5, color: C.ink2 }}>{item.iva}</div>
            <div style={{ flex: 1, display: 'flex', gap: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.accentSoft }} />
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.surfaceSoft, border: `1px solid ${C.border}` }} />
            </div>
          </Row>
        ))}
      </div>
    </Col>
  )
}

// ── Screen 5: Cierres de caja ─────────────────────────────────────────────────
function ScreenCierres() {
  const cierres = [
    { fecha: '06/06 10:45', cajero: 'Ana M.', caja: 'Caja 1', ventas: '$487.000', dif: '+$2.000', estado: 'aprobada' },
    { fecha: '05/06 18:30', cajero: 'Pedro G.', caja: 'Caja 1', ventas: '$312.500', dif: '$0', estado: 'aprobada' },
    { fecha: '04/06 19:00', cajero: 'Ana M.', caja: 'Caja 1', ventas: '$198.000', dif: '-$5.000', estado: 'cerrada' },
  ]
  const estadoColor = { aprobada: C.success, cerrada: C.warning }
  return (
    <Col style={{ height: '100%', padding: 7, background: C.surfaceSoft, gap: 5 }}>
      <HeaderMock title="Cierres de caja" />
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
        {[
          { label: 'Total ventas', value: '$997k', border: C.border },
          { label: 'Diferencia', value: '-$3k', border: '#fca5a5' },
          { label: 'Con faltante', value: '1', border: '#fca5a5' },
          { label: 'Con sobrante', value: '1', border: '#86efac' },
        ].map((c, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${c.border}`, borderRadius: 5, padding: '4px 5px' }}>
            <div style={{ fontSize: 3.5, color: C.ink2, marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.ink }}>{c.value}</div>
          </div>
        ))}
      </div>
      {/* Tabla */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, overflow: 'hidden', flex: 1 }}>
        <Row style={{ background: C.surfaceSoft, borderBottom: `1px solid ${C.border}`, padding: '3px 6px' }}>
          {['Fecha', 'Cajero', 'Caja', 'Ventas', 'Diferencia', 'Estado'].map(h => (
            <div key={h} style={{ flex: 1, fontSize: 4, fontWeight: 700, color: C.ink2, textTransform: 'uppercase' }}>{h}</div>
          ))}
        </Row>
        {cierres.map((r, i) => (
          <Row key={i} style={{ padding: '3px 6px', borderBottom: i < cierres.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ flex: 1, fontSize: 4.5, color: C.ink }}>{r.fecha}</div>
            <div style={{ flex: 1, fontSize: 4.5, color: C.ink }}>{r.cajero}</div>
            <div style={{ flex: 1, fontSize: 4, color: C.ink2 }}>{r.caja}</div>
            <div style={{ flex: 1, fontSize: 5, fontWeight: 700, color: C.ink }}>{r.ventas}</div>
            <div style={{ flex: 1, fontSize: 5, fontWeight: 700, color: r.dif.startsWith('+') ? C.success : r.dif === '$0' ? C.ink2 : C.danger }}>{r.dif}</div>
            <div style={{ flex: 1 }}><Tag label={r.estado} color={estadoColor[r.estado]} /></div>
          </Row>
        ))}
      </div>
    </Col>
  )
}

// ── Slides config ─────────────────────────────────────────────────────────────
const SLIDES = [
  { screen: <ScreenPOS />,         title: 'Punto de Venta',     desc: 'Escanea, cobra y actualiza inventario al instante.' },
  { screen: <ScreenDashboard />,   title: 'Dashboard en vivo',  desc: 'Visualiza ventas e ingresos del día y del mes en tiempo real.' },
  { screen: <ScreenFacturas />,    title: 'Facturación DIAN',   desc: 'Emite facturas electrónicas válidas legalmente sin complicaciones.' },
  { screen: <ScreenInventario />,  title: 'Inventario',         desc: 'Controla stock, precios e IVA de todos tus productos.' },
  { screen: <ScreenCierres />,     title: 'Cierres de caja',    desc: 'Cuadratura de efectivo y seguimiento de turnos por cajero.' },
]

// ── Login principal ───────────────────────────────────────────────────────────
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
                style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e8e8ea', borderRadius: '11px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s, box-shadow .2s', color: '#15151a' }}
                onFocus={e => { e.target.style.borderColor = '#bfe1fe'; e.target.style.boxShadow = '0 0 0 3px rgba(92,180,250,.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e8e8ea'; e.target.style.boxShadow = 'none' }} />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '7px', color: '#15151a' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '13px 44px 13px 16px', border: '1.5px solid #e8e8ea', borderRadius: '11px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s, box-shadow .2s', color: '#15151a' }}
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

        {/* ── DERECHA: carrusel de pantallas ── */}
        <div style={{ background: 'linear-gradient(145deg, #1a4da8 0%, #1c61c0 50%, #1e72d8 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px 56px' }}>

          {/* Círculos decorativos de fondo */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          {/* Slides */}
          {SLIDES.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', inset: '32px 28px 56px',
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
              transition: 'opacity .5s ease, transform .5s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: i === current ? 'auto' : 'none',
              gap: 16,
            }}>
              {/* Marco tipo browser */}
              <div style={{
                width: '100%', maxWidth: 460,
                borderRadius: 10,
                boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                {/* Barra superior del browser */}
                <div style={{ background: '#1e2433', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                      <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 10px', fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                    app.carolinapos.co
                  </div>
                </div>
                {/* Contenido de la pantalla */}
                <div style={{ height: 200, overflow: 'hidden', display: 'flex' }}>
                  <SidebarMock />
                  <div style={{ flex: 1, overflow: 'hidden' }}>{s.screen}</div>
                </div>
              </div>

              {/* Texto */}
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 5 }}>{s.title}</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', maxWidth: 320, lineHeight: 1.6, margin: '0 auto' }}>{s.desc}</p>
              </div>
            </div>
          ))}

          {/* Flechas */}
          {[[-1, '16px', 'auto'], [1, 'auto', '16px']].map(([dir, l, r]) => (
            <button key={dir} onClick={() => goTo(current + dir)} style={{
              position: 'absolute', top: '42%', transform: 'translateY(-50%)',
              left: l, right: r,
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 4, transition: 'background .2s',
            }}>
              {dir === -1 ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          ))}

          {/* Dots */}
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 5 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === current ? '24px' : '8px', height: '8px',
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
          .login-grid { grid-template-columns: 1fr !important; grid-template-rows: 260px 1fr; overflow-y: auto; }
          .login-grid > div:last-child { order: -1; min-height: unset !important; }
          .login-grid > div:first-child { overflow-y: auto; }
        }
      `}</style>
    </div>
  )
}

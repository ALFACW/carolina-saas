import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  CheckCircle2, Building2, CreditCard, Loader2, Printer, Zap,
  RefreshCw, Volume2, VolumeX, Download, ScanLine, Settings2,
} from 'lucide-react'
import { useTenant } from '../hooks/useTenant'
import { useLocalPrint } from '../hooks/useLocalPrint'
import { useSounds, TONOS_SCANNER } from '../hooks/useSounds'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { useAuth } from '../context/AuthContext'
import { COP } from '../lib/format'

const TABS = [
  { id: 'empresa',  label: 'Empresa',        icon: Building2  },
  { id: 'plan',     label: 'Plan',            icon: CreditCard },
  { id: 'hardware', label: 'Impresora',       icon: Printer    },
  { id: 'scanner',  label: 'Pistola lectora', icon: ScanLine   },
]

export default function Configuracion() {
  const { tenant: authTenant, updateTenant } = useAuth()
  const { tenant, usage, update } = useTenant()
  const qz     = useLocalPrint()
  const sounds = useSounds()

  const [tab,          setTab]          = useState('empresa')
  const [sonidoActivo, setSonidoActivo] = useState(() => sounds.isEnabled())
  const [volumen,      setVolumen]      = useState(() => sounds.getVolumen())
  const [tonoId,       setTonoId]       = useState(() => sounds.getTonoId())
  const [msg,          setMsg]          = useState('')

  const { register, handleSubmit } = useForm({ values: tenant })

  const updateMutation = useMutation({
    mutationFn: update,
    onSuccess: (data) => {
      setMsg('Datos actualizados correctamente')
      updateTenant({ ...authTenant, ...data })
      setTimeout(() => setMsg(''), 3000)
    },
  })

  const usoPct = (uso, max) => max === 999 ? 0 : Math.min(100, Math.round((uso / max) * 100))

  const [logo,      setLogo]      = useState(() => localStorage.getItem('carolina_logo') || null)
  const [logoError, setLogoError] = useState('')

  const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  const MAX_SIZE = 2 * 1024 * 1024

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError('')
    if (!MIME_VALIDOS.includes(file.type)) { setLogoError('Formato no válido. Usa JPG, PNG, WebP o SVG.'); return }
    if (file.size > MAX_SIZE)              { setLogoError('La imagen es demasiado grande. Máximo 2MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { localStorage.setItem('carolina_logo', ev.target.result); setLogo(ev.target.result) }
    reader.readAsDataURL(file)
  }

  const eliminarLogo = () => { localStorage.removeItem('carolina_logo'); setLogo(null); setLogoError('') }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-ink-2 mt-0.5">Ajusta los datos y preferencias de tu negocio</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-accent text-accent bg-accent-soft/40'
                  : 'border-transparent text-ink-2 hover:text-ink hover:bg-surface-soft'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ═══════════ TAB: EMPRESA ═══════════ */}
          {tab === 'empresa' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Columna izquierda: datos */}
              <div className="bg-surface-soft rounded-xl p-5 space-y-4">
                <p className="text-xs font-bold text-ink-2 uppercase tracking-widest">Datos de la empresa</p>
                {msg && (
                  <div className="flex items-center gap-2 bg-green-50 text-success px-4 py-3 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4" />{msg}
                  </div>
                )}
                <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-3">
                  <Input label="Nombre de la empresa" {...register('nombre')} />
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">NIT</label>
                    <input disabled value={tenant?.nit || ''} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Teléfono" {...register('telefono')} />
                    <Input label="Ciudad" {...register('ciudad')} />
                  </div>
                  <Input label="Dirección" {...register('direccion')} />
                  <Button type="submit" loading={updateMutation.isPending}>Guardar cambios</Button>
                </form>
              </div>

              {/* Columna derecha: logo */}
              <div className="bg-surface-soft rounded-xl p-5 space-y-4">
                <p className="text-xs font-bold text-ink-2 uppercase tracking-widest">Logo de la empresa</p>
                <p className="text-sm text-ink-2">Aparece en la parte superior de cada ticket impreso.</p>
                {logo ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-white border border-border rounded-xl p-4 flex items-center justify-center" style={{ minHeight: '120px' }}>
                      <img src={logo} alt="Logo empresa" className="max-h-24 max-w-full object-contain" />
                    </div>
                    <div className="flex gap-3 text-sm">
                      <label className="cursor-pointer flex-1 text-center py-2 border border-border rounded-lg text-ink-2 hover:bg-white transition-colors">
                        Cambiar logo
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogo} className="hidden" />
                      </label>
                      <button onClick={eliminarLogo} className="flex-1 py-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-sm">
                        Eliminar
                      </button>
                    </div>
                    <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Logo cargado correctamente</p>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 hover:border-accent hover:bg-white transition-colors" style={{ minHeight: '160px' }}>
                    <div className="text-3xl">🖼️</div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-ink-2">Haz clic para subir tu logo</p>
                      <p className="text-xs text-ink-2 mt-1">PNG, JPG, WebP o SVG — máx 2MB</p>
                      <p className="text-xs text-ink-2">Recomendado: fondo blanco o transparente</p>
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogo} className="hidden" />
                  </label>
                )}
                {logoError && <p className="text-xs text-danger">{logoError}</p>}
              </div>

            </div>
          )}

          {/* ═══════════ TAB: PLAN ═══════════ */}
          {tab === 'plan' && (
            <div className="space-y-4">
              {/* Fila superior: plan + precio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-soft rounded-xl p-5">
                  <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-3">Plan activo</p>
                  <span className="px-4 py-1.5 bg-accent-soft text-accent rounded-full text-sm font-bold capitalize">{tenant?.plan}</span>
                </div>
                {usage && (
                  <div className="bg-surface-soft rounded-xl p-5">
                    <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-3">Precio mensual</p>
                    <p className="text-2xl font-bold text-ink">{COP(usage.limites.precio_mensual)}</p>
                  </div>
                )}
              </div>

              {/* Barras de uso */}
              {usage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Usuarios',   uso: usage.uso.usuarios,   max: usage.limites.max_usuarios   },
                    { label: 'Ventas hoy', uso: usage.uso.ventas_hoy, max: usage.limites.max_ventas_dia },
                  ].map(({ label, uso, max }) => (
                    <div key={label} className="bg-surface-soft rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-ink">{label}</p>
                        <span className={`text-lg font-bold ${uso >= max * 0.8 ? 'text-orange-600' : 'text-ink'}`}>
                          {uso} <span className="text-sm font-normal text-ink-2">/ {max === 999 ? '∞' : max}</span>
                        </span>
                      </div>
                      {max !== 999 && (
                        <div className="w-full bg-border rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${usoPct(uso, max) >= 80 ? 'bg-orange-500' : 'bg-accent'}`}
                            style={{ width: `${usoPct(uso, max)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB: HARDWARE / IMPRESORA ═══════════ */}
          {tab === 'hardware' && (
            <div className="space-y-6">

              {/* Estado servidor */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {qz.estado === 'conectado'  && <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium"><Zap className="w-3 h-3" />Servidor activo</span>}
                  {qz.estado === 'error'       && <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-medium">Sin servidor</span>}
                  {qz.estado === 'desconectado'&& <span className="inline-flex items-center gap-1.5 text-xs bg-surface-soft text-ink-2 px-3 py-1.5 rounded-full font-medium">Sin servidor</span>}
                  {qz.estado === 'conectando'  && <span className="inline-flex items-center gap-1.5 text-xs bg-surface-soft text-ink-2 px-3 py-1.5 rounded-full font-medium"><Loader2 className="w-3 h-3 animate-spin" />Conectando...</span>}
                  <button onClick={qz.conectar} className="p-1.5 text-ink-2 hover:text-ink rounded transition-colors" title="Reconectar">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <a href="/guia-hardware" target="_blank" className="text-xs text-ink-2 hover:text-ink underline">Ver guía de instalación</a>
              </div>

              {/* Panel instalación cuando no hay servidor */}
              {(qz.estado === 'desconectado' || qz.estado === 'error') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Paso 1 */}
                  <div className="bg-surface-soft rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <p className="font-semibold text-ink text-sm">Instala Python (si no lo tienes)</p>
                    </div>
                    <p className="text-xs text-ink-2">Python es gratuito. Al instalarlo marca la opción <strong>"Add Python to PATH"</strong>.</p>
                    <a href="https://python.org/downloads" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-white border border-border text-ink text-xs px-4 py-2 rounded-lg hover:border-border-strong font-medium transition-colors">
                      <Download className="w-3.5 h-3.5" />Descargar Python gratis
                    </a>
                    <p className="text-xs text-ink-2">Si ya tienes Python instalado, salta al paso 2.</p>
                  </div>

                  {/* Paso 2 */}
                  <div className="bg-surface-soft rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                      <p className="font-semibold text-ink text-sm">Descarga el servidor de impresión</p>
                    </div>
                    <p className="text-xs text-ink-2">Descarga el ZIP, extráelo en una carpeta fija (ej. <code className="bg-white px-1 rounded">Documentos\CarolinaPOS\</code>) y haz doble clic en <strong>Iniciar.bat</strong>.</p>
                    <p className="text-xs text-ink-2">Si no tienes Python, abre el navegador automáticamente para descargarlo. Una vez instalado, haz doble clic en <strong>Iniciar.bat</strong> de nuevo — se configura todo solo.</p>
                    {qz.errorMsg && <p className="text-red-600 text-xs">{qz.errorMsg}</p>}
                    <div className="flex gap-2 flex-wrap">
                      <a href="/carolinapos-print.zip" download="carolinapos-print.zip"
                        className="inline-flex items-center gap-2 bg-accent text-white text-xs px-4 py-2 rounded-lg hover:bg-accent/90 font-medium">
                        <Download className="w-3.5 h-3.5" />Descargar carolinapos-print.zip
                      </a>
                      <button onClick={qz.conectar}
                        className="inline-flex items-center gap-2 bg-white border border-border text-ink-2 text-xs px-4 py-2 rounded-lg hover:bg-surface-soft font-medium">
                        <RefreshCw className="w-3.5 h-3.5" />Verificar
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {qz.estado === 'conectado' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* ── Impresora térmica ── */}
                  <div className="bg-surface-soft rounded-xl p-5 space-y-4">
                    <p className="text-xs font-bold text-ink-2 uppercase tracking-widest">Impresora Térmica</p>

                    {/* Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-ink-2">Impresora para tickets</label>
                      <div className="flex gap-2">
                        <select
                          value={qz.impTermica}
                          onChange={e => qz.guardarImpTermica(e.target.value)}
                          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          <option value="">— Seleccionar impresora —</option>
                          {qz.impresoras.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button onClick={qz.buscarImpresoras} title="Actualizar lista"
                          className="px-2.5 border border-border rounded-lg text-ink-2 hover:bg-white">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={async () => { try { await qz.imprimirPrueba() } catch(e) { alert(e.message) } }}
                          disabled={!qz.impTermica}
                          className="px-3 py-2 border border-border rounded-lg text-xs font-medium text-ink-2 hover:bg-white disabled:opacity-40">
                          Prueba
                        </button>
                      </div>
                    </div>

                    {/* Ancho papel */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-ink-2">Ancho del papel</label>
                      <div className="flex gap-2">
                        {[['58','58 mm (32 chars)'],['80','80 mm (48 chars)']].map(([v,l]) => (
                          <button key={v} onClick={() => qz.guardarAnchoPapel(v)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${qz.anchoPapel === v ? 'bg-accent text-white border-accent' : 'bg-white text-ink-2 border-border hover:border-border-strong'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Densidad */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-ink-2">
                        Densidad — {['Muy baja','Baja','Normal','Normal+','Media','Media+','Alta','Muy alta','Máxima'][qz.densidad]} ({qz.densidad}/8)
                      </label>
                      <input type="range" min="0" max="8" step="1" value={qz.densidad}
                        onChange={e => qz.guardarDensidad(e.target.value)} className="w-full" />
                      <div className="flex justify-between text-xs text-ink-2">
                        <span>Baja</span><span>Rec: 6</span><span>Máxima</span>
                      </div>
                    </div>

                    {/* Avance y corte */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-ink-2">Líneas de avance</label>
                        <input type="number" min="0" max="10" value={qz.avancePapel}
                          onChange={e => qz.guardarAvancePapel(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-ink-2">Modo de corte</label>
                        <select value={qz.modoCortePapel} onChange={e => qz.guardarModoCortePapel(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                          <option value="completo">Completo</option>
                          <option value="parcial">Parcial</option>
                          <option value="ninguno">Sin corte</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Gaveta de dinero ── */}
                  <div className="bg-surface-soft rounded-xl p-5 space-y-4">
                    <p className="text-xs font-bold text-ink-2 uppercase tracking-widest">Gaveta de Dinero</p>

                    {/* Pin */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-ink-2">Puerto del cable</label>
                      <div className="flex gap-2">
                        {[['0','Pin 2 (más común)'],['1','Pin 5']].map(([v,l]) => (
                          <button key={v} onClick={() => qz.guardarGavetaPin(v)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${qz.gavetaPin === v ? 'bg-accent text-white border-accent' : 'bg-white text-ink-2 border-border hover:border-border-strong'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-ink-2">Si el cajón no abre, cambia entre Pin 2 y Pin 5.</p>
                    </div>

                    {/* Auto abrir */}
                    <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-border">
                      <div>
                        <p className="text-sm text-ink font-medium">Abrir al cobrar</p>
                        <p className="text-xs text-ink-2">Se abre automáticamente al confirmar una venta</p>
                      </div>
                      <button onClick={() => qz.guardarGavetaAuto(!qz.gavetaAuto)}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${qz.gavetaAuto ? 'bg-accent' : 'bg-border'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${qz.gavetaAuto ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>

                    {/* Probar */}
                    <button onClick={() => qz.abrirGaveta()} disabled={!qz.impTermica}
                      className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-ink-2 hover:bg-white disabled:opacity-40 bg-transparent transition-colors">
                      Probar apertura del cajón
                    </button>

                    {/* A4 */}
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-2">Impresora A4</p>
                      <p className="text-xs text-ink-2">Usa el diálogo del navegador — sin configuración adicional. Al imprimir una factura puedes elegir cualquier impresora instalada en Windows.</p>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB: SCANNER ═══════════ */}
          {tab === 'scanner' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Columna izquierda: sensibilidad + prueba */}
              <div className="space-y-5">
                <div className="bg-surface-soft rounded-xl p-5 space-y-5">
                  <p className="text-xs font-bold text-ink-2 uppercase tracking-widest">Sensibilidad</p>
                  <div className="space-y-1.5">
                    <label className="text-xs text-ink-2">Velocidad máx entre teclas: <strong className="text-ink">{qz.scannerMs} ms</strong></label>
                    <input type="range" min="20" max="150" step="10" value={qz.scannerMs}
                      onChange={e => qz.guardarScannerMs(e.target.value)} className="w-full" />
                    <div className="flex justify-between text-xs text-ink-2"><span>Rápida (20ms)</span><span>Lenta (150ms)</span></div>
                    <p className="text-xs text-ink-2 mt-1">Sube si el scanner no detecta el código. Baja si el teclado activa el escaneo.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-ink-2">Longitud mínima del código: <strong className="text-ink">{qz.scannerMin} caracteres</strong></label>
                    <input type="range" min="2" max="15" step="1" value={qz.scannerMin}
                      onChange={e => qz.guardarScannerMin(e.target.value)} className="w-full" />
                    <div className="flex justify-between text-xs text-ink-2"><span>2</span><span>15</span></div>
                  </div>
                </div>

                <div className="bg-surface-soft rounded-xl p-5 space-y-3">
                  <p className="text-xs font-bold text-ink-2 uppercase tracking-widest">Campo de prueba</p>
                  <input
                    type="text"
                    placeholder="Escanea un código de barras aquí..."
                    onKeyDown={e => e.stopPropagation()}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <p className="text-xs text-ink-2">El scanner funciona como teclado USB — no requiere software adicional.</p>
                </div>
              </div>

              {/* Columna derecha: sonidos */}
              <div className="bg-surface-soft rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sonidoActivo ? <Volume2 className="w-4 h-4 text-ink-2" /> : <VolumeX className="w-4 h-4 text-ink-2" />}
                    <div>
                      <p className="text-sm text-ink font-medium">Sonidos del sistema</p>
                      <p className="text-xs text-ink-2">Beep al escanear · doble beep al cobrar · buzz en error</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { const nuevo = !sonidoActivo; sounds.setEnabled(nuevo); setSonidoActivo(nuevo); if (nuevo) sounds.scan() }}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${sonidoActivo ? 'bg-accent' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sonidoActivo ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {sonidoActivo && (
                  <div className="space-y-4 pt-3 border-t border-border">
                    <div className="space-y-2">
                      <label className="text-xs text-ink-2">Tono del scanner</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {TONOS_SCANNER.map(t => (
                          <button key={t.id}
                            onClick={() => { sounds.setTonoId(t.id); setTonoId(t.id); setTimeout(() => sounds.scan(), 50) }}
                            className={`py-2 px-1 rounded-lg text-xs font-medium border transition-colors text-center ${
                              tonoId === t.id ? 'bg-accent text-white border-accent' : 'bg-white text-ink-2 border-border hover:border-border-strong'
                            }`}>
                            <p>{t.label}</p>
                            <p className="text-xs mt-0.5 opacity-70">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-ink-2">Volumen: <strong className="text-ink">{volumen}%</strong></label>
                      <div className="flex items-center gap-3">
                        <VolumeX className="w-3.5 h-3.5 text-ink-2 flex-shrink-0" />
                        <input type="range" min="10" max="100" step="5" value={volumen}
                          onChange={e => { const v = parseInt(e.target.value); sounds.setVolumen(v); setVolumen(v) }}
                          onMouseUp={() => sounds.scan()} onTouchEnd={() => sounds.scan()}
                          className="flex-1" />
                        <Volume2 className="w-3.5 h-3.5 text-ink-2 flex-shrink-0" />
                        <button onClick={() => sounds.scan()}
                          className="text-xs text-ink-2 hover:text-ink border border-border px-2.5 py-1.5 rounded-lg">
                          Probar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!sonidoActivo && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-ink-2">Activa los sonidos para configurar el tono y el volumen.</p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

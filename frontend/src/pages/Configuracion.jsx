import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Building2, CreditCard, Loader2, Printer, Zap, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { useTenant } from '../hooks/useTenant'
import { useQZTray } from '../hooks/useQZTray'
import { useSounds, TONOS_SCANNER } from '../hooks/useSounds'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { useAuth } from '../context/AuthContext'
import { COP } from '../lib/format'

export default function Configuracion() {
  const { tenant: authTenant, updateTenant } = useAuth()
  const { tenant, usage, update } = useTenant()
  const qz     = useQZTray()
  const sounds = useSounds()
  const [sonidoActivo, setSonidoActivo] = useState(() => sounds.isEnabled())
  const [volumen,      setVolumen]      = useState(() => sounds.getVolumen())
  const [tonoId,       setTonoId]       = useState(() => sounds.getTonoId())
  const [msg, setMsg] = useState('')

  const { register, handleSubmit } = useForm({ values: tenant })

  const updateMutation = useMutation({
    mutationFn: update,
    onSuccess: (data) => {
      setMsg('Datos actualizados correctamente')
      // Sincronizar sidebar y header con los nuevos datos
      updateTenant({ ...authTenant, ...data })
    },
  })

  const usoPct = (uso, max) => max === 999 ? 0 : Math.min(100, Math.round((uso / max) * 100))

  const [logo, setLogo] = useState(() => localStorage.getItem('carolina_logo') || null)

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      localStorage.setItem('carolina_logo', base64)
      setLogo(base64)
    }
    reader.readAsDataURL(file)
  }

  const eliminarLogo = () => {
    localStorage.removeItem('carolina_logo')
    setLogo(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">Configuración</h1>
        <p className="text-ink-2">Ajusta la configuración de tu negocio</p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-green-50 text-success px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4" />{msg}
        </div>
      )}

      {/* Datos empresa */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <Building2 className="w-5 h-5 text-ink-2" />
          <h2 className="font-semibold text-ink">Datos de la empresa</h2>
        </div>
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nombre de la empresa" {...register('nombre')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">NIT</label>
              <input disabled value={tenant?.nit || ''} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface-soft text-ink-2" />
            </div>
            <Input label="Teléfono" {...register('telefono')} />
            <Input label="Dirección" {...register('direccion')} />
            <Input label="Ciudad" {...register('ciudad')} />
          </div>
          <Button type="submit" loading={updateMutation.isPending}>Guardar cambios</Button>
        </form>

        {/* Logo de la empresa */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">Logo (aparece en el ticket impreso)</p>
          <div className="flex items-center gap-4">
            {logo ? (
              <>
                <img src={logo} alt="Logo empresa" className="h-16 w-auto object-contain border border-border rounded-lg p-1 bg-white" />
                <div className="space-y-2">
                  <p className="text-xs text-success font-medium">Logo cargado correctamente</p>
                  <div className="flex gap-2">
                    <label className="cursor-pointer text-xs text-accent hover:underline">
                      Cambiar logo
                      <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                    </label>
                    <span className="text-ink-2">·</span>
                    <button onClick={eliminarLogo} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </div>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-lg px-8 py-5 hover:border-border-strong transition-colors">
                <div className="text-2xl">🖼️</div>
                <p className="text-sm text-ink-2">Subir logo de la empresa</p>
                <p className="text-xs text-ink-2">PNG, JPG o SVG — recomendado fondo blanco</p>
                <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Plan y uso */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-ink-2" />
            <h2 className="font-semibold text-ink">Plan actual</h2>
          </div>
          <span className="px-3 py-1 bg-accent-soft text-accent rounded-full text-sm font-semibold capitalize">{tenant?.plan}</span>
        </div>
        {usage && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-soft rounded-lg text-sm text-ink-2">
              Precio: <strong>{COP(usage.limites.precio_mensual)}/mes</strong>
            </div>
            {[
              { label: 'Usuarios', uso: usage.uso.usuarios, max: usage.limites.max_usuarios },
              { label: 'Ventas hoy', uso: usage.uso.ventas_hoy, max: usage.limites.max_ventas_dia },
            ].map(({ label, uso, max }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-2">{label}</span>
                  <span className={`font-medium ${uso >= max * 0.8 ? 'text-orange-600' : 'text-ink'}`}>
                    {uso} / {max === 999 ? '∞' : max}
                  </span>
                </div>
                {max !== 999 && (
                  <div className="w-full bg-surface-soft rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${usoPct(uso, max) >= 80 ? 'bg-orange-500' : 'bg-accent'}`}
                      style={{ width: `${usoPct(uso, max)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Hardware de caja ── */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        {/* Encabezado con estado QZ Tray */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-ink-2" />
            <h2 className="font-semibold text-ink">Hardware de caja</h2>
          </div>
          <div className="flex items-center gap-2">
            <a href="/guia-hardware" target="_blank" className="text-xs text-ink-2 hover:text-ink underline">Ver guia de instalacion</a>
            {qz.estado === 'conectado'  && <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Zap className="w-3 h-3" />QZ Tray activo</span>}
            {qz.estado === 'error'      && <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">Sin conexión</span>}
            {qz.estado === 'conectando' && <span className="text-xs bg-surface-soft text-ink-2 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Buscando...</span>}
            <button onClick={qz.conectar} className="p-1.5 text-ink-2 hover:text-ink rounded transition-colors" title="Reconectar"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {qz.estado === 'error' && (
          <div className="bg-surface-soft rounded-lg p-4 text-sm text-ink-2 space-y-2">
            <p className="font-medium text-ink">QZ Tray no está corriendo</p>
            <p className="text-ink-2">Necesario para impresión directa y apertura del cajón.</p>
            <a href="https://qz.io/download/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-white text-xs px-4 py-2 rounded-md hover:bg-accent/80 font-medium">
              <Printer className="w-3.5 h-3.5" />Descargar QZ Tray (gratis)
            </a>
          </div>
        )}

        {qz.estado === 'conectado' && (<>

          {/* ── SECCIÓN: Impresora Térmica ── */}
          <div className="border-t pt-4">
            <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-3">Impresora Térmica (tickets)</p>
            <div className="space-y-3">

              {/* Selección impresora */}
              <div>
                <label className="text-xs text-ink-2 block mb-1">Impresora</label>
                <div className="flex gap-2">
                  <select value={qz.impTermica} onChange={e => qz.guardarImpTermica(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                    <option value="">— Seleccionar —</option>
                    {qz.impresoras.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={async () => { try { await qz.imprimirPrueba() } catch(e) { alert(e.message) } }}
                    disabled={!qz.impTermica}
                    className="px-3 py-2 border border-border rounded-md text-xs font-medium text-ink-2 hover:bg-surface-soft disabled:opacity-40">
                    Imprimir prueba
                  </button>
                </div>
              </div>

              {/* Ancho papel */}
              <div>
                <label className="text-xs text-ink-2 block mb-1">Ancho del papel</label>
                <div className="flex gap-2">
                  {[['58','58 mm (32 chars)'],['80','80 mm (48 chars)']].map(([v,l]) => (
                    <button key={v} onClick={() => qz.guardarAnchoPapel(v)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${qz.anchoPapel === v ? 'bg-accent text-white border-accent' : 'bg-white text-ink-2 border-border hover:border-border-strong'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Densidad */}
              <div>
                <label className="text-xs text-ink-2 block mb-1">
                  Densidad de impresión — {['Muy baja','Baja','Normal','Normal+','Media','Media+','Alta','Muy alta','Maxima'][qz.densidad]} ({qz.densidad}/8)
                </label>
                <input type="range" min="0" max="8" step="1" value={qz.densidad}
                  onChange={e => qz.guardarDensidad(e.target.value)} className="w-full" />
                <div className="flex justify-between text-xs text-ink-2 mt-0.5">
                  <span>Baja</span><span>Recomendado: 6</span><span>Maxima</span>
                </div>
              </div>

              {/* Avance y corte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Líneas de avance antes del corte</label>
                  <input type="number" min="0" max="10" value={qz.avancePapel}
                    onChange={e => qz.guardarAvancePapel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Modo de corte</label>
                  <select value={qz.modoCortePapel} onChange={e => qz.guardarModoCortePapel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                    <option value="completo">Corte completo</option>
                    <option value="parcial">Corte parcial</option>
                    <option value="ninguno">Sin corte</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN: Gaveta de dinero ── */}
          <div className="border-t pt-4">
            <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-3">Gaveta de Dinero</p>
            <div className="space-y-3">

              {/* Pin */}
              <div>
                <label className="text-xs text-ink-2 block mb-1">Puerto del cable (si el cajón no abre, cambiar)</label>
                <div className="flex gap-2">
                  {[['0','Pin 2 (más común)'],['1','Pin 5']].map(([v,l]) => (
                    <button key={v} onClick={() => qz.guardarGavetaPin(v)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${qz.gavetaPin === v ? 'bg-accent text-white border-accent' : 'bg-white text-ink-2 border-border hover:border-border-strong'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto abrir */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink font-medium">Abrir automáticamente al cobrar</p>
                  <p className="text-xs text-ink-2">El cajón se abre solo cuando se confirma una venta</p>
                </div>
                <button onClick={() => qz.guardarGavetaAuto(!qz.gavetaAuto)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${qz.gavetaAuto ? 'bg-accent' : 'bg-border'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${qz.gavetaAuto ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Botón probar */}
              <button onClick={() => qz.abrirGaveta()} disabled={!qz.impTermica}
                className="w-full py-2 border border-border rounded-md text-sm font-medium text-ink-2 hover:bg-surface-soft disabled:opacity-40">
                Probar apertura del cajón
              </button>
            </div>
          </div>

          {/* ── SECCIÓN: Impresora A4 ── */}
          <div className="border-t pt-4">
            <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-3">Impresora Facturas A4</p>
            <select value={qz.impA4} onChange={e => qz.guardarImpA4(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="">— Seleccionar impresora —</option>
              {qz.impresoras.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

        </>)}

        {/* ── SECCIÓN: Scanner ── (no requiere QZ Tray) */}
        <div className="border-t pt-4">
          <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-3">Pistola Lectora de Códigos</p>
          <div className="space-y-3">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-2 block mb-1">
                  Velocidad máxima entre teclas: {qz.scannerMs}ms
                </label>
                <input type="range" min="20" max="150" step="10" value={qz.scannerMs}
                  onChange={e => qz.guardarScannerMs(e.target.value)} className="w-full" />
                <div className="flex justify-between text-xs text-ink-2 mt-0.5">
                  <span>Rápida</span><span>Lenta</span>
                </div>
                <p className="text-xs text-ink-2 mt-1">Sube si el scanner no detecta. Baja si el teclado activa escaneo.</p>
              </div>
              <div>
                <label className="text-xs text-ink-2 block mb-1">Largo mínimo del código: {qz.scannerMin} chars</label>
                <input type="range" min="2" max="15" step="1" value={qz.scannerMin}
                  onChange={e => qz.guardarScannerMin(e.target.value)} className="w-full" />
                <div className="flex justify-between text-xs text-ink-2 mt-0.5">
                  <span>2</span><span>15</span>
                </div>
              </div>
            </div>

            {/* Sonidos */}
            <div className="space-y-3 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sonidoActivo ? <Volume2 className="w-4 h-4 text-ink-2" /> : <VolumeX className="w-4 h-4 text-ink-2" />}
                  <div>
                    <p className="text-sm text-ink font-medium">Sonidos del sistema</p>
                    <p className="text-xs text-ink-2">Beep al escanear · doble beep al cobrar · buzz en error</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const nuevo = !sonidoActivo
                    sounds.setEnabled(nuevo)
                    setSonidoActivo(nuevo)
                    if (nuevo) sounds.scan()
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${sonidoActivo ? 'bg-accent' : 'bg-border'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sonidoActivo ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Tono del scanner */}
              {sonidoActivo && (
                <div className="space-y-3">
                  {/* Selector de tono */}
                  <div>
                    <label className="text-xs text-ink-2 block mb-1.5">Tono del scanner</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {TONOS_SCANNER.map(t => (
                        <button key={t.id}
                          onClick={() => {
                            sounds.setTonoId(t.id)
                            setTonoId(t.id)
                            setTimeout(() => sounds.scan(), 50)
                          }}
                          className={`py-2 px-1 rounded-md text-xs font-medium border transition-colors text-center ${
                            tonoId === t.id ? 'bg-accent text-white border-accent' : 'bg-white text-ink-2 border-border hover:border-border-strong'
                          }`}
                        >
                          <p>{t.label}</p>
                          <p className={`text-xs mt-0.5 ${tonoId === t.id ? 'text-ink-2' : 'text-ink-2'}`}>{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Volumen */}
                  <div>
                    <label className="text-xs text-ink-2 block mb-1">Volumen: {volumen}%</label>
                    <div className="flex items-center gap-3">
                      <VolumeX className="w-3.5 h-3.5 text-ink-2 flex-shrink-0" />
                      <input type="range" min="10" max="100" step="5" value={volumen}
                        onChange={e => { const v = parseInt(e.target.value); sounds.setVolumen(v); setVolumen(v) }}
                        onMouseUp={() => sounds.scan()}
                        onTouchEnd={() => sounds.scan()}
                        className="flex-1" />
                      <Volume2 className="w-3.5 h-3.5 text-ink-2 flex-shrink-0" />
                      <button onClick={() => sounds.scan()}
                        className="text-xs text-ink-2 hover:text-ink border border-border px-2 py-1 rounded-md">
                        Probar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Campo de prueba scanner */}
            <div>
              <label className="text-xs text-ink-2 block mb-1">
                Campo de prueba — escanea aquí para verificar (no conectado a QZ Tray)
              </label>
              <input
                type="text"
                placeholder="Escanea un código de barras aquí..."
                onKeyDown={e => e.stopPropagation()}
                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-soft font-mono"
              />
              <p className="text-xs text-ink-2 mt-1">
                El scanner funciona como teclado USB — no necesita QZ Tray ni drivers adicionales
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

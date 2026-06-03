import { useState, useEffect, useCallback, useRef } from 'react'

// ── Claves de localStorage ─────────────────────────────
const K = {
  impTermica:    'carolina_printer_termica',
  impA4:         'carolina_printer_a4',
  densidad:      'carolina_printer_densidad',
  anchoPapel:    'carolina_printer_ancho',      // '58' | '80'
  avancePapel:   'carolina_printer_avance',     // líneas antes del corte (1-5)
  modoCortePapel:'carolina_printer_corte',      // 'completo' | 'parcial' | 'ninguno'
  gaveta_pin:    'carolina_gaveta_pin',          // '0' pin2 | '1' pin5
  gaveta_auto:   'carolina_gaveta_auto',         // 'true' | 'false'
  scanner_ms:    'carolina_scanner_ms',          // ms máx entre teclas (20-150)
  scanner_min:   'carolina_scanner_min',         // largo mínimo código (3-15)
}

const get  = (key, def) => localStorage.getItem(key) ?? def
const save = (key, val) => localStorage.setItem(key, String(val))

let qzInstance = null
let qzLoaded   = false

async function getQZ() {
  if (qzLoaded && qzInstance) return qzInstance
  try {
    const mod  = await import('qz-tray')
    qzInstance = mod.default || mod
    qzLoaded   = true
    qzInstance.security.setCertificatePromise(async () => '')
    qzInstance.security.setSignatureAlgorithm('SHA512')
    qzInstance.security.setSignaturePromise(async () => '')
    return qzInstance
  } catch (err) {
    console.error('Error cargando qz-tray:', err)
    return null
  }
}

export function useQZTray() {
  const [estado,     setEstado]     = useState('desconectado')
  const [impresoras, setImpresoras] = useState([])
  const [errorMsg,   setErrorMsg]   = useState('')
  const intentando = useRef(false)

  // ── Estado de configuraciones ──────────────────────────
  const [impTermica,    setImpTermica]    = useState(() => get(K.impTermica, ''))
  const [impA4,         setImpA4]         = useState(() => get(K.impA4, ''))
  const [densidad,      setDensidad]      = useState(() => parseInt(get(K.densidad, '6')))
  const [anchoPapel,    setAnchoPapel]    = useState(() => get(K.anchoPapel, '80'))
  const [avancePapel,   setAvancePapel]   = useState(() => parseInt(get(K.avancePapel, '3')))
  const [modoCortePapel,setModoCortePapel]= useState(() => get(K.modoCortePapel, 'completo'))
  const [gavetaPin,     setGavetaPin]     = useState(() => get(K.gaveta_pin, '0'))
  const [gavetaAuto,    setGavetaAuto]    = useState(() => get(K.gaveta_auto, 'true') === 'true')
  const [scannerMs,     setScannerMs]     = useState(() => parseInt(get(K.scanner_ms, '80')))
  const [scannerMin,    setScannerMin]    = useState(() => parseInt(get(K.scanner_min, '3')))

  // ── Helpers para guardar y actualizar estado ───────────
  const cfg = useCallback((setter, key) => (val) => {
    save(key, val)
    setter(typeof val === 'boolean' ? val : val)
  }, [])

  const guardarImpTermica    = useCallback((v) => { save(K.impTermica, v);     setImpTermica(v) }, [])
  const guardarImpA4         = useCallback((v) => { save(K.impA4, v);          setImpA4(v) }, [])
  const guardarDensidad      = useCallback((v) => { save(K.densidad, v);       setDensidad(Number(v)) }, [])
  const guardarAnchoPapel    = useCallback((v) => { save(K.anchoPapel, v);     setAnchoPapel(v) }, [])
  const guardarAvancePapel   = useCallback((v) => { save(K.avancePapel, v);    setAvancePapel(Number(v)) }, [])
  const guardarModoCortePapel= useCallback((v) => { save(K.modoCortePapel, v); setModoCortePapel(v) }, [])
  const guardarGavetaPin     = useCallback((v) => { save(K.gaveta_pin, v);     setGavetaPin(v) }, [])
  const guardarGavetaAuto    = useCallback((v) => { save(K.gaveta_auto, v);    setGavetaAuto(v === true || v === 'true') }, [])
  const guardarScannerMs     = useCallback((v) => { save(K.scanner_ms, v);     setScannerMs(Number(v)) }, [])
  const guardarScannerMin    = useCallback((v) => { save(K.scanner_min, v);    setScannerMin(Number(v)) }, [])

  // Ancho en caracteres según papel seleccionado
  const anchoCars = anchoPapel === '58' ? 32 : 48

  // ── Conexión ───────────────────────────────────────────
  const conectar = useCallback(async () => {
    if (intentando.current) return
    intentando.current = true
    setEstado('conectando')
    setErrorMsg('')
    const qz = await getQZ()
    if (!qz) {
      setEstado('error')
      setErrorMsg('No se pudo cargar QZ Tray')
      intentando.current = false
      return
    }
    try {
      if (qz.websocket.isActive()) {
        const lista = await qz.printers.find()
        setImpresoras(Array.isArray(lista) ? lista : (lista ? [lista] : []))
        setEstado('conectado')
        intentando.current = false
        return
      }
      await qz.websocket.connect({
        host: 'localhost',
        port: { secure: [8183], insecure: [8182] },
        usingSecure: false,
        retries: 3,
        delay: 1,
      })
      const lista = await qz.printers.find()
      setImpresoras(Array.isArray(lista) ? lista : (lista ? [lista] : []))
      setEstado('conectado')
    } catch (err) {
      setEstado('error')
      setErrorMsg(err?.message?.includes('Unable') || err?.message?.includes('disconnect')
        ? 'QZ Tray no acepta conexiones. Verifica que "Allow unsigned requests" esté activo.'
        : 'QZ Tray no está corriendo.')
    } finally {
      intentando.current = false
    }
  }, [])

  useEffect(() => { conectar() }, [])

  // ── Imprimir ticket ESC/POS (con logo si existe) ───────
  const imprimirTicket = useCallback(async (datosEscPos) => {
    const qz = await getQZ()
    if (!qz?.websocket.isActive()) throw new Error('QZ Tray desconectado')
    if (!impTermica) throw new Error('Selecciona una impresora térmica en Configuración')
    const config = qz.configs.create(impTermica)

    const logoSrc = localStorage.getItem('carolina_logo')
    if (logoSrc) {
      try {
        const { logoAEscPos } = await import('../lib/logoEscPos')
        const logoB64 = await logoAEscPos(logoSrc, anchoCars)
        if (logoB64) {
          // Centro + logo bitmap + izquierda + ticket texto
          const center = btoa('\x1B\x61\x01')
          const left   = btoa('\x1B\x61\x00')
          await qz.print(config, [
            { type: 'raw', format: 'base64', data: center },
            { type: 'raw', format: 'base64', data: logoB64 },
            { type: 'raw', format: 'base64', data: left },
            ...datosEscPos,
          ])
          return
        }
      } catch (e) {
        console.warn('Logo no pudo convertirse, imprimiendo sin logo:', e.message)
      }
    }

    await qz.print(config, datosEscPos)
  }, [impTermica, anchoCars])

  // ── Abrir gaveta ───────────────────────────────────────
  const abrirGaveta = useCallback(async () => {
    const qz = await getQZ()
    if (!qz?.websocket.isActive() || !impTermica) return false
    const pin = gavetaPin === '1' ? '\x01' : '\x00'
    const config = qz.configs.create(impTermica)
    await qz.print(config, [{
      type: 'raw', format: 'plain',
      data: `\x1B\x70${pin}\x19\x19`,  // ESC p [pin] [on-time] [off-time]
    }])
    return true
  }, [impTermica, gavetaPin])

  // ── Imprimir ticket de prueba ──────────────────────────
  const imprimirPrueba = useCallback(async () => {
    const qz = await getQZ()
    if (!qz?.websocket.isActive() || !impTermica) throw new Error('Sin impresora configurada')
    const W   = anchoCars
    const ESC = '\x1B', GS = '\x1D', LF = '\x0A'
    let t = ESC + '@'
    t += GS + '\x7C' + String.fromCharCode(densidad)
    t += ESC + '\x61\x01' + ESC + '\x45\x01'
    t += 'TICKET DE PRUEBA' + LF
    t += ESC + '\x45\x00' + ESC + '\x61\x00'
    t += '-'.repeat(W) + LF
    t += 'Empresa: Mi Empresa S.A.S.' + LF
    t += 'Papel  : ' + anchoPapel + 'mm (' + W + ' chars)' + LF
    t += 'Densidad: ' + densidad + '/8' + LF
    t += 'Gaveta : Pin ' + (gavetaPin === '1' ? '5' : '2') + LF
    t += '-'.repeat(W) + LF
    t += '1 x Producto de prueba' + LF
    const total = '$50.000'
    const sp    = W - 6 - total.length
    t += 'TOTAL:' + ' '.repeat(sp) + total + LF
    t += '-'.repeat(W) + LF
    t += ESC + '\x61\x01' + 'Carolina Facturacion' + LF
    t += ESC + '\x64' + String.fromCharCode(avancePapel)
    if (modoCortePapel === 'completo')  t += GS + '\x56\x00'
    if (modoCortePapel === 'parcial')   t += GS + '\x56\x01'
    if (gavetaAuto) t += ESC + '\x70' + (gavetaPin === '1' ? '\x01' : '\x00') + '\x19\x19'
    const config = qz.configs.create(impTermica)
    await qz.print(config, [{ type: 'raw', format: 'plain', data: t }])
  }, [impTermica, densidad, anchoPapel, anchoCars, avancePapel, modoCortePapel, gavetaPin, gavetaAuto])

  // ── Imprimir A4 ────────────────────────────────────────
  const imprimirA4 = useCallback(async (htmlContent) => {
    const qz = await getQZ()
    if (!qz?.websocket.isActive()) throw new Error('QZ Tray desconectado')
    if (!impA4) throw new Error('Selecciona una impresora A4 en Configuración')
    const config = qz.configs.create(impA4)
    await qz.print(config, [{ type: 'html', format: 'plain', data: htmlContent }])
  }, [impA4])

  return {
    // Estado conexión
    estado, conectado: estado === 'conectado', impresoras, errorMsg, conectar,
    // Impresora térmica
    impTermica, guardarImpTermica,
    densidad, guardarDensidad,
    anchoPapel, guardarAnchoPapel, anchoCars,
    avancePapel, guardarAvancePapel,
    modoCortePapel, guardarModoCortePapel,
    // Gaveta
    gavetaPin, guardarGavetaPin,
    gavetaAuto, guardarGavetaAuto,
    // Impresora A4
    impA4, guardarImpA4,
    // Scanner
    scannerMs, guardarScannerMs,
    scannerMin, guardarScannerMin,
    // Acciones
    imprimirTicket, abrirGaveta, imprimirPrueba, imprimirA4,
  }
}

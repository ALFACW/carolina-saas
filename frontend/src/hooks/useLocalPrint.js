import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const K = {
  impTermica:    'carolina_printer_termica',
  impA4:         'carolina_printer_a4',
  densidad:      'carolina_printer_densidad',
  anchoPapel:    'carolina_printer_ancho',
  avancePapel:   'carolina_printer_avance',
  modoCortePapel:'carolina_printer_corte',
  gaveta_pin:    'carolina_gaveta_pin',
  gaveta_auto:   'carolina_gaveta_auto',
  scanner_ms:    'carolina_scanner_ms',
  scanner_min:   'carolina_scanner_min',
}

const get  = (key, def) => localStorage.getItem(key) ?? def
const save = (key, val) => localStorage.setItem(key, String(val))

function escPosABytes(datosEscPos) {
  const partes = []
  for (const item of datosEscPos) {
    if (item.format === 'base64') {
      const bin = atob(item.data)
      for (let i = 0; i < bin.length; i++) partes.push(bin.charCodeAt(i) & 0xFF)
    } else {
      const s = item.data || ''
      for (let i = 0; i < s.length; i++) partes.push(s.charCodeAt(i) & 0xFF)
    }
  }
  return partes
}

function strABytes(s) {
  return Array.from(s).map(c => c.charCodeAt(0) & 0xFF)
}

export function useLocalPrint() {
  const [estado,     setEstado]     = useState('desconectado')
  const [impresoras, setImpresoras] = useState([])
  const [errorMsg,   setErrorMsg]   = useState('')

  const [impTermica,     setImpTermica]     = useState(() => get(K.impTermica, ''))
  const [impA4,          setImpA4]          = useState(() => get(K.impA4, ''))
  const [densidad,       setDensidad]       = useState(() => parseInt(get(K.densidad, '6')))
  const [anchoPapel,     setAnchoPapel]     = useState(() => get(K.anchoPapel, '80'))
  const [avancePapel,    setAvancePapel]    = useState(() => parseInt(get(K.avancePapel, '3')))
  const [modoCortePapel, setModoCortePapel] = useState(() => get(K.modoCortePapel, 'completo'))
  const [gavetaPin,      setGavetaPin]      = useState(() => get(K.gaveta_pin, '0'))
  const [gavetaAuto,     setGavetaAuto]     = useState(() => get(K.gaveta_auto, 'true') === 'true')
  const [scannerMs,      setScannerMs]      = useState(() => parseInt(get(K.scanner_ms, '80')))
  const [scannerMin,     setScannerMin]     = useState(() => parseInt(get(K.scanner_min, '3')))

  const anchoCars = anchoPapel === '58' ? 32 : 48

  const guardarImpTermica     = useCallback((v) => { save(K.impTermica, v);     setImpTermica(v) }, [])
  const guardarImpA4          = useCallback((v) => { save(K.impA4, v);          setImpA4(v) }, [])
  const guardarDensidad       = useCallback((v) => { save(K.densidad, v);       setDensidad(Number(v)) }, [])
  const guardarAnchoPapel     = useCallback((v) => { save(K.anchoPapel, v);     setAnchoPapel(v) }, [])
  const guardarAvancePapel    = useCallback((v) => { save(K.avancePapel, v);    setAvancePapel(Number(v)) }, [])
  const guardarModoCortePapel = useCallback((v) => { save(K.modoCortePapel, v); setModoCortePapel(v) }, [])
  const guardarGavetaPin      = useCallback((v) => { save(K.gaveta_pin, v);     setGavetaPin(v) }, [])
  const guardarGavetaAuto     = useCallback((v) => { save(K.gaveta_auto, v);    setGavetaAuto(v === true || v === 'true') }, [])
  const guardarScannerMs      = useCallback((v) => { save(K.scanner_ms, v);     setScannerMs(Number(v)) }, [])
  const guardarScannerMin     = useCallback((v) => { save(K.scanner_min, v);    setScannerMin(Number(v)) }, [])

  const conectar = useCallback(async () => {
    setEstado('conectando')
    setErrorMsg('')
    try {
      const { data } = await api.get('/api/print/status')
      if (data.online) {
        setEstado('conectado')
        setImpresoras(data.printers || [])
      } else {
        setEstado('error')
        setErrorMsg('Servidor no está corriendo. Abre Iniciar.bat en tu PC.')
      }
    } catch {
      setEstado('error')
      setErrorMsg('No se pudo verificar el servidor de impresión.')
    }
  }, [])

  const buscarImpresoras = useCallback(async () => {
    try {
      const { data } = await api.get('/api/print/status')
      setImpresoras(data.printers || [])
    } catch {}
  }, [])

  useEffect(() => {
    conectar()
    const interval = setInterval(conectar, 10000)
    return () => clearInterval(interval)
  }, [])

  const imprimirTicket = useCallback(async (datosEscPos) => {
    if (estado !== 'conectado') throw new Error('Servidor de impresión no disponible')
    if (!impTermica) throw new Error('Selecciona una impresora en Configuración')

    let bytes = escPosABytes(datosEscPos)

    const logoSrc = localStorage.getItem('carolina_logo')
    if (logoSrc) {
      try {
        const { logoAEscPos } = await import('../lib/logoEscPos')
        const logoB64 = await logoAEscPos(logoSrc, anchoCars)
        if (logoB64) {
          const center = strABytes('\x1B\x61\x01')
          const left   = strABytes('\x1B\x61\x00')
          const logo   = escPosABytes([{ format: 'base64', data: logoB64 }])
          bytes = [...center, ...logo, ...left, ...bytes]
        }
      } catch (e) {
        console.warn('Logo error:', e.message)
      }
    }

    await api.post('/api/print/job', { bytes, impresora: impTermica })
  }, [estado, impTermica, anchoCars])

  const abrirGaveta = useCallback(async () => {
    if (estado !== 'conectado' || !impTermica) return false
    const pin = gavetaPin === '1' ? '\x01' : '\x00'
    const bytes = strABytes(`\x1B\x70${pin}\x19\x19`)
    await api.post('/api/print/job', { bytes, impresora: impTermica })
    return true
  }, [estado, impTermica, gavetaPin])

  const imprimirPrueba = useCallback(async () => {
    if (estado !== 'conectado') throw new Error('Servidor de impresión no disponible')
    if (!impTermica) throw new Error('Selecciona una impresora en Configuración')
    const W = anchoCars
    const ESC = '\x1B', GS = '\x1D', LF = '\x0A'
    let t = ESC + '@'
    t += GS + '\x7C' + String.fromCharCode(densidad)
    t += ESC + '\x61\x01' + ESC + '\x45\x01'
    t += 'TICKET DE PRUEBA' + LF
    t += ESC + '\x45\x00' + ESC + '\x61\x00'
    t += '-'.repeat(W) + LF
    t += 'Papel  : ' + anchoPapel + 'mm (' + W + ' chars)' + LF
    t += 'Densidad: ' + densidad + '/8' + LF
    t += 'Gaveta : Pin ' + (gavetaPin === '1' ? '5' : '2') + LF
    t += '-'.repeat(W) + LF
    const total = '$50.000'
    t += 'TOTAL:' + ' '.repeat(W - 6 - total.length) + total + LF
    t += '-'.repeat(W) + LF
    t += ESC + '\x61\x01' + 'CarolinaPOS' + LF
    t += ESC + '\x64' + String.fromCharCode(avancePapel)
    if (modoCortePapel === 'completo') t += GS + '\x56\x00'
    if (modoCortePapel === 'parcial')  t += GS + '\x56\x01'
    if (gavetaAuto) t += ESC + '\x70' + (gavetaPin === '1' ? '\x01' : '\x00') + '\x19\x19'
    await api.post('/api/print/job', { bytes: strABytes(t), impresora: impTermica })
  }, [estado, impTermica, densidad, anchoPapel, anchoCars, avancePapel, modoCortePapel, gavetaPin, gavetaAuto])

  const imprimirA4 = useCallback(async (htmlContent) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(htmlContent)
    iframe.contentDocument.close()
    await new Promise(r => setTimeout(r, 300))
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }, [])

  return {
    estado,
    conectado: estado === 'conectado',
    impresoras,
    errorMsg,
    conectar,
    impTermica, guardarImpTermica,
    densidad, guardarDensidad,
    anchoPapel, guardarAnchoPapel, anchoCars,
    avancePapel, guardarAvancePapel,
    modoCortePapel, guardarModoCortePapel,
    gavetaPin, guardarGavetaPin,
    gavetaAuto, guardarGavetaAuto,
    impA4, guardarImpA4,
    scannerMs, guardarScannerMs,
    scannerMin, guardarScannerMin,
    imprimirTicket, abrirGaveta, imprimirPrueba, imprimirA4, buscarImpresoras,
  }
}

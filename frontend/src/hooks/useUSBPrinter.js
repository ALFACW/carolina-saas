import { useState, useEffect, useCallback } from 'react'

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

// Referencia en memoria al dispositivo USB activo
let usbDevice = null

// Encuentra la primera interfaz con endpoint bulk-out (para enviar datos)
function encontrarEndpoint(device) {
  for (const iface of device.configuration.interfaces) {
    const alts = iface.alternates || (iface.alternate ? [iface.alternate] : [])
    for (const alt of alts) {
      const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk')
      if (ep) return { interfaceNumber: iface.interfaceNumber, endpointNumber: ep.endpointNumber }
    }
  }
  return null
}

// Envía bytes crudos al puerto USB
async function enviarBytes(device, bytes) {
  await device.open()
  try {
    if (device.configuration === null) await device.selectConfiguration(1)
    const ep = encontrarEndpoint(device)
    if (!ep) throw new Error('No se encontró endpoint de impresora en el dispositivo USB')
    await device.claimInterface(ep.interfaceNumber)
    try {
      const CHUNK = 4096
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await device.transferOut(ep.endpointNumber, bytes.slice(i, i + CHUNK))
      }
    } finally {
      await device.releaseInterface(ep.interfaceNumber)
    }
  } finally {
    await device.close()
  }
}

// Convierte string ESC/POS o base64 a Uint8Array
function toBytes(items) {
  let total = 0
  const parts = items.map(item => {
    let arr
    if (item.format === 'base64') {
      const bin = atob(item.data)
      arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i) & 0xFF
    } else {
      const s = item.data || ''
      arr = new Uint8Array(s.length)
      for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i) & 0xFF
    }
    total += arr.length
    return arr
  })
  const result = new Uint8Array(total)
  let offset = 0
  for (const p of parts) { result.set(p, offset); offset += p.length }
  return result
}

function strToBytes(s) {
  const arr = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i) & 0xFF
  return arr
}

export function useUSBPrinter() {
  const [estado,     setEstado]     = useState('desconectado')
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

  // Busca dispositivos USB aprobados previamente (sin popup del navegador)
  const conectar = useCallback(async () => {
    if (!navigator.usb) {
      setEstado('error')
      setErrorMsg('WebUSB no disponible. Usa Chrome o Edge.')
      return
    }
    setEstado('conectando')
    try {
      const devices = await navigator.usb.getDevices()
      if (devices.length > 0) {
        usbDevice = devices[0]
        const nombre = usbDevice.productName || `USB ${usbDevice.vendorId.toString(16).toUpperCase()}:${usbDevice.productId.toString(16).toUpperCase()}`
        save(K.impTermica, nombre)
        setImpTermica(nombre)
        setEstado('conectado')
        setErrorMsg('')
      } else {
        usbDevice = null
        setEstado('desconectado')
        setErrorMsg('')
      }
    } catch (err) {
      setEstado('error')
      setErrorMsg('Error USB: ' + err.message)
    }
  }, [])

  // Muestra el selector de dispositivos USB del navegador (solo necesario una vez)
  const seleccionarImpresora = useCallback(async () => {
    if (!navigator.usb) {
      setErrorMsg('WebUSB no disponible. Usa Chrome o Edge.')
      return
    }
    try {
      // Sin filtros para mostrar todas las impresoras USB (incluye genéricas chinas)
      const device = await navigator.usb.requestDevice({ filters: [] })
      usbDevice = device
      const nombre = device.productName || `USB ${device.vendorId.toString(16).toUpperCase()}:${device.productId.toString(16).toUpperCase()}`
      save(K.impTermica, nombre)
      setImpTermica(nombre)
      setEstado('conectado')
      setErrorMsg('')
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        setErrorMsg('No se pudo seleccionar la impresora: ' + err.message)
      }
    }
  }, [])

  const buscarImpresoras = useCallback(() => conectar(), [conectar])

  useEffect(() => { conectar() }, [])

  // Lista compatible con el dropdown de Configuracion
  const impresoras = impTermica ? [impTermica] : []

  const imprimirTicket = useCallback(async (datosEscPos) => {
    if (!usbDevice) throw new Error('No hay impresora USB seleccionada. Ve a Configuración.')

    let bytes = toBytes(datosEscPos)

    // Logo si existe
    const logoSrc = localStorage.getItem('carolina_logo')
    if (logoSrc) {
      try {
        const { logoAEscPos } = await import('../lib/logoEscPos')
        const logoB64 = await logoAEscPos(logoSrc, anchoCars)
        if (logoB64) {
          const center = strToBytes('\x1B\x61\x01')
          const left   = strToBytes('\x1B\x61\x00')
          const logo   = toBytes([{ format: 'base64', data: logoB64 }])
          const full   = new Uint8Array(center.length + logo.length + left.length + bytes.length)
          let off = 0
          for (const p of [center, logo, left, bytes]) { full.set(p, off); off += p.length }
          bytes = full
        }
      } catch (e) {
        console.warn('Logo error:', e.message)
      }
    }

    await enviarBytes(usbDevice, bytes)
  }, [anchoCars])

  const abrirGaveta = useCallback(async () => {
    if (!usbDevice) return false
    const pin = gavetaPin === '1' ? '\x01' : '\x00'
    await enviarBytes(usbDevice, strToBytes(`\x1B\x70${pin}\x19\x19`))
    return true
  }, [gavetaPin])

  const imprimirPrueba = useCallback(async () => {
    if (!usbDevice) throw new Error('Sin impresora configurada')
    const W = anchoCars
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
    const total = '$50.000'
    t += 'TOTAL:' + ' '.repeat(W - 6 - total.length) + total + LF
    t += '-'.repeat(W) + LF
    t += ESC + '\x61\x01' + 'CarolinaPOS' + LF
    t += ESC + '\x64' + String.fromCharCode(avancePapel)
    if (modoCortePapel === 'completo') t += GS + '\x56\x00'
    if (modoCortePapel === 'parcial')  t += GS + '\x56\x01'
    if (gavetaAuto) t += ESC + '\x70' + (gavetaPin === '1' ? '\x01' : '\x00') + '\x19\x19'
    await enviarBytes(usbDevice, strToBytes(t))
  }, [densidad, anchoPapel, anchoCars, avancePapel, modoCortePapel, gavetaPin, gavetaAuto])

  // Impresión A4/carta: usa el sistema de impresión nativo del navegador
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
    seleccionarImpresora,
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
    imprimirTicket, abrirGaveta, imprimirPrueba, imprimirA4, buscarImpresoras,
  }
}

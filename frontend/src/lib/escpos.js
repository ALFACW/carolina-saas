// Generador ESC/POS — Ticket POS Colombia (Documento Equivalente Electrónico)
const ESC = '\x1B'
const GS  = '\x1D'
const LF  = '\x0A'

// Las impresoras térmicas no manejan UTF-8 — se normalizan los caracteres especiales
const txt = (s) => String(s || '')
  .replace(/[áàâäã]/g, 'a').replace(/[ÁÀÂÄÃ]/g, 'A')
  .replace(/[éèêë]/g,  'e').replace(/[ÉÈÊË]/g,  'E')
  .replace(/[íìîï]/g,  'i').replace(/[ÍÌÎÏ]/g,  'I')
  .replace(/[óòôöõ]/g, 'o').replace(/[ÓÒÔÖÕ]/g, 'O')
  .replace(/[úùûü]/g,  'u').replace(/[ÚÙÛÜ]/g,  'U')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .replace(/ç/g, 'c').replace(/Ç/g, 'C')
  .replace(/¡/g, '!').replace(/¿/g, '?')

const CMD = {
  init:       ESC + '@',
  boldOn:     ESC + '\x45\x01',
  boldOff:    ESC + '\x45\x00',
  center:     ESC + '\x61\x01',
  left:       ESC + '\x61\x00',
  sizeNormal: GS  + '\x21\x00',
  sizeDoble:  GS  + '\x21\x11',
  sizeAncho:  GS  + '\x21\x10',
  cut:        GS  + '\x56\x00',
  feed3:      ESC + '\x64\x03',
  openDrawer: ESC + '\x70\x00\x19\x19',
}

// Genera comandos ESC/POS para imprimir un QR code en la impresora térmica
// Usa el comando GS ( k estándar compatible con la mayoría de impresoras ESC/POS
function escposQR(data, size = 4) {
  const GS = '\x1D'
  const qrData = String(data)
  const len = qrData.length + 3
  const pL = len & 0xFF
  const pH = (len >> 8) & 0xFF

  let cmd = ''
  // Modelo QR (modelo 2)
  cmd += GS + '(k' + '\x04\x00' + '\x31\x41\x32\x00'
  // Tamaño del módulo (1-16, recomendado 3-5)
  cmd += GS + '(k' + '\x03\x00' + '\x31\x43' + String.fromCharCode(size)
  // Corrección de errores (M = 77)
  cmd += GS + '(k' + '\x03\x00' + '\x31\x45' + '\x4D'
  // Almacenar datos
  cmd += GS + '(k' + String.fromCharCode(pL) + String.fromCharCode(pH) + '\x31\x50\x30' + qrData
  // Imprimir
  cmd += GS + '(k' + '\x03\x00' + '\x31\x51\x30'
  return cmd
}

const pad = (text, len, right = false) => {
  const t = String(text || '').substring(0, len)
  const sp = ' '.repeat(Math.max(0, len - t.length))
  return right ? sp + t : t + sp
}

const cols2 = (izq, der, W = 32) => {
  const d = String(der)
  const maxIzq = W - d.length - 1
  return pad(izq, maxIzq) + ' ' + d + LF
}

const sep = (c = '-', W = 32) => c.repeat(W) + LF

export function buildTicket({ empresa, venta, cliente, modoDemo = false, W = 32, densidad = 6, avancePapel = 3, modoCortePapel = 'completo' }) {
  let t = CMD.init

  // Densidad de impresión: GS | n  (0=baja ... 8=máxima)
  // Mejora la nitidez si las letras salen débiles o grises
  t += GS + '\x7C' + String.fromCharCode(Math.min(8, Math.max(0, densidad)))

  // ── Encabezado empresa ─────────────────────────────────
  t += CMD.center + CMD.boldOn + CMD.sizeDoble
  t += txt(empresa.nombre || 'Mi Empresa') + LF
  t += CMD.sizeNormal + CMD.boldOff
  t += 'NIT: ' + txt(empresa.nit || '000.000.000-0') + LF
  if (empresa.direccion) t += txt(empresa.direccion) + LF
  if (empresa.ciudad)    t += txt(empresa.ciudad) + LF
  if (empresa.telefono)  t += 'Tel: ' + txt(empresa.telefono) + LF
  t += LF

  // ── Tipo de documento ──────────────────────────────────
  t += CMD.boldOn
  t += (modoDemo ? '*** DEMO - SIN VALIDEZ DIAN ***' : 'FACTURA ELECTRONICA DE VENTA') + LF
  t += CMD.boldOff

  // ── Resolución DIAN (obligatorio) ─────────────────────
  if (!modoDemo) {
    const resolucion = empresa.resolucion_dian || 'RESOLUCION DIAN PENDIENTE'
    const rangoDesde = empresa.rango_desde    || '000000001'
    const rangoHasta = empresa.rango_hasta    || '999999999'
    const vigencia   = empresa.vigencia_dian  || '2025-01-01 al 2026-12-31'
    t += CMD.center
    t += 'Resolucion No. ' + txt(resolucion) + LF
    t += 'Rango: ' + rangoDesde + ' - ' + rangoHasta + LF
    t += 'Vigencia: ' + txt(vigencia) + LF
    t += CMD.left
  }

  // ── Datos factura ──────────────────────────────────────
  t += sep('-', W)
  t += cols2('No. Factura:', venta.numero_factura || '---', W)
  t += cols2('Fecha:', new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }), W)
  t += cols2('Pago:', txt((venta.metodo_pago || 'Efectivo').replace(/_/g, ' ')), W)
  if (cliente) {
    t += cols2('Cliente:', txt(cliente.nombre).substring(0, 18), W)
    if (cliente.numero_documento) t += cols2('Doc:', `${cliente.tipo_documento || 'CC'}: ${cliente.numero_documento}`, W)
  } else {
    t += cols2('Cliente:', 'Consumidor Final', W)
  }

  // ── Items ──────────────────────────────────────────────
  t += sep('-', W)
  t += CMD.boldOn + pad('Descripcion', W - 8) + pad('Total', 8, true) + LF + CMD.boldOff
  t += sep('-', W)

  venta.items?.forEach(item => {
    t += CMD.boldOn + txt(item.descripcion).substring(0, W) + CMD.boldOff + LF
    const cant  = `  ${item.cantidad} x $${Math.round(item.precio_unitario).toLocaleString('es-CO')}`
    const total = '$' + Math.round(item.subtotal).toLocaleString('es-CO')
    t += cols2(cant, total, W)
  })

  // ── Totales con desglose IVA ───────────────────────────
  t += sep('=', W)
  const ivaBase  = venta.subtotal || 0
  const ivaMonto = venta.impuesto_total || 0
  const ivaPorc  = ivaBase > 0 ? Math.round((ivaMonto / ivaBase) * 100) : 0

  t += cols2('Subtotal:', '$' + Math.round(ivaBase).toLocaleString('es-CO'), W)
  t += cols2(`IVA ${ivaPorc}%:`, '$' + Math.round(ivaMonto).toLocaleString('es-CO'), W)
  t += sep('=', W)
  t += CMD.center + CMD.boldOn + CMD.sizeAncho
  t += 'TOTAL: $' + Math.round(venta.total).toLocaleString('es-CO') + LF
  t += CMD.sizeNormal + CMD.boldOff + CMD.left

  if (venta.efectivo_recibido > 0) {
    t += sep('-', W)
    t += cols2('Recibido:', '$' + Math.round(venta.efectivo_recibido).toLocaleString('es-CO'), W)
    t += CMD.boldOn
    t += cols2('Vuelto:', '$' + Math.round(Math.max(0, venta.efectivo_recibido - venta.total)).toLocaleString('es-CO'), W)
    t += CMD.boldOff
  }

  // ── CUFE + QR ─────────────────────────────────────────
  t += sep('-', W)
  t += CMD.center

  if (venta.cufe && !modoDemo) {
    // QR real apuntando a verificación DIAN
    const cufeUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${venta.cufe}`
    t += escposQR(cufeUrl, 4)
    t += LF
    t += 'Escanea para verificar en DIAN' + LF
    t += CMD.left
    t += 'CUFE:' + LF
    for (let i = 0; i < Math.min(venta.cufe.length, 64); i += W) {
      t += venta.cufe.substring(i, i + W) + LF
    }
  } else if (modoDemo) {
    // QR de prueba para verificar que la impresora lo soporta
    t += escposQR('https://carolinapos.co', 4)
    t += LF
    t += '*** TICKET DE PRUEBA ***' + LF
    t += 'Sin validez DIAN' + LF + CMD.left
  }

  // ── Pie ───────────────────────────────────────────────
  t += sep('-', W)
  t += CMD.center
  if (modoDemo) {
    t += '*** SIN VALIDEZ DIAN ***' + LF
    t += 'Conecta Alegra para facturar legal' + LF
  } else {
    t += CMD.boldOn + '!Gracias por su compra!' + CMD.boldOff + LF
    t += 'Factura valida ante la DIAN' + LF
    t += 'Conserve este comprobante' + LF
  }

  // Avance y corte según configuración
  const lineas = typeof avancePapel !== 'undefined' ? avancePapel : 3
  t += ESC + '\x64' + String.fromCharCode(lineas)
  if (!modoCortePapel || modoCortePapel === 'completo') t += CMD.cut
  if (modoCortePapel === 'parcial') t += GS + '\x56\x01'
  // Sin corte si modoCortePapel === 'ninguno'
  t += CMD.openDrawer

  return [{ type: 'raw', format: 'plain', data: t }]
}

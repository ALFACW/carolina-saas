// Generador ESC/POS — Ticket POS Colombia (Factura Electrónica)
const ESC = '\x1B'
const GS  = '\x1D'
const LF  = '\x0A'

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
  openDrawer: ESC + '\x70\x00\x19\x19',
}

function escposQR(data, size = 4) {
  const qrData = String(data)
  const len = qrData.length + 3
  const pL = len & 0xFF
  const pH = (len >> 8) & 0xFF
  let cmd = ''
  cmd += GS + '(k' + '\x04\x00' + '\x31\x41\x32\x00'
  cmd += GS + '(k' + '\x03\x00' + '\x31\x43' + String.fromCharCode(size)
  cmd += GS + '(k' + '\x03\x00' + '\x31\x45' + '\x4D'
  cmd += GS + '(k' + String.fromCharCode(pL) + String.fromCharCode(pH) + '\x31\x50\x30' + qrData
  cmd += GS + '(k' + '\x03\x00' + '\x31\x51\x30'
  return cmd
}

const pad = (text, len, right = false) => {
  const t = String(text || '').substring(0, len)
  const sp = ' '.repeat(Math.max(0, len - t.length))
  return right ? sp + t : t + sp
}

const sep = (c = '-', W = 32) => c.repeat(W) + LF

const fechaLarga = () => {
  const d = new Date()
  return txt(d.toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }))
}

export function buildTicket({ empresa, venta, cliente, cajero, modoDemo = false, W = 32, densidad = 6, avancePapel = 3, modoCortePapel = 'completo' }) {
  let t = CMD.init

  // Densidad
  t += GS + '\x7C' + String.fromCharCode(Math.min(8, Math.max(0, densidad)))

  // ─── LOGO (si existe se maneja desde useQZTray antes del texto) ────────────

  // ─── ENCABEZADO ────────────────────────────────────────────
  t += CMD.center + sep('-', W)

  // NIT
  t += CMD.boldOn
  t += 'NIT: ' + txt(empresa.nit || '000.000.000-0') + LF
  t += CMD.boldOff

  // Nombre empresa en grande
  t += CMD.sizeDoble + CMD.boldOn
  t += txt(empresa.nombre || 'Mi Empresa') + LF
  t += CMD.sizeNormal + CMD.boldOff

  t += sep('-', W)

  // ─── TIPO DE DOCUMENTO ─────────────────────────────────────
  t += CMD.boldOn + CMD.sizeAncho
  if (modoDemo) {
    t += '*** DEMO ***' + LF
  } else {
    t += 'FACTURA ELECTRONICA' + LF
  }
  t += CMD.sizeNormal + CMD.boldOff

  t += sep('-', W) + CMD.left

  // ─── DATOS DE LA VENTA ─────────────────────────────────────
  const col = (label, valor) => {
    const v = txt(String(valor || ''))
    const maxL = W - v.length - 1
    return pad(label, Math.max(1, maxL)) + ' ' + v + LF
  }

  t += col('Factura No.:', venta.numero_factura || '---')
  t += col('Fecha:', fechaLarga())
  t += col('Tipo de pago:', txt((venta.metodo_pago || 'Efectivo').replace(/_/g, ' ')))

  if (cliente) {
    t += col('Cliente:', txt(cliente.nombre).substring(0, W - 10))
    if (cliente.numero_documento) t += col('Documento:', `${cliente.tipo_documento || 'CC'}: ${cliente.numero_documento}`)
  } else {
    t += col('Cliente:', 'Consumidor Final')
  }

  if (cajero) t += col('Cajero:', txt(cajero).substring(0, W - 10))
  if (empresa.direccion) t += col('Sucursal:', txt(empresa.direccion).substring(0, W - 10))
  if (empresa.telefono)  t += col('Telefono:', txt(empresa.telefono))
  if (empresa.email)     t += col('Correo:', txt(empresa.email).substring(0, W - 10))

  // ─── ITEMS ─────────────────────────────────────────────────
  t += sep('-', W)

  // Cabecera columnas
  const descW = W - 10 - 8  // ancho para descripción
  t += CMD.boldOn
  t += pad('DESCRIPCION', descW) + pad('CANT', 6, true) + pad('TOTAL', 8, true) + LF
  t += CMD.boldOff
  t += sep('-', W)

  venta.items?.forEach(item => {
    const nombre = txt(item.descripcion).substring(0, descW)
    const cant   = `x${item.cantidad}`
    const total  = '$' + Math.round(item.subtotal).toLocaleString('es-CO')
    t += pad(nombre, descW) + pad(cant, 6, true) + pad(total, 8, true) + LF
    // Precio unitario en línea pequeña
    t += '  ' + Math.round(item.precio_unitario).toLocaleString('es-CO') + ' c/u' + LF
  })

  // ─── TOTALES ───────────────────────────────────────────────
  t += sep('=', W)

  const ivaBase  = venta.subtotal || 0
  const ivaMonto = venta.impuesto_total || 0
  const ivaPorc  = ivaBase > 0 ? Math.round((ivaMonto / ivaBase) * 100) : 0

  t += col('SUB TOTAL:', '$' + Math.round(ivaBase).toLocaleString('es-CO'))
  if (ivaMonto > 0) {
    t += col(`IVA ${ivaPorc}%:`, '$' + Math.round(ivaMonto).toLocaleString('es-CO'))
  }
  t += sep('=', W)

  // Total grande
  t += CMD.center + CMD.boldOn + CMD.sizeDoble
  t += 'TOTAL: $' + Math.round(venta.total).toLocaleString('es-CO') + LF
  t += CMD.sizeNormal + CMD.boldOff + CMD.left

  // Vuelto
  if (venta.efectivo_recibido > 0) {
    t += sep('-', W)
    t += col('Recibido:', '$' + Math.round(venta.efectivo_recibido).toLocaleString('es-CO'))
    t += CMD.boldOn
    t += col('Vuelto:', '$' + Math.round(Math.max(0, venta.efectivo_recibido - venta.total)).toLocaleString('es-CO'))
    t += CMD.boldOff
  }

  // ─── QR + CUFE ─────────────────────────────────────────────
  t += sep('-', W) + CMD.center

  if (venta.cufe && !modoDemo) {
    const cufeUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${venta.cufe}`
    t += escposQR(cufeUrl, 6) + LF
    t += sep('~', W)
    t += 'ESCANEA PARA VERIFICAR' + LF
    t += sep('~', W)
    t += CMD.left + 'CUFE:' + LF
    for (let i = 0; i < Math.min(venta.cufe.length, 64); i += W) {
      t += venta.cufe.substring(i, i + W) + LF
    }
  } else {
    // Modo demo: QR de prueba
    t += escposQR('https://carolinapos.co', 6) + LF
    t += sep('~', W)
    t += 'DOCUMENTO DE PRUEBA' + LF
    t += sep('~', W)
  }

  // ─── PIE ───────────────────────────────────────────────────
  t += CMD.center
  t += sep('-', W)
  t += CMD.boldOn + 'GRACIAS POR TU COMPRA' + CMD.boldOff + LF

  if (!modoDemo) {
    t += 'FACTURA VALIDA ANTE LA DIAN' + LF
  } else {
    t += '*** SIN VALIDEZ DIAN ***' + LF
  }
  t += 'CONSERVE ESTE COMPROBANTE' + LF
  t += sep('-', W)

  // Corte
  t += ESC + '\x64' + String.fromCharCode(avancePapel)
  if (!modoCortePapel || modoCortePapel === 'completo') t += CMD.cut
  if (modoCortePapel === 'parcial') t += GS + '\x56\x01'
  t += CMD.openDrawer

  return [{ type: 'raw', format: 'plain', data: t }]
}

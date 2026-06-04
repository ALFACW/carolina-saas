// Generador ESC/POS — Ticket CarolinaPOS (diseño Claude Design)
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
  .replace(/[·•]/g, '-')
  .replace(/[""]/g, '"').replace(/['']/g, "'")
  .replace(/[^\x00-\xFF]/g, '?')

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
  cutParcial: GS  + '\x56\x01',
  openDrawer: ESC + '\x70\x00\x19\x19',
}

function escposQR(data, size = 6) {
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

const rpad = (text, len) => {
  const t = String(text || '').substring(0, len)
  return t + ' '.repeat(Math.max(0, len - t.length))
}
const lpad = (text, len) => {
  const t = String(text || '').substring(0, len)
  return ' '.repeat(Math.max(0, len - t.length)) + t
}

const sep = (c = '-', W = 32) => c.repeat(W) + LF
const money = (n) => '$' + Math.round(n).toLocaleString('es-CO')

const fechaHora = () => {
  const d = new Date()
  const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  return txt(`${fecha}  ${hora}`)
}

// Tabla ESC 7: n1=puntos max, n2=tiempo calor(µs), n3=intervalo
// Más n2 = más oscuro. Rango densidad 0-8.
const DENSITY_TABLE = [
  [3,  30, 8],  // 0 muy claro
  [5,  50, 6],  // 1
  [7,  70, 4],  // 2
  [9,  90, 3],  // 3
  [9, 120, 2],  // 4 normal
  [11,150, 2],  // 5
  [13,180, 1],  // 6 (default Carolina)
  [15,210, 1],  // 7
  [15,240, 0],  // 8 máximo
]

export function buildTicket({ empresa, venta, cliente, cajero, modoDemo = false, W = 48, densidad = 6, avancePapel = 3, modoCortePapel = 'completo', abrirGaveta = false }) {
  let t = CMD.init

  // ESC 7 n1 n2 n3 — densidad de impresión (calor del cabezal)
  const [n1, n2, n3] = DENSITY_TABLE[Math.min(8, Math.max(0, densidad))]
  t += ESC + '\x37' + String.fromCharCode(n1) + String.fromCharCode(n2) + String.fromCharCode(n3)

  // ══ ENCABEZADO ═══════════════════════════════════════
  t += CMD.center

  t += 'NIT ' + txt(empresa.nit || '000.000.000-0') + LF

  t += CMD.boldOn + CMD.sizeDoble
  t += txt(empresa.nombre || 'Mi Empresa') + LF
  t += CMD.sizeNormal + CMD.boldOff

  if (empresa.direccion) t += txt(empresa.direccion) + LF
  if (empresa.telefono)  t += 'Tel. ' + txt(empresa.telefono) + LF

  t += LF + CMD.boldOn + CMD.sizeAncho
  t += (modoDemo ? '*** MODO DEMO ***' : 'FACTURA ELECTRONICA') + LF
  t += CMD.sizeNormal + CMD.boldOff

  // ══ DATOS ════════════════════════════════════════════
  t += sep('-', W) + CMD.left

  const fila = (label, valor) => {
    const l = txt(label)
    const v = txt(String(valor || ''))
    const sp = W - l.length - v.length
    return l + ' '.repeat(Math.max(1, sp)) + v + LF
  }

  t += fila('Factura:', venta.numero_factura || (modoDemo ? 'DEMO-000001' : '---'))
  t += fila('Fecha:', fechaHora())
  t += fila('Cajero:', txt(cajero || '-').substring(0, W - 10))
  t += fila('Cliente:', cliente ? txt(cliente.nombre || 'Consumidor Final').substring(0, W - 10) : 'Consumidor Final')
  if (cliente?.numero_documento) {
    t += fila('Documento:', `${txt(cliente.tipo_documento || 'CC')} ${cliente.numero_documento}`)
  }
  t += fila('Pago:', txt((venta.metodo_pago || 'Efectivo').replace(/_/g, ' ')))

  // ══ ITEMS ════════════════════════════════════════════
  t += sep('-', W)

  // Anchos de columna según papel
  const isWide = W >= 40
  const wDesc   = isWide ? W - 28 : W - 19
  const wCant   = isWide ? 5  : 4
  const wPrecio = isWide ? 11 : 7
  const wTotal  = isWide ? 12 : 8

  t += CMD.boldOn
  t += rpad('DESCRIPCION', wDesc) + lpad('CANT', wCant) + lpad('PRECIO', wPrecio) + lpad('TOTAL', wTotal) + LF
  t += CMD.boldOff + sep('-', W)

  venta.items?.forEach(item => {
    const nombre = txt(item.descripcion).substring(0, wDesc)
    const cant   = `x${item.cantidad}`
    const precio = money(item.precio_unitario)
    const total  = money(item.subtotal || item.precio_unitario * item.cantidad)
    t += rpad(nombre, wDesc) + lpad(cant, wCant) + lpad(precio, wPrecio) + lpad(total, wTotal) + LF
  })

  // ══ TOTALES ══════════════════════════════════════════
  t += sep('=', W)

  const base    = venta.subtotal || 0
  const iva     = venta.impuesto_total || 0
  const ivaPorc = base > 0 ? Math.round((iva / base) * 100) : 0

  t += fila('Subtotal:', money(base))
  if (iva > 0) t += fila(`IVA ${ivaPorc}%:`, money(iva))

  t += sep('=', W) + CMD.center + CMD.boldOn + CMD.sizeDoble
  t += 'TOTAL ' + money(venta.total) + LF
  t += CMD.sizeNormal + CMD.boldOff + CMD.left

  if (venta.efectivo_recibido > 0) {
    t += sep('-', W)
    t += fila('Efectivo recibido:', money(venta.efectivo_recibido))
    t += CMD.boldOn + fila('Cambio:', money(Math.max(0, venta.efectivo_recibido - venta.total))) + CMD.boldOff
  }

  // ══ QR + CUFE ════════════════════════════════════════
  t += sep('-', W) + CMD.center

  if (venta.cufe && !modoDemo) {
    const cufeUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${venta.cufe}`
    t += escposQR(cufeUrl, 6) + LF
    t += sep('~', W)
    t += 'ESCANEA PARA VERIFICAR EN DIAN' + LF
    t += sep('~', W)
    t += CMD.left + 'CUFE:' + LF
    for (let i = 0; i < Math.min(venta.cufe.length, 64); i += W) {
      t += venta.cufe.substring(i, i + W) + LF
    }
  } else {
    t += escposQR('https://carolinapos.co', 6) + LF
    t += sep('~', W)
    t += 'ESCANEA PARA VERIFICAR EN DIAN' + LF
    t += sep('~', W)
  }

  // ══ PIE ══════════════════════════════════════════════
  t += CMD.center + sep('-', W)
  t += CMD.boldOn + '!GRACIAS POR SU COMPRA!' + CMD.boldOff + LF
  t += (modoDemo ? '*** SIN VALIDEZ DIAN ***' : 'Factura valida ante la DIAN') + LF
  t += 'Conserve este comprobante' + LF
  t += sep('-', W) + 'CarolinaPOS' + LF

  // Corte
  t += ESC + '\x64' + String.fromCharCode(avancePapel)
  if (!modoCortePapel || modoCortePapel === 'completo') t += CMD.cut
  if (modoCortePapel === 'parcial') t += CMD.cutParcial

  // Gaveta — solo al procesar la venta, no al reimprimir
  if (abrirGaveta) t += CMD.openDrawer

  return [{ type: 'raw', format: 'plain', data: t }]
}

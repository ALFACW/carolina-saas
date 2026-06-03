// Genera el ticket como HTML para impresión via QZ Tray cuando hay logo
import { COP } from './format'

const txt = (s) => String(s || '')
  .replace(/[áàâäã]/g, 'a').replace(/[ÁÀÂÄÃ]/g, 'A')
  .replace(/[éèêë]/g,  'e').replace(/[ÉÈÊË]/g,  'E')
  .replace(/[íìîï]/g,  'i').replace(/[ÍÌÎÏ]/g,  'I')
  .replace(/[óòôöõ]/g, 'o').replace(/[ÓÒÔÖÕ]/g, 'O')
  .replace(/[úùûü]/g,  'u').replace(/[ÚÙÛÜ]/g,  'U')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .replace(/¡/g, '!').replace(/¿/g, '?')

export function buildTicketHTML({ empresa, venta, cliente, modoDemo = false, anchoPapel = '80' }) {
  const W = anchoPapel === '58' ? '58mm' : '80mm'
  const logo = localStorage.getItem('carolina_logo') || null

  const fecha = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

  const ivaBase  = venta.subtotal || 0
  const ivaMonto = venta.impuesto_total || 0
  const ivaPorc  = ivaBase > 0 ? Math.round((ivaMonto / ivaBase) * 100) : 0

  const itemsHtml = (venta.items || []).map(item => `
    <div style="margin-bottom:4px;">
      <div style="font-weight:bold;">${txt(item.descripcion)}</div>
      <div style="display:flex;justify-content:space-between;">
        <span>${item.cantidad} x ${COP(item.precio_unitario)}</span>
        <span>${COP(item.subtotal)}</span>
      </div>
    </div>
  `).join('')

  const vueltoHtml = venta.efectivo_recibido > 0 ? `
    <div style="display:flex;justify-content:space-between;"><span>Recibido:</span><span>${COP(venta.efectivo_recibido)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;"><span>Vuelto:</span><span>${COP(Math.max(0, venta.efectivo_recibido - venta.total))}</span></div>
  ` : ''

  const cufeHtml = venta.cufe && !modoDemo ? `
    <div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px;text-align:center;">
      <div style="font-size:8px;">Verificar en DIAN:</div>
      <div style="font-size:7px;word-break:break-all;">${venta.cufe.substring(0, 60)}...</div>
    </div>
  ` : ''

  const demoHtml = modoDemo ? `
    <div style="border:1px solid #000;padding:3px;text-align:center;font-size:9px;margin:4px 0;">
      *** SIN VALIDEZ DIAN ***
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: ${W} auto; margin: 3mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: ${W};
      color: #000;
    }
    .sep { border-top: 1px dashed #000; margin: 5px 0; }
    .sep2 { border-top: 2px solid #000; margin: 5px 0; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; }
    .bold { font-weight: bold; }
    .total { font-size: 15px; font-weight: bold; text-align: center; margin: 4px 0; }
  </style>
</head>
<body>
  <!-- Logo si existe -->
  ${logo ? `<div class="center" style="margin-bottom:6px;"><img src="${logo}" style="max-height:55px;max-width:${anchoPapel === '58' ? '140px' : '200px'};"/></div>` : ''}

  <!-- Encabezado empresa -->
  <div class="center">
    <div class="bold" style="font-size:13px;">${txt(empresa.nombre || 'Mi Empresa')}</div>
    <div>NIT: ${txt(empresa.nit || '000.000.000-0')}</div>
    ${empresa.direccion ? `<div>${txt(empresa.direccion)}</div>` : ''}
    ${empresa.ciudad ? `<div>${txt(empresa.ciudad)}</div>` : ''}
    ${empresa.telefono ? `<div>Tel: ${txt(empresa.telefono)}</div>` : ''}
  </div>

  ${demoHtml}

  <div class="sep"></div>
  <div class="bold center">${modoDemo ? 'VENTA DE PRUEBA' : 'FACTURA ELECTRONICA DE VENTA'}</div>
  <div class="sep"></div>

  <div class="row"><span>No. Factura:</span><span class="bold">${venta.numero_factura || '---'}</span></div>
  <div class="row"><span>Fecha:</span><span>${fecha}</span></div>
  <div class="row"><span>Pago:</span><span>${txt((venta.metodo_pago || 'Efectivo').replace(/_/g, ' '))}</span></div>
  ${cliente ? `<div class="row"><span>Cliente:</span><span>${txt(cliente.nombre).substring(0, 18)}</span></div>` : '<div class="row"><span>Cliente:</span><span>Consumidor Final</span></div>'}

  <div class="sep"></div>
  <div class="row"><span class="bold">Descripcion</span><span class="bold">Total</span></div>
  <div class="sep"></div>

  ${itemsHtml}

  <div class="sep2"></div>
  <div class="row"><span>Subtotal:</span><span>${COP(ivaBase)}</span></div>
  <div class="row"><span>IVA ${ivaPorc}%:</span><span>${COP(ivaMonto)}</span></div>
  <div class="sep2"></div>
  <div class="total">TOTAL: ${COP(venta.total)}</div>
  <div class="sep"></div>

  ${vueltoHtml}
  ${cufeHtml}

  <div class="sep"></div>
  <div class="center">
    <div class="bold">${modoDemo ? '*** SIN VALIDEZ DIAN ***' : '!Gracias por su compra!'}</div>
    <div style="font-size:9px;">${modoDemo ? 'Conecta Alegra para facturar legal' : 'Factura valida ante la DIAN'}</div>
  </div>
</body>
</html>`
}

'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Devuelve un transporter de Nodemailer usando Gmail SMTP.
 * Retorna null si las variables de entorno no están configuradas.
 */
function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Formatea un número como moneda colombiana COP.
 */
function formatCOP(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formatea una fecha ISO como dd/mm/yyyy.
 */
function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Construye el HTML del email de factura.
 */
function buildFacturaHTML({ factura, tenant, cliente, items }) {
  const nombreEmpresa = tenant.nombre_empresa || tenant.nombre || 'Carolina SaaS';
  const nitEmpresa = tenant.nit || '';
  const direccionEmpresa = tenant.direccion || '';
  const telefonoEmpresa = tenant.telefono || '';
  const emailEmpresa = tenant.email || process.env.EMAIL_USER || '';

  const nombreCliente = cliente.nombre || factura.cliente_nombre || 'Cliente';
  const docCliente = cliente.numero_documento || factura.numero_documento || '';
  const emailCliente = cliente.email || '';
  const telefonoCliente = cliente.telefono || '';

  const numero = factura.numero_factura || factura.numero || factura.id;
  const fechaEmision = formatFecha(factura.fecha_emision);
  const fechaVencimiento = formatFecha(factura.fecha_vencimiento);
  const estado = (factura.estado || 'emitida').toUpperCase();

  const estadoColor = {
    PAGADA: '#16a34a',
    EMITIDA: '#2563eb',
    PENDIENTE: '#d97706',
    ANULADA: '#dc2626',
    VENCIDA: '#dc2626',
  }[estado] || '#2563eb';

  // Filas de items
  const itemRows = (items || []).map((item, idx) => {
    const nombre = item.producto_nombre || item.descripcion || item.nombre || `Ítem ${idx + 1}`;
    const cant = parseFloat(item.cantidad) || 0;
    const precio = parseFloat(item.precio_unitario) || 0;
    const descuento = parseFloat(item.descuento) || 0;
    const iva = parseFloat(item.iva_porcentaje) || parseFloat(item.impuesto_iva) || 0;
    const subtotal = parseFloat(item.subtotal) || cant * precio;
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background:${bg};">
        <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${nombre}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:center;border-bottom:1px solid #e5e7eb;">${cant}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${formatCOP(precio)}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:center;border-bottom:1px solid #e5e7eb;">${descuento > 0 ? descuento + '%' : '-'}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:center;border-bottom:1px solid #e5e7eb;">${iva > 0 ? iva + '%' : '-'}</td>
        <td style="padding:10px 14px;font-size:13px;color:#1e293b;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${formatCOP(subtotal)}</td>
      </tr>`;
  }).join('');

  const subtotalFactura = parseFloat(factura.subtotal) || 0;
  const descuentoTotal = parseFloat(factura.descuento_total) || 0;
  const ivaTotal = parseFloat(factura.iva_total) || parseFloat(factura.impuesto_total) || 0;
  const total = parseFloat(factura.total) || 0;

  const pdfLinkHtml = factura.pdf_url
    ? `<p style="margin:0 0 8px 0;">
         <a href="${factura.pdf_url}"
            style="display:inline-block;padding:10px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
           Descargar PDF de la Factura
         </a>
       </p>`
    : '';

  const cufeHtml = factura.cufe
    ? `<tr>
         <td style="padding:6px 0;font-size:11px;color:#6b7280;font-weight:500;">CUFE:</td>
         <td style="padding:6px 0;font-size:11px;color:#374151;word-break:break-all;">${factura.cufe}</td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Factura ${numero} - ${nombreEmpresa}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:640px;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${nombreEmpresa}</p>
                    ${nitEmpresa ? `<p style="margin:4px 0 0 0;font-size:13px;color:#bfdbfe;">NIT: ${nitEmpresa}</p>` : ''}
                    ${direccionEmpresa ? `<p style="margin:2px 0 0 0;font-size:13px;color:#bfdbfe;">${direccionEmpresa}</p>` : ''}
                    ${telefonoEmpresa ? `<p style="margin:2px 0 0 0;font-size:13px;color:#bfdbfe;">Tel: ${telefonoEmpresa}</p>` : ''}
                  </td>
                  <td align="right" valign="top">
                    <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">FACTURA</p>
                    <p style="margin:6px 0 0 0;font-size:16px;font-weight:600;color:#93c5fd;"># ${numero}</p>
                    <span style="display:inline-block;margin-top:8px;padding:4px 12px;background:${estadoColor};color:#fff;
                                 border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;">${estado}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DATOS FACTURA + CLIENTE -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Fechas -->
                  <td width="48%" valign="top"
                      style="background:#f8fafc;border-radius:8px;padding:16px 20px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Detalles de Factura</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#6b7280;padding:3px 12px 3px 0;">Fecha de emisión:</td>
                        <td style="font-size:12px;color:#1e293b;font-weight:600;">${fechaEmision}</td>
                      </tr>
                      ${fechaVencimiento ? `<tr>
                        <td style="font-size:12px;color:#6b7280;padding:3px 12px 3px 0;">Fecha vencimiento:</td>
                        <td style="font-size:12px;color:#1e293b;font-weight:600;">${fechaVencimiento}</td>
                      </tr>` : ''}
                      ${cufeHtml}
                    </table>
                  </td>
                  <td width="4%"></td>
                  <!-- Cliente -->
                  <td width="48%" valign="top"
                      style="background:#f8fafc;border-radius:8px;padding:16px 20px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Facturado a</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">${nombreCliente}</p>
                    ${docCliente ? `<p style="margin:3px 0 0 0;font-size:12px;color:#6b7280;">Doc: ${docCliente}</p>` : ''}
                    ${emailCliente ? `<p style="margin:3px 0 0 0;font-size:12px;color:#6b7280;">${emailCliente}</p>` : ''}
                    ${telefonoCliente ? `<p style="margin:3px 0 0 0;font-size:12px;color:#6b7280;">Tel: ${telefonoCliente}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TABLA DE ITEMS -->
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                <!-- Cabecera tabla -->
                <tr style="background:#1e40af;">
                  <th style="padding:11px 14px;font-size:12px;font-weight:600;color:#ffffff;text-align:left;">Producto / Descripción</th>
                  <th style="padding:11px 14px;font-size:12px;font-weight:600;color:#ffffff;text-align:center;">Cant.</th>
                  <th style="padding:11px 14px;font-size:12px;font-weight:600;color:#ffffff;text-align:right;">Precio Unit.</th>
                  <th style="padding:11px 14px;font-size:12px;font-weight:600;color:#ffffff;text-align:center;">Desc.</th>
                  <th style="padding:11px 14px;font-size:12px;font-weight:600;color:#ffffff;text-align:center;">IVA</th>
                  <th style="padding:11px 14px;font-size:12px;font-weight:600;color:#ffffff;text-align:right;">Subtotal</th>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- TOTALES -->
          <tr>
            <td style="padding:16px 40px 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="55%"></td>
                  <td width="45%">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8fafc;border-radius:8px;padding:16px 20px;border:1px solid #e2e8f0;">
                      ${subtotalFactura > 0 ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">Subtotal:</td>
                        <td style="font-size:13px;color:#374151;text-align:right;padding:4px 0;">${formatCOP(subtotalFactura)}</td>
                      </tr>` : ''}
                      ${descuentoTotal > 0 ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">Descuento:</td>
                        <td style="font-size:13px;color:#dc2626;text-align:right;padding:4px 0;">-${formatCOP(descuentoTotal)}</td>
                      </tr>` : ''}
                      ${ivaTotal > 0 ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:4px 0;">IVA:</td>
                        <td style="font-size:13px;color:#374151;text-align:right;padding:4px 0;">${formatCOP(ivaTotal)}</td>
                      </tr>` : ''}
                      <tr>
                        <td colspan="2" style="padding:8px 0 4px 0;border-top:2px solid #e2e8f0;"></td>
                      </tr>
                      <tr>
                        <td style="font-size:16px;font-weight:800;color:#1e293b;padding:2px 0;">TOTAL:</td>
                        <td style="font-size:16px;font-weight:800;color:#1e40af;text-align:right;padding:2px 0;">${formatCOP(total)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PDF LINK (si existe) -->
          ${factura.pdf_url ? `
          <tr>
            <td style="padding:24px 40px 0 40px;text-align:center;">
              ${pdfLinkHtml}
            </td>
          </tr>` : ''}

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 40px 32px 40px;text-align:center;border-top:1px solid #e5e7eb;margin-top:24px;">
              <p style="margin:0;font-size:13px;color:#6b7280;">Gracias por su confianza en <strong>${nombreEmpresa}</strong></p>
              ${emailEmpresa ? `<p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af;">${emailEmpresa}</p>` : ''}
              <p style="margin:12px 0 0 0;font-size:11px;color:#d1d5db;">Este es un correo generado automáticamente. Por favor no responda a este mensaje.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Envía por correo la factura al cliente (o al destinatario especificado).
 *
 * @param {Object} opts
 * @param {Object} opts.factura   - Objeto factura de la BD
 * @param {Object} opts.tenant    - Objeto tenant (empresa)
 * @param {Object} opts.cliente   - Objeto cliente
 * @param {Array}  opts.items     - Array de ítems de la factura
 * @param {string} [opts.emailTo] - Email destino override (por defecto usa cliente.email)
 */
async function enviarFactura({ factura, tenant, cliente, items, emailTo }) {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn('enviarFactura: EMAIL_USER / EMAIL_PASS no configurados. Envío omitido.');
    return { enviado: false, razon: 'Email no configurado' };
  }

  const destinatario = emailTo || cliente.email;
  if (!destinatario) {
    logger.warn('enviarFactura: El cliente no tiene email registrado.', { cliente_id: cliente.id });
    return { enviado: false, razon: 'Cliente sin email' };
  }

  const numero = factura.numero_factura || factura.numero || factura.id;
  const nombreEmpresa = tenant.nombre_empresa || tenant.nombre || 'Carolina SaaS';
  const html = buildFacturaHTML({ factura, tenant, cliente, items });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${nombreEmpresa}" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `Factura #${numero} - ${nombreEmpresa}`,
    html,
    text: `Estimado/a ${cliente.nombre || 'cliente'},\n\nAdjuntamos su factura #${numero} por un total de $${parseFloat(factura.total || 0).toLocaleString('es-CO')} COP.\n\nGracias por confiar en ${nombreEmpresa}.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Factura enviada por email', { factura_id: factura.id, destinatario, messageId: info.messageId });
    return { enviado: true, messageId: info.messageId, destinatario };
  } catch (err) {
    logger.error('Error enviando factura por email', { error: err.message, factura_id: factura.id, destinatario });
    return { enviado: false, razon: err.message };
  }
}

/**
 * Envía alerta de stock bajo al administrador del tenant.
 *
 * @param {Object} opts
 * @param {Object} opts.tenant    - Objeto tenant (debe tener email del admin)
 * @param {Array}  opts.productos - Array de productos con stock bajo/agotado
 */
async function enviarAlertaStock({ tenant, productos }) {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn('enviarAlertaStock: EMAIL_USER / EMAIL_PASS no configurados. Envío omitido.');
    return { enviado: false, razon: 'Email no configurado' };
  }

  if (!productos || productos.length === 0) {
    return { enviado: false, razon: 'Sin productos con stock bajo' };
  }

  const adminEmail = tenant.admin_email || tenant.email || process.env.EMAIL_USER;
  if (!adminEmail) {
    logger.warn('enviarAlertaStock: No hay email de administrador configurado.', { tenant_id: tenant.id });
    return { enviado: false, razon: 'Sin email de administrador' };
  }

  const nombreEmpresa = tenant.nombre_empresa || tenant.nombre || 'Carolina SaaS';

  const filaProductos = productos.map((p, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#fef9f0';
    const agotado = p.stock_actual <= 0;
    const stockColor = agotado ? '#dc2626' : '#d97706';
    const badge = agotado
      ? '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">AGOTADO</span>'
      : '<span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">STOCK BAJO</span>';

    return `
      <tr style="background:${bg};">
        <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${p.nombre}</td>
        <td style="padding:10px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;text-align:center;">${p.codigo || '-'}</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${stockColor};text-align:center;border-bottom:1px solid #e5e7eb;">${p.stock_actual}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:center;border-bottom:1px solid #e5e7eb;">${p.stock_minimo}</td>
        <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #e5e7eb;">${badge}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alerta de Stock Bajo - ${nombreEmpresa}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:620px;">

          <!-- HEADER ALERTA -->
          <tr>
            <td style="background:linear-gradient(135deg,#b45309 0%,#d97706 100%);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">⚠ Alerta de Stock Bajo</p>
                    <p style="margin:6px 0 0 0;font-size:13px;color:#fde68a;">${nombreEmpresa}</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#fef3c7;color:#92400e;padding:6px 16px;
                                 border-radius:20px;font-size:13px;font-weight:700;">
                      ${productos.length} producto${productos.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CUERPO -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">
                Los siguientes productos tienen stock por debajo del nivel mínimo y requieren reposición:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr style="background:#92400e;">
                  <th style="padding:10px 14px;font-size:12px;font-weight:600;color:#fff;text-align:left;">Producto</th>
                  <th style="padding:10px 14px;font-size:12px;font-weight:600;color:#fff;text-align:center;">Código</th>
                  <th style="padding:10px 14px;font-size:12px;font-weight:600;color:#fff;text-align:center;">Stock Actual</th>
                  <th style="padding:10px 14px;font-size:12px;font-weight:600;color:#fff;text-align:center;">Stock Mínimo</th>
                  <th style="padding:10px 14px;font-size:12px;font-weight:600;color:#fff;text-align:center;">Estado</th>
                </tr>
                ${filaProductos}
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 28px 40px;text-align:center;border-top:1px solid #e5e7eb;margin-top:20px;">
              <p style="margin:0;font-size:13px;color:#6b7280;">
                Este reporte fue generado automáticamente por <strong>${nombreEmpresa}</strong>
              </p>
              <p style="margin:6px 0 0 0;font-size:11px;color:#d1d5db;">
                Ingrese al sistema para gestionar los pedidos de reposición.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"${nombreEmpresa}" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `⚠ Alerta Stock Bajo: ${productos.length} producto${productos.length !== 1 ? 's' : ''} requieren reposición - ${nombreEmpresa}`,
    html,
    text: `ALERTA DE STOCK BAJO - ${nombreEmpresa}\n\nProductos con stock bajo o agotado:\n\n${productos.map(p => `- ${p.nombre} (${p.codigo || 'sin código'}): stock actual ${p.stock_actual} / mínimo ${p.stock_minimo}`).join('\n')}\n\nIngrese al sistema para gestionar los pedidos de reposición.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Alerta de stock enviada por email', { tenant_id: tenant.id, adminEmail, productos: productos.length, messageId: info.messageId });
    return { enviado: true, messageId: info.messageId, destinatario: adminEmail, productos: productos.length };
  } catch (err) {
    logger.error('Error enviando alerta de stock por email', { error: err.message, tenant_id: tenant.id });
    return { enviado: false, razon: err.message };
  }
}

module.exports = { enviarFactura, enviarAlertaStock };

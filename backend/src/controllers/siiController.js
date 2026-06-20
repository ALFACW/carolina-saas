// Controller SII Chile — SimpleFactura (Bearer token, sin PFX ni CAF por request)
const { encrypt, decrypt } = require('../lib/crypto');
const sf = require('../lib/billing/simplefactura');
const logger = require('../lib/logger');
const db = require('../db');

// ── Helpers ────────────────────────────────────────────

function _decryptToken(tenant) {
  if (!tenant.simplefactura_token_encrypted)
    throw Object.assign(new Error('Token SimpleFactura no configurado — ve a Configuración SII'), { status: 400 });
  return decrypt(tenant.simplefactura_token_encrypted);
}

async function _getTenantSII(tenantId) {
  const { rows } = await db.query(
    `SELECT id, country, nit, nombre, giro, email, direccion, ciudad,
            simplefactura_token_encrypted, simplefactura_sucursal, simplefactura_ambiente,
            sii_numero_resolucion, sii_fecha_resolucion, sii_unidad
     FROM tenants WHERE id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

// ── GET /api/sii/config ────────────────────────────────

async function getConfiguracion(req, res, next) {
  try {
    const tenant = await _getTenantSII(req.tenant.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

    res.json({
      country:                  tenant.country,
      nit:                      tenant.nit,
      tiene_token:              !!tenant.simplefactura_token_encrypted,
      simplefactura_sucursal:   tenant.simplefactura_sucursal || 'Casa Matriz',
      simplefactura_ambiente:   tenant.simplefactura_ambiente ?? 0,
      sii_numero_resolucion:    tenant.sii_numero_resolucion,
      sii_fecha_resolucion:     tenant.sii_fecha_resolucion,
      sii_unidad:               tenant.sii_unidad,
    });
  } catch (err) { next(err); }
}

// ── PUT /api/sii/config ────────────────────────────────

async function updateConfiguracion(req, res, next) {
  try {
    const { simplefactura_token, simplefactura_sucursal, simplefactura_ambiente,
            sii_numero_resolucion, sii_fecha_resolucion, sii_unidad } = req.body;

    const updates = [];
    const values  = [];
    let idx = 1;

    if (simplefactura_token)    { updates.push(`simplefactura_token_encrypted = $${idx++}`); values.push(encrypt(simplefactura_token)); }
    if (simplefactura_sucursal) { updates.push(`simplefactura_sucursal = $${idx++}`);        values.push(simplefactura_sucursal); }
    if (simplefactura_ambiente !== undefined) { updates.push(`simplefactura_ambiente = $${idx++}`); values.push(simplefactura_ambiente); }
    if (sii_numero_resolucion !== undefined)  { updates.push(`sii_numero_resolucion = $${idx++}`);  values.push(sii_numero_resolucion); }
    if (sii_fecha_resolucion)  { updates.push(`sii_fecha_resolucion = $${idx++}`);  values.push(sii_fecha_resolucion); }
    if (sii_unidad)            { updates.push(`sii_unidad = $${idx++}`);            values.push(sii_unidad); }

    if (!updates.length) return res.json({ success: true });

    values.push(req.tenant.id);
    await db.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── Función pública: emitir DTE Chile desde posController ──
// tipoDte: 39=Boleta, 33=Factura, 52=Guía, 56=Nota débito, 61=Nota crédito
// receptor (obligatorio para 33, 52, 56, 61): { rut, razonSocial, giro?, direccion?, comuna?, correo? }
// items: [{ nombre, cantidad, precio (bruto=con IVA), descuento? }]
// total: monto total con IVA
// Retorna { folio, fechaEmision }

async function emitirDTEChile(client, tenant, { tipoDte, items, total, receptor, fecha }) {
  const token   = _decryptToken(tenant);
  const sucursal = tenant.simplefactura_sucursal || 'Casa Matriz';
  const ambiente = tenant.simplefactura_ambiente ?? 0;
  const fechaStr = fecha || new Date().toISOString().split('T')[0];

  const totales = sf.calcularTotalesDesdeTotal(Math.round(total));

  const emisor = {
    rutEmisor:   tenant.nit,
    razonSocial: tenant.nombre,
    giro:        tenant.giro || 'ACTIVIDAD COMERCIAL',
    correo:      tenant.email || '',
    direccion:   tenant.direccion || '',
    comuna:      tenant.ciudad || '',
  };

  let documento;

  if (tipoDte === 39) {
    // Boleta — precios CON IVA, receptor anónimo
    documento = sf.buildBoleta({
      emisor,
      receptor: receptor || null,
      items: items.map(i => ({
        nombre:    i.nombre,
        cantidad:  i.cantidad,
        precio:    i.precio,         // precio con IVA
        descuento: i.descuento || 0,
        unidad:    i.unidad || 'un',
      })),
      totales,
      fecha: fechaStr,
    });
  } else if (tipoDte === 33) {
    // Factura — precios NETOS (sin IVA)
    if (!receptor?.rut) throw Object.assign(new Error('La factura requiere RUT del receptor'), { status: 400 });
    documento = sf.buildFactura({
      emisor,
      receptor,
      items: items.map(i => ({
        nombre:      i.nombre,
        cantidad:    i.cantidad,
        precioNeto:  Math.round(i.precio / 1.19),  // convertir a neto
        descuento:   i.descuento ? Math.round(i.descuento / 1.19) : 0,
        unidad:      i.unidad || 'un',
      })),
      totales,
      fecha: fechaStr,
    });
  } else {
    throw Object.assign(new Error(`Tipo DTE ${tipoDte} no soportado en esta versión`), { status: 400 });
  }

  const result = await sf.emitirDTE(token, sucursal, documento);
  // result: { tipoDTE, rutEmisor, rutReceptor, folio, fechaEmision, total }

  logger.info(`[SII] DTE ${tipoDte} emitido — folio ${result.folio} tenant ${tenant.id}`);
  return { folio: result.folio, fechaEmision: result.fechaEmision };
}

module.exports = {
  getConfiguracion,
  updateConfiguracion,
  emitirDTEChile,
};

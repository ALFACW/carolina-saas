// Controller SII Chile — gestión de certificado PFX, CAF, config SimpleAPI
const { encrypt, decrypt } = require('../lib/crypto');
const { emitirBoleta, emitirFactura, emitirNotaCredito, generarSobre, enviarSobre } = require('../lib/billing/simpleapi');
const logger = require('../lib/logger');
const db = require('../db');
const xml2js = require('xml2js');

// ── Helpers ────────────────────────────────────────────

async function _getTenantSII(tenantId) {
  const { rows } = await db.query(
    `SELECT id, country, sii_status, cert_pfx_rut,
            cert_pfx_encrypted, cert_pfx_password_encrypted,
            simpleapi_key_encrypted,
            sii_numero_resolucion, sii_fecha_resolucion, sii_unidad,
            rut_empresa, razon_social, giro, direccion, ciudad
     FROM tenants WHERE id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

// Descifra PFX y retorna Buffer listo para SimpleAPI
function _decryptPFX(tenant) {
  if (!tenant.cert_pfx_encrypted) throw Object.assign(new Error('Certificado PFX no configurado'), { status: 400 });
  const pfxBase64 = decrypt(tenant.cert_pfx_encrypted);
  return Buffer.from(pfxBase64, 'base64');
}

function _decryptPassword(tenant) {
  if (!tenant.cert_pfx_password_encrypted) return '';
  return decrypt(tenant.cert_pfx_password_encrypted);
}

function _decryptApiKey(tenant) {
  if (!tenant.simpleapi_key_encrypted) throw Object.assign(new Error('API Key SimpleAPI no configurada'), { status: 400 });
  return decrypt(tenant.simpleapi_key_encrypted);
}

// ── GET /api/sii/config ────────────────────────────────

async function getConfiguracion(req, res, next) {
  try {
    const tenant = await _getTenantSII(req.tenant.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

    const { rows: cafRows } = await db.query(
      `SELECT tipo_dte, folio_desde, folio_hasta, folio_actual, agotado, fecha_autorizacion
       FROM caf_folios WHERE tenant_id = $1 ORDER BY tipo_dte, folio_desde`,
      [req.tenant.id]
    );

    res.json({
      country: tenant.country,
      sii_status: tenant.sii_status,
      cert_pfx_rut: tenant.cert_pfx_rut,
      tiene_certificado: !!tenant.cert_pfx_encrypted,
      tiene_apikey: !!tenant.simpleapi_key_encrypted,
      sii_numero_resolucion: tenant.sii_numero_resolucion,
      sii_fecha_resolucion: tenant.sii_fecha_resolucion,
      sii_unidad: tenant.sii_unidad,
      caf_folios: cafRows,
    });
  } catch (err) { next(err); }
}

// ── PUT /api/sii/config ────────────────────────────────

async function updateConfiguracion(req, res, next) {
  try {
    const { sii_numero_resolucion, sii_fecha_resolucion, sii_unidad, cert_pfx_rut, simpleapi_key } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (sii_numero_resolucion !== undefined) { updates.push(`sii_numero_resolucion = $${idx++}`); values.push(sii_numero_resolucion); }
    if (sii_fecha_resolucion  !== undefined) { updates.push(`sii_fecha_resolucion  = $${idx++}`); values.push(sii_fecha_resolucion); }
    if (sii_unidad            !== undefined) { updates.push(`sii_unidad            = $${idx++}`); values.push(sii_unidad); }
    if (cert_pfx_rut          !== undefined) { updates.push(`cert_pfx_rut          = $${idx++}`); values.push(cert_pfx_rut); }
    if (simpleapi_key) {
      updates.push(`simpleapi_key_encrypted = $${idx++}`);
      values.push(encrypt(simpleapi_key));
    }

    if (!updates.length) return res.json({ success: true });

    values.push(req.tenant.id);
    await db.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ── POST /api/sii/certificado ──────────────────────────
// multipart: file=cert.pfx, body.password

async function subirCertificado(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo PFX' });

    const pfxBase64 = req.file.buffer.toString('base64');
    const password  = req.body.password || '';

    await db.query(
      `UPDATE tenants SET cert_pfx_encrypted = $1, cert_pfx_password_encrypted = $2 WHERE id = $3`,
      [encrypt(pfxBase64), encrypt(password), req.tenant.id]
    );

    logger.info('Certificado PFX actualizado', { tenant_id: req.tenant.id });
    res.json({ success: true, message: 'Certificado guardado correctamente' });
  } catch (err) { next(err); }
}

// ── POST /api/sii/caf ─────────────────────────────────
// multipart: file=caf.xml

async function subirCAF(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo CAF XML' });

    const cafXml = req.file.buffer.toString('utf-8');
    const parsed = await xml2js.parseStringPromise(cafXml);

    const da         = parsed.AUTORIZACION.CAF[0].DA[0];
    const tipoDte    = parseInt(da.TD[0], 10);
    const folioDesde = parseInt(da.RNG[0].D[0], 10);
    const folioHasta = parseInt(da.RNG[0].H[0], 10);
    const fechaAuth  = da.FA[0]; // YYYY-MM-DD

    await db.query(
      `INSERT INTO caf_folios (tenant_id, tipo_dte, folio_desde, folio_hasta, folio_actual, caf_xml, fecha_autorizacion, agotado)
       VALUES ($1,$2,$3,$4,$3,$5,$6,false)
       ON CONFLICT (tenant_id, tipo_dte, folio_desde)
       DO UPDATE SET caf_xml = $5, agotado = false, folio_actual = $3`,
      [req.tenant.id, tipoDte, folioDesde, folioHasta, cafXml, fechaAuth]
    );

    logger.info('CAF subido', { tenant_id: req.tenant.id, tipo_dte: tipoDte, folioDesde, folioHasta });
    res.json({ success: true, tipo_dte: tipoDte, folio_desde: folioDesde, folio_hasta: folioHasta });
  } catch (err) {
    if (err.message?.includes('Cannot read') || err.message?.includes('parseString')) {
      return res.status(400).json({ error: 'El archivo no es un CAF XML válido' });
    }
    next(err);
  }
}

// ── GET /api/sii/folios ───────────────────────────────

async function getCAFFolios(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT tipo_dte, folio_desde, folio_hasta, folio_actual, agotado, fecha_autorizacion,
              (folio_hasta - folio_actual + 1) as disponibles
       FROM caf_folios WHERE tenant_id = $1 ORDER BY tipo_dte, folio_desde`,
      [req.tenant.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Función interna: obtener y reservar próximo folio ─

async function _nextFolio(client, tenantId, tipoDte) {
  // FOR UPDATE garantiza exclusión mutua en concurrencia
  const { rows } = await client.query(
    `SELECT id, folio_actual, folio_hasta, caf_xml
     FROM caf_folios
     WHERE tenant_id=$1 AND tipo_dte=$2 AND agotado=false
     ORDER BY folio_actual ASC LIMIT 1 FOR UPDATE`,
    [tenantId, tipoDte]
  );
  if (!rows.length) throw Object.assign(new Error(`Sin folios CAF disponibles para tipo DTE ${tipoDte}`), { status: 400 });

  const caf = rows[0];
  const folio = caf.folio_actual;
  const agotado = (folio >= caf.folio_hasta);

  await client.query(
    `UPDATE caf_folios SET folio_actual = $1, agotado = $2 WHERE id = $3`,
    [folio + 1, agotado, caf.id]
  );

  return { folio, cafXml: caf.caf_xml };
}

// ── Función pública: emitir DTE Chile (llamada desde posController) ──────────
// Retorna { folio, pdfBase64, xml_firmado, sobre_id }

async function emitirDTEChile(client, tenant, { tipoDte, items, total, receptor, fecha }) {
  const apiKey  = _decryptApiKey(tenant);
  const certBuf = _decryptPFX(tenant);
  const pwd     = _decryptPassword(tenant);

  const { folio, cafXml } = await _nextFolio(client, tenant.id, tipoDte);
  const cafBuf = Buffer.from(cafXml, 'utf-8');

  // Fecha en formato YYYY-MM-DD
  const fechaStr = fecha || new Date().toISOString().split('T')[0];

  const baseParams = {
    rutCertificado: tenant.cert_pfx_rut,
    password: pwd,
    rutEmisor: tenant.rut_empresa,
    razonSocial: tenant.razon_social,
    giro: tenant.giro || 'ACTIVIDAD COMERCIAL',
    direccion: tenant.direccion || '',
    comuna: tenant.ciudad || '',
    folio,
    fecha: fechaStr,
    items,
    totales: {
      MntNeto: Math.round(total / 1.19),
      TasaIVA: 19,
      IVA: Math.round(total - total / 1.19),
      MntTotal: Math.round(total),
    },
  };

  let resultado;
  if (tipoDte === 39) {
    // Boleta electrónica — sin receptor identificado
    resultado = await emitirBoleta(apiKey, baseParams, certBuf, cafBuf);
  } else if (tipoDte === 33) {
    // Factura electrónica — con receptor
    resultado = await emitirFactura(apiKey, {
      ...baseParams,
      actividadEconomica: tenant.actividad_economica || 0,
      receptor,
    }, certBuf, cafBuf);
  } else {
    throw new Error(`Tipo DTE ${tipoDte} no soportado por emitirDTEChile`);
  }

  // Envío al SII (sobre)
  const sobre = await generarSobre(apiKey, {
    rutCertificado: tenant.cert_pfx_rut,
    password: pwd,
    rutEmisor: tenant.rut_empresa,
    ambiente: process.env.SII_AMBIENTE === 'produccion' ? 2 : 1,
    numeroResolucion: tenant.sii_numero_resolucion || 0,
    fechaResolucion: tenant.sii_fecha_resolucion?.toISOString?.().split('T')[0] || fechaStr,
    dtes: [resultado.xml],
  }, certBuf, cafBuf);

  let sobreId = null;
  try {
    const envio = await enviarSobre(apiKey, {
      rutCertificado: tenant.cert_pfx_rut,
      password: pwd,
      rutEmisor: tenant.rut_empresa,
      ambiente: process.env.SII_AMBIENTE === 'produccion' ? 2 : 1,
      tipo: tipoDte === 39 ? 2 : 1, // 2=boleta, 1=factura
    }, sobre.sobre, certBuf, cafBuf);
    sobreId = envio.trackId || null;
  } catch (e) {
    // El envío puede fallar temporalmente — el DTE igual se guarda
    logger.warn('Error enviando sobre al SII (DTE se guardará igual)', { error: e.message });
  }

  return {
    folio,
    pdfBase64: resultado.pdf,
    xml_firmado: resultado.xml,
    sobre_id: sobreId,
  };
}

module.exports = {
  getConfiguracion,
  updateConfiguracion,
  subirCertificado,
  subirCAF,
  getCAFFolios,
  emitirDTEChile,
};

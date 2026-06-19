// Cliente SimpleAPI — Facturación Electrónica SII Chile
// REST API: generación, timbraje, firma y envío al SII son server-side (no requiere SDK ni Windows)
// Multi-RUT: un API key soporta múltiples RUT — el RUT emisor va dentro del payload de cada DTE
// Certificado digital: centralizado en servidores de SimpleAPI (se sube una vez por empresa)
// CarolinaPOS guarda XML y PDF en tabla dte_documents (SimpleAPI no almacena documentos)
// Documentación: documentacion.simpleapi.cl (requiere cuenta gratuita)

const axios = require('axios');
const logger = require('../logger');

const BASE_URL = 'https://api.simpleapi.cl/api';

// Tipos de DTE soportados
const TIPO_DTE = {
  FACTURA:        33,
  FACTURA_EXENTA: 34,
  BOLETA:         39,
  GUIA_DESPACHO:  52,
  NOTA_DEBITO:    56,
  NOTA_CREDITO:   61,
};

// ──────────────────────────────────────────────
// Autenticación — token JWT con vida de 24h
// GET /api/auth/token  body: { apikey }  → texto plano con el JWT
// ──────────────────────────────────────────────
const _tokenCache = {}; // { apiKey → { token, expiresAt } }

async function getToken(apiKey) {
  const cached = _tokenCache[apiKey];
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const res = await axios.get(`${BASE_URL}/auth/token`, {
    headers: { 'Content-Type': 'application/json' },
    data: { apikey: apiKey },          // GET con body — así lo documenta SimpleAPI
  });

  const token = typeof res.data === 'string' ? res.data.trim() : res.data;
  _tokenCache[apiKey] = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }; // 23h por seguridad
  return token;
}

async function getHeaders(apiKey) {
  const token = await getToken(apiKey);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ──────────────────────────────────────────────
// Validación RUT chileno (Módulo 11)
// ──────────────────────────────────────────────
function validarRUT(rut) {
  if (!rut) return false;
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0, factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const expected = 11 - (sum % 11);
  const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === dvCalc;
}

// ──────────────────────────────────────────────
// Formatear RUT: 12345678 → 12.345.678-9
// ──────────────────────────────────────────────
function formatRUT(rut) {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

// ──────────────────────────────────────────────
// FOLIOS — SimpleAPI Folios (producto separado)
// Certificado digital debe estar centralizado en servidores SimpleAPI previamente
// TODO: confirmar paths exactos en documentacion.simpleapi.cl → SimpleAPI Folios
// ──────────────────────────────────────────────

async function obtenerFolio(apiKey, rutEmisor, tipoDte) {
  const res = await axios.post(
    `${BASE_URL}/folios/obtener`,        // TODO: confirmar path
    { rut_emisor: rutEmisor, tipo_dte: tipoDte },
    { headers: getHeaders(apiKey) }
  );
  // Respuesta esperada: { caf_xml, folio_desde, folio_hasta, fecha_autorizacion }
  return res.data;
}

async function consultarFolios(apiKey, rutEmisor, tipoDte) {
  const res = await axios.get(
    `${BASE_URL}/folios/disponibles`,    // TODO: confirmar path
    { params: { rut_emisor: rutEmisor, tipo_dte: tipoDte }, headers: getHeaders(apiKey) }
  );
  return res.data;
}

async function anularFolio(apiKey, rutEmisor, tipoDte, folio) {
  const res = await axios.post(
    `${BASE_URL}/folios/anular`,         // TODO: confirmar path
    { rut_emisor: rutEmisor, tipo_dte: tipoDte, folio },
    { headers: getHeaders(apiKey) }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// EMISIÓN DTE — SimpleAPI DTE
// Server-side: SimpleAPI genera XML, timbra, firma y envía al SII
// CarolinaPOS recibe xml_firmado + pdf_base64 y los guarda en dte_documents
// TODO: confirmar paths exactos en documentacion.simpleapi.cl → SimpleAPI DTE
// ──────────────────────────────────────────────

// Boleta (39) — ventas POS a consumidor final, sin RUT receptor obligatorio
async function emitirBoleta(apiKey, { rutEmisor, razonSocialEmisor, giroEmisor, folio, items, totales, ambiente = 'produccion' }) {
  const payload = {
    ambiente,                            // 'certificacion' | 'produccion'
    tipo_dte: TIPO_DTE.BOLETA,
    emisor: {
      rut:          rutEmisor,
      razon_social: razonSocialEmisor,
      giro:         giroEmisor,
    },
    folio,
    detalle: items.map((item, i) => ({
      nro_linea:   i + 1,
      nombre:      item.nombre,
      cantidad:    item.cantidad,
      precio:      item.precio_unitario,
      monto_item:  Math.round(item.cantidad * item.precio_unitario),
    })),
    totales: {
      monto_neto:  totales.neto,
      iva:         totales.iva,
      monto_total: totales.total,
    },
  };

  const res = await axios.post(`${BASE_URL}/dte/emitir`, payload, { headers: getHeaders(apiKey) });
  logger.info(`[SimpleAPI] Boleta emitida — folio ${folio} RUT ${rutEmisor}`);
  return res.data; // { xml_firmado, pdf_base64, folio, track_id, ... }
}

// Factura (33) — ventas B2B con RUT receptor obligatorio + giro + dirección
async function emitirFactura(apiKey, { rutEmisor, razonSocialEmisor, giroEmisor, folio, receptor, items, totales, ambiente = 'produccion' }) {
  const payload = {
    ambiente,
    tipo_dte: TIPO_DTE.FACTURA,
    emisor: {
      rut:          rutEmisor,
      razon_social: razonSocialEmisor,
      giro:         giroEmisor,
    },
    folio,
    receptor: {
      rut:          receptor.rut,
      razon_social: receptor.razonSocial,
      giro:         receptor.giro,       // obligatorio en factura 33
      direccion:    receptor.direccion,  // obligatorio en factura 33
      ciudad:       receptor.ciudad,     // obligatorio en factura 33
    },
    detalle: items.map((item, i) => ({
      nro_linea:   i + 1,
      nombre:      item.nombre,
      cantidad:    item.cantidad,
      precio:      item.precio_unitario,
      monto_item:  Math.round(item.cantidad * item.precio_unitario),
    })),
    totales: {
      monto_neto:  totales.neto,
      iva:         totales.iva,
      monto_total: totales.total,
    },
  };

  const res = await axios.post(`${BASE_URL}/dte/emitir`, payload, { headers: getHeaders(apiKey) });
  logger.info(`[SimpleAPI] Factura emitida — folio ${folio} RUT emisor ${rutEmisor}`);
  return res.data;
}

// Nota de crédito (61) — anula o corrige un DTE anterior
async function emitirNotaCredito(apiKey, { rutEmisor, razonSocialEmisor, giroEmisor, folio, dteReferencia, motivo, totales, ambiente = 'produccion' }) {
  const payload = {
    ambiente,
    tipo_dte: TIPO_DTE.NOTA_CREDITO,
    emisor: {
      rut:          rutEmisor,
      razon_social: razonSocialEmisor,
      giro:         giroEmisor,
    },
    folio,
    referencia: {
      tipo_dte_ref: dteReferencia.tipoDte,
      folio_ref:    dteReferencia.folio,
      motivo,
    },
    totales: {
      monto_neto:  totales.neto,
      iva:         totales.iva,
      monto_total: totales.total,
    },
  };

  const res = await axios.post(`${BASE_URL}/dte/emitir`, payload, { headers: getHeaders(apiKey) });
  return res.data;
}

// Consultar estado de un DTE enviado al SII (track_id devuelto en emitir)
async function consultarEstadoDTE(apiKey, rutEmisor, trackId) {
  const res = await axios.get(
    `${BASE_URL}/dte/estado`,            // TODO: confirmar path
    { params: { rut_emisor: rutEmisor, track_id: trackId }, headers: getHeaders(apiKey) }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// RCV — Registro de Compras y Ventas
// Útil para módulo contable: cruza lo emitido vs lo registrado en SII
// POST /api/RCV/ventas/DD/MM/AA  o  /MM/AA
// POST /api/RCV/compras/DD/MM/AA o  /MM/AA
// ──────────────────────────────────────────────

async function getRCVVentas(apiKey, rutEmisor, mes, anio) {
  const headers = await getHeaders(apiKey);
  const res = await axios.post(
    `${BASE_URL}/RCV/ventas/${mes}/${anio}`,
    { rut: rutEmisor },
    { headers }
  );
  return res.data;
}

async function getRCVCompras(apiKey, rutEmisor, mes, anio) {
  const headers = await getHeaders(apiKey);
  const res = await axios.post(
    `${BASE_URL}/RCV/compras/${mes}/${anio}`,
    { rut: rutEmisor },
    { headers }
  );
  return res.data;
}

module.exports = {
  TIPO_DTE,
  validarRUT,
  formatRUT,
  getToken,
  obtenerFolio,
  consultarFolios,
  anularFolio,
  emitirBoleta,
  emitirFactura,
  emitirNotaCredito,
  consultarEstadoDTE,
  getRCVVentas,
  getRCVCompras,
};

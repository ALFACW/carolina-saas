// Cliente SimpleAPI — Facturación Electrónica SII Chile
// Documentación: documentacion.simpleapi.cl
// Multi-RUT: el RUT emisor va dentro del payload de cada DTE
// SimpleAPI NO almacena documentos — CarolinaPOS guarda XML y PDF en dte_documents

const axios = require('axios');
const logger = require('../logger');

const BASE_URL = 'https://api.simpleapi.cl'; // confirmar URL exacta en documentacion.simpleapi.cl

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
// Autenticación
// ──────────────────────────────────────────────
function getHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
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
// FOLIOS — SimpleAPI Folios
// TODO: confirmar endpoints exactos en documentacion.simpleapi.cl → SimpleAPI Folios
// ──────────────────────────────────────────────

async function obtenerFolio(apiKey, rutEmisor, tipoDte) {
  const res = await axios.post(
    `${BASE_URL}/folios/obtener`, // confirmar path
    { rut_emisor: rutEmisor, tipo_dte: tipoDte },
    { headers: getHeaders(apiKey) }
  );
  return res.data; // { caf_xml, folio_desde, folio_hasta, fecha_autorizacion }
}

async function consultarFolios(apiKey, rutEmisor, tipoDte) {
  const res = await axios.get(
    `${BASE_URL}/folios/disponibles`, // confirmar path
    { params: { rut_emisor: rutEmisor, tipo_dte: tipoDte }, headers: getHeaders(apiKey) }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// EMISIÓN DTE — SimpleAPI DTE
// TODO: confirmar endpoints exactos en documentacion.simpleapi.cl → SimpleAPI DTE
// ──────────────────────────────────────────────

/**
 * Emite una boleta electrónica (tipo 39) — ventas POS a consumidor final
 * El receptor es opcional (sin RUT obligatorio)
 */
async function emitirBoleta(apiKey, { rutEmisor, razonSocialEmisor, folio, cafXml, items, totales }) {
  const payload = {
    tipo_dte: TIPO_DTE.BOLETA,
    rut_emisor: rutEmisor,
    razon_social_emisor: razonSocialEmisor,
    folio,
    caf_xml: cafXml,
    detalle: items.map((item, i) => ({
      nro_linea:   i + 1,
      descripcion: item.nombre,
      cantidad:    item.cantidad,
      precio:      item.precio_unitario,
    })),
    totales: {
      monto_neto: totales.neto,
      iva:        totales.iva,
      monto_total: totales.total,
    },
  };

  const res = await axios.post(
    `${BASE_URL}/dte/emitir`, // confirmar path
    payload,
    { headers: getHeaders(apiKey) }
  );

  logger.info(`[SimpleAPI] Boleta emitida — folio ${folio} RUT ${rutEmisor}`);
  return res.data; // { xml_firmado, pdf_base64, folio, ... }
}

/**
 * Emite una factura electrónica (tipo 33) — ventas B2B con RUT receptor
 */
async function emitirFactura(apiKey, { rutEmisor, razonSocialEmisor, folio, cafXml, receptor, items, totales }) {
  const payload = {
    tipo_dte: TIPO_DTE.FACTURA,
    rut_emisor: rutEmisor,
    razon_social_emisor: razonSocialEmisor,
    folio,
    caf_xml: cafXml,
    receptor: {
      rut:         receptor.rut,
      razon_social: receptor.razonSocial,
      giro:        receptor.giro,
      direccion:   receptor.direccion,
      ciudad:      receptor.ciudad,
    },
    detalle: items.map((item, i) => ({
      nro_linea:   i + 1,
      descripcion: item.nombre,
      cantidad:    item.cantidad,
      precio:      item.precio_unitario,
    })),
    totales: {
      monto_neto:  totales.neto,
      iva:         totales.iva,
      monto_total: totales.total,
    },
  };

  const res = await axios.post(
    `${BASE_URL}/dte/emitir`, // confirmar path
    payload,
    { headers: getHeaders(apiKey) }
  );

  logger.info(`[SimpleAPI] Factura emitida — folio ${folio} RUT emisor ${rutEmisor}`);
  return res.data;
}

/**
 * Emite nota de crédito (tipo 61) — anulación o descuento sobre DTE anterior
 */
async function emitirNotaCredito(apiKey, { rutEmisor, razonSocialEmisor, folio, cafXml, dteReferencia, motivo, totales }) {
  const payload = {
    tipo_dte: TIPO_DTE.NOTA_CREDITO,
    rut_emisor: rutEmisor,
    razon_social_emisor: razonSocialEmisor,
    folio,
    caf_xml: cafXml,
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

  const res = await axios.post(
    `${BASE_URL}/dte/emitir`, // confirmar path
    payload,
    { headers: getHeaders(apiKey) }
  );

  return res.data;
}

module.exports = {
  TIPO_DTE,
  validarRUT,
  formatRUT,
  obtenerFolio,
  consultarFolios,
  emitirBoleta,
  emitirFactura,
  emitirNotaCredito,
};

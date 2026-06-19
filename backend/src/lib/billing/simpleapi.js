// Cliente SimpleAPI — Facturación Electrónica SII Chile (Chilesystems)
// Documentación: documentacion.simpleapi.cl
//
// ARQUITECTURA CLAVE:
//   - Auth: Authorization: <apikey>  (no Bearer token — apikey va directo en el header)
//   - DTE: POST /api/v1/dte/generar  multipart/form-data: input(JSON) + files(PFX) + files2(CAF XML)
//   - Folios: POST servicios.simpleapi.cl/api/folios/...  multipart: input(JSON) + files(PFX)
//   - SimpleAPI NO guarda certificados ni CAF — se suben en CADA request
//   - CarolinaPOS guarda PFX (cifrado) y CAF XML en DB y los adjunta por request

const axios = require('axios');
const FormData = require('form-data');
const logger = require('../logger');

const DTE_BASE    = 'https://api.simpleapi.cl/api/v1';
const FOLIOS_BASE = 'https://servicios.simpleapi.cl/api';
const RUT_BASE    = 'https://rut.simpleapi.cl';

const TIPO_DTE = {
  FACTURA:        33,
  FACTURA_EXENTA: 34,
  BOLETA:         39,
  BOLETA_EXENTA:  41,
  GUIA_DESPACHO:  52,
  NOTA_DEBITO:    56,
  NOTA_CREDITO:   61,
};

// ──────────────────────────────────────────────
// Auth — apikey va directo en el header Authorization
// NO se necesita exchange por token — SimpleAPI acepta la apikey directamente
// ──────────────────────────────────────────────
function getHeaders(apiKey) {
  return { 'Authorization': apiKey };
}

// ──────────────────────────────────────────────
// Multipart builder
// json     → campo "input"
// certBuf  → campo "files"  (PFX binario)
// cafBuf   → campo "files2" (CAF XML, solo para DTE)
// ──────────────────────────────────────────────
function buildForm(json, certBuf, cafBuf) {
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  if (cafBuf) {
    form.append('files2', cafBuf, { filename: 'caf.xml', contentType: 'application/xml' });
  }
  return form;
}

// ──────────────────────────────────────────────
// Validación RUT chileno (Módulo 11, soporta dígito K)
// ──────────────────────────────────────────────
function validarRUT(rut) {
  if (!rut) return false;
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0, factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const r = 11 - (sum % 11);
  const dvCalc = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return dv === dvCalc;
}

// Formatea RUT: "12345678-9" o "12345678K" → "12.345.678-9"
function formatRUT(rut) {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  const body  = clean.slice(0, -1);
  const dv    = clean.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

// ──────────────────────────────────────────────
// FOLIOS — SimpleAPI Folios (servicios.simpleapi.cl)
// certBuf = Buffer con el archivo PFX del certificado digital
// Ambiente: 0 = certificación, 1 = producción
// ──────────────────────────────────────────────

// Obtener CAF para un tipo de DTE (40-80 segundos de respuesta normal)
async function obtenerFolios(apiKey, { rutCertificado, password, rutEmpresa, tipoDte, cantidad, ambiente = 1 }, certBuf) {
  const form = buildForm({ RutCertificado: rutCertificado, Password: password, RutEmpresa: rutEmpresa, Ambiente: ambiente }, certBuf);
  const res = await axios.post(
    `${FOLIOS_BASE}/folios/get/${tipoDte}/${cantidad}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // Respuesta: CAF en formato XML (string o base64)
  return res.data;
}

// Consultar cuántos folios están disponibles para solicitar
async function consultarFoliosDisponibles(apiKey, { rutCertificado, password, rutEmpresa, tipoDte, ambiente = 1 }, certBuf) {
  const form = buildForm({ RutCertificado: rutCertificado, Password: password, RutEmpresa: rutEmpresa, Ambiente: ambiente }, certBuf);
  const res = await axios.post(
    `${FOLIOS_BASE}/folios/get/${tipoDte}/`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// Consultar uso y estado de folios desde una fecha
async function consultarUsoFolios(apiKey, { rutCertificado, password, rutEmpresa, tipoDte, fechaDesde, ambiente = 1 }, certBuf) {
  const form = buildForm({ RutCertificado: rutCertificado, Password: password, RutEmpresa: rutEmpresa, Ambiente: ambiente }, certBuf);
  const res = await axios.post(
    `${FOLIOS_BASE}/folios/consulta/${tipoDte}/${fechaDesde}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// Anular rango de folios
async function anularFolios(apiKey, { rutCertificado, password, rutEmpresa, tipoDte, desde, hasta, ambiente = 1 }, certBuf) {
  const form = buildForm({ RutCertificado: rutCertificado, Password: password, RutEmpresa: rutEmpresa, Ambiente: ambiente }, certBuf);
  const res = await axios.post(
    `${FOLIOS_BASE}/folios/anulacion/${tipoDte}/${desde}/${hasta}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// DTE — Emisión de documentos tributarios
// POST https://api.simpleapi.cl/api/v1/dte/generar
// multipart/form-data: input(JSON) + files(PFX) + files2(CAF XML)
//
// IVA Chile = 19% (igual Colombia), pero:
//   Boleta:  Precio = precio CON IVA, MontoNeto = total/1.19 (API lo acepta así)
//   Factura: Precio = precio SIN IVA, MontoNeto = suma ítems antes de IVA
// ──────────────────────────────────────────────

// Boleta electrónica (39) — venta a consumidor final
// precios en items van CON IVA incluido (como llegan desde el POS)
// certBuf = Buffer PFX | cafBuf = Buffer CAF XML del tipo 39
async function emitirBoleta(apiKey, { rutEmisor, razonSocial, giro, direccion, comuna, folio, fecha, items, totales }, certBuf, cafBuf) {
  const doc = {
    Documento: {
      Encabezado: {
        IdentificacionDTE: {
          TipoDTE: TIPO_DTE.BOLETA,
          Folio: folio,
          FechaEmision: fecha,           // "YYYY-MM-DD"
          IndicadorServicio: 3,          // 3 = ventas y servicios (más común para POS)
        },
        Emisor: {
          Rut: rutEmisor,
          RazonSocialBoleta: razonSocial, // campo distinto al de factura
          GiroBoleta: giro,
          DireccionOrigen: direccion,
          ComunaOrigen: comuna,
        },
        Receptor: {
          Rut: '66666666-6',              // RUT anónimo cuando no hay identificación de cliente
          RazonSocial: 'Sin identificar',
          Direccion: '',
          Comuna: '',
        },
        Totales: {
          MontoNeto:  totales.neto,       // total / 1.19
          IVA:        totales.iva,        // total - neto
          MontoTotal: totales.total,      // precio con IVA (el que paga el cliente)
        },
      },
      Detalles: items.map((item, i) => ({
        IndicadorExento: 0,
        Nombre:          item.nombre,
        Descripcion:     item.descripcion || '',
        Cantidad:        item.cantidad,
        UnidadMedida:    'un',
        Precio:          item.precio,       // precio CON IVA
        Descuento:       item.descuento || 0,
        Recargo:         0,
        MontoItem:       Math.round(item.cantidad * item.precio - (item.descuento || 0)),
      })),
    },
    Certificado: {
      Rut:      rutEmisor,
      Password: '', // SimpleAPI usa el PFX file — password va acá si el PFX tiene uno
    },
  };

  const form = buildForm(doc, certBuf, cafBuf);
  const res = await axios.post(
    `${DTE_BASE}/dte/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  logger.info(`[SimpleAPI] Boleta emitida — folio ${folio} RUT ${rutEmisor}`);
  return res.data;
}

// Factura electrónica (33) — venta B2B con receptor identificado
// precios en items van SIN IVA (neto)
async function emitirFactura(apiKey, { rutEmisor, razonSocial, giro, actividadEconomica, direccion, comuna, folio, fecha, receptor, items, totales, formaPago = 1 }, certBuf, cafBuf) {
  const doc = {
    Documento: {
      Encabezado: {
        IdentificacionDTE: {
          TipoDTE: TIPO_DTE.FACTURA,
          Folio:   folio,
          FechaEmision: fecha,
          FormaPago: formaPago,           // 1=Contado, 2=Crédito, 3=Sin costo
        },
        Emisor: {
          Rut:               rutEmisor,
          RazonSocial:       razonSocial,
          Giro:              giro,
          ActividadEconomica: Array.isArray(actividadEconomica) ? actividadEconomica : [actividadEconomica],
          DireccionOrigen:   direccion,
          ComunaOrigen:      comuna,
          Telefono:          [],
        },
        Receptor: {
          Rut:         receptor.rut,
          RazonSocial: receptor.razonSocial,
          Direccion:   receptor.direccion,
          Comuna:      receptor.comuna,
          Giro:        receptor.giro,
          Contacto:    receptor.contacto || '',
        },
        Totales: {
          MontoNeto:  totales.neto,
          TasaIVA:    19,
          IVA:        totales.iva,
          MontoTotal: totales.total,
        },
      },
      Detalles: items.map((item) => ({
        IndicadorExento: 0,
        Nombre:          item.nombre,
        Descripcion:     item.descripcion || '',
        Cantidad:        item.cantidad,
        UnidadMedida:    'un',
        Precio:          item.precioNeto,  // precio SIN IVA
        Descuento:       item.descuento || 0,
        Recargo:         0,
        MontoItem:       Math.round(item.cantidad * item.precioNeto - (item.descuento || 0)),
      })),
      Referencias:        [],
      DescuentosRecargos: [],
    },
    Certificado: {
      Rut:      rutEmisor,
      Password: '',
    },
  };

  const form = buildForm(doc, certBuf, cafBuf);
  const res = await axios.post(
    `${DTE_BASE}/dte/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  logger.info(`[SimpleAPI] Factura 33 emitida — folio ${folio} RUT emisor ${rutEmisor}`);
  return res.data;
}

// Nota de crédito (61) — anula o ajusta un DTE anterior
async function emitirNotaCredito(apiKey, { rutEmisor, razonSocial, giro, folio, fecha, receptor, dteReferencia, motivo, items, totales }, certBuf, cafBuf) {
  const doc = {
    Documento: {
      Encabezado: {
        IdentificacionDTE: {
          TipoDTE: TIPO_DTE.NOTA_CREDITO,
          Folio:   folio,
          FechaEmision: fecha,
        },
        Emisor: {
          Rut:         rutEmisor,
          RazonSocial: razonSocial,
          Giro:        giro,
        },
        Receptor: {
          Rut:         receptor.rut,
          RazonSocial: receptor.razonSocial,
          Direccion:   receptor.direccion || '',
          Comuna:      receptor.comuna    || '',
          Giro:        receptor.giro      || '',
        },
        Totales: {
          MontoNeto:  totales.neto,
          TasaIVA:    19,
          IVA:        totales.iva,
          MontoTotal: totales.total,
        },
      },
      Detalles: items.map((item) => ({
        IndicadorExento: 0,
        Nombre:          item.nombre,
        Cantidad:        item.cantidad,
        Precio:          item.precioNeto,
        Descuento:       0,
        Recargo:         0,
        MontoItem:       Math.round(item.cantidad * item.precioNeto),
      })),
      Referencias: [{
        TipoDocumento:   String(dteReferencia.tipoDte),
        Folio:           dteReferencia.folio,
        FechaDocumento:  dteReferencia.fecha,
        RazonReferencia: motivo,
      }],
    },
    Certificado: {
      Rut:      rutEmisor,
      Password: '',
    },
  };

  const form = buildForm(doc, certBuf, cafBuf);
  const res = await axios.post(
    `${DTE_BASE}/dte/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// RUT — Lookup contribuyente en SII
// GET https://rut.simpleapi.cl/v2/{RUT}
// Auth: Authorization: <apikey>
// Respuesta: { rut, razonSocial, actividadesEconomicas[{codigo,descripcion,afectaIVA}],
//              domicilios[{direccion,ciudad,comuna}], presentaInicioActividades, ... }
// Puede tardar hasta 90 segundos si el SII tiene cola de espera
// ──────────────────────────────────────────────
async function buscarContribuyente(apiKey, rut) {
  const rutLimpio = rut.replace(/\./g, '');
  const res = await axios.get(`${RUT_BASE}/v2/${rutLimpio}`, {
    headers: getHeaders(apiKey),
    timeout: 100000, // SII puede tardar hasta 90s
  });
  return res.data;
}

// ──────────────────────────────────────────────
// Suscripción — estado del plan
// GET https://api.simpleapi.cl/api/v1/suscripcion/status
// Respuesta: [{ servicio, uso, maximo, respaldos }]
// ──────────────────────────────────────────────
async function consultarSuscripcion(apiKey) {
  const res = await axios.get(`${DTE_BASE}/suscripcion/status`, {
    headers: getHeaders(apiKey),
  });
  return res.data;
}

// ──────────────────────────────────────────────
// RCV — Registro de Compras y Ventas (para módulo contable futuro)
// POST servicios.simpleapi.cl/api/RCV/ventas/MM/AA
// POST servicios.simpleapi.cl/api/RCV/compras/MM/AA
// ──────────────────────────────────────────────
async function getRCVVentas(apiKey, rutEmisor, mes, anio) {
  const res = await axios.post(
    `${FOLIOS_BASE}/RCV/ventas/${mes}/${anio}`,
    { rut: rutEmisor },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data;
}

async function getRCVCompras(apiKey, rutEmisor, mes, anio) {
  const res = await axios.post(
    `${FOLIOS_BASE}/RCV/compras/${mes}/${anio}`,
    { rut: rutEmisor },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// Helpers de cálculo IVA Chile (19%)
// En boleta: precio incluye IVA → calcular neto desde el total
// En factura: precio es neto → calcular IVA sobre el total neto
// ──────────────────────────────────────────────
function calcularTotalesDesdeTotal(montoConIVA) {
  const neto  = Math.round(montoConIVA / 1.19);
  const iva   = montoConIVA - neto;
  return { neto, iva, total: montoConIVA };
}

function calcularTotalesDesdeNeto(montoNeto) {
  const iva   = Math.round(montoNeto * 0.19);
  const total = montoNeto + iva;
  return { neto: montoNeto, iva, total };
}

module.exports = {
  TIPO_DTE,
  validarRUT,
  formatRUT,
  getHeaders,
  buscarContribuyente,
  consultarSuscripcion,
  obtenerFolios,
  consultarFoliosDisponibles,
  consultarUsoFolios,
  anularFolios,
  emitirBoleta,
  emitirFactura,
  emitirNotaCredito,
  getRCVVentas,
  getRCVCompras,
  calcularTotalesDesdeTotal,
  calcularTotalesDesdeNeto,
};

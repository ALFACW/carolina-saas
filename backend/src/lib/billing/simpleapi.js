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
  LIQUIDACION:    43,
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
  // Ambos archivos usan el mismo campo "files" (curl confirma: dos --form 'files=@...')
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  if (cafBuf) {
    form.append('files', cafBuf, { filename: 'caf.xml', contentType: 'application/xml' });
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
// POST servicios.simpleapi.cl/api/folios/anulacion/{tipoDte}/{desde}/{hasta}
// Respuesta: [{ exito, mensaje, folioInicialCAF, folioFinalCAF }]
async function anularFolios(apiKey, { rutCertificado, password, rutEmpresa, tipoDte, desde, hasta, motivo = 'Anulación', ambiente = 1 }, certBuf) {
  const json = {
    RutCertificado: rutCertificado,
    Password:       password,
    RutEmpresa:     rutEmpresa,
    Ambiente:       ambiente,
    MotivoAnulacion: motivo,
  };
  const form = buildForm(json, certBuf);
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
// rutCertificado: RUT del dueño del PFX (persona, puede diferir del RUT empresa)
// certBuf = Buffer PFX | cafBuf = Buffer CAF XML del tipo 39
async function emitirBoleta(apiKey, { rutCertificado, password = '', rutEmisor, razonSocial, giro, direccion, comuna, folio, fecha, items, totales }, certBuf, cafBuf) {
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
      Detalles: items.map((item) => ({
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
      Rut:      rutCertificado, // RUT del titular del PFX (no necesariamente el emisor)
      Password: password,
    },
  };

  const form = buildForm(doc, certBuf, cafBuf);
  const res = await axios.post(
    `${DTE_BASE}/dte/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  logger.info(`[SimpleAPI] Boleta emitida — folio ${folio} RUT ${rutEmisor}`);
  // Respuesta: XML firmado del DTE (string iso-8859-1)
  // Guardar en dte_documents.xml_firmado — es el documento oficial
  return res.data;
}

// Factura electrónica (33) — venta B2B con receptor identificado
// precios en items van SIN IVA (neto)
// rutCertificado: RUT del dueño del PFX (persona, puede diferir del RUT empresa)
// descuentosRecargos: [{ TipoMovimiento: 'Descuento'|'Recargo', Descripcion, TipoValor: 'Pesos'|'Porcentaje', Valor }]
// referencias: [{ TipoDocumento, Folio, FechaDocumento, RazonReferencia }]
async function emitirFactura(apiKey, {
  rutCertificado, password = '', rutEmisor, razonSocial, giro, actividadEconomica,
  direccion, comuna, folio, fecha, receptor, items, totales,
  formaPago = 1, fechaVencimiento = null,
  descuentosRecargos = [], referencias = [],
}, certBuf, cafBuf) {
  const identificacion = {
    TipoDTE:      TIPO_DTE.FACTURA,
    Folio:        folio,
    FechaEmision: fecha,
    FormaPago:    formaPago, // 1=Contado, 2=Crédito, 3=Sin costo
  };
  if (fechaVencimiento) identificacion.FechaVencimiento = fechaVencimiento;

  const doc = {
    Documento: {
      Encabezado: {
        IdentificacionDTE: identificacion,
        Emisor: {
          Rut:                rutEmisor,
          RazonSocial:        razonSocial,
          Giro:               giro,
          ActividadEconomica: Array.isArray(actividadEconomica) ? actividadEconomica : [actividadEconomica],
          DireccionOrigen:    direccion,
          ComunaOrigen:       comuna,
          Telefono:           [],
        },
        Receptor: {
          Rut:         receptor.rut,
          RazonSocial: receptor.razonSocial,
          Direccion:   receptor.direccion,
          Comuna:      receptor.comuna,
          Giro:        receptor.giro,
          Contacto:    receptor.contacto || '',
        },
        RutSolicitante: '',
        Transporte:     null,
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
      Referencias:        referencias,
      DescuentosRecargos: descuentosRecargos,
    },
    Certificado: {
      Rut:      rutCertificado, // RUT del titular del PFX (no necesariamente el emisor)
      Password: password,
    },
  };

  const form = buildForm(doc, certBuf, cafBuf);
  const res = await axios.post(
    `${DTE_BASE}/dte/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  logger.info(`[SimpleAPI] Factura 33 emitida — folio ${folio} RUT emisor ${rutEmisor}`);
  // Respuesta: XML firmado del DTE (string iso-8859-1) — misma estructura que boleta
  return res.data;
}

// Nota de crédito (61) — anula o ajusta un DTE anterior
// rutCertificado: RUT del dueño del PFX (persona, puede diferir del RUT empresa)
async function emitirNotaCredito(apiKey, { rutCertificado, password = '', rutEmisor, razonSocial, giro, folio, fecha, receptor, dteReferencia, motivo, items, totales }, certBuf, cafBuf) {
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
      Rut:      rutCertificado, // RUT del titular del PFX
      Password: password,
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
// SOBRE DE ENVÍO — Empaqueta el DTE para envío al SII
// POST https://api.simpleapi.cl/api/v1/envio/generar
// multipart: input(JSON) + files(PFX) + files(DTE XML del paso anterior)
//
// RutReceptor:
//   Boleta (39): '60803000-K' (RUT del SII — receptor siempre es el SII)
//   Factura (33): RUT real del receptor
//
// NumeroResolucion: 0 en certificación, número real en producción
// ──────────────────────────────────────────────
async function generarSobre(apiKey, { rutCertificado, password, rutEmisor, rutReceptor, fechaResolucion, numeroResolucion }, certBuf, dteXmlBuf) {
  const json = {
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
    Caratula: {
      RutEmisor:        rutEmisor,
      RutReceptor:      rutReceptor,      // '60803000-K' para boletas
      FechaResolucion:  fechaResolucion,  // 'YYYY-MM-DD' de la resolución SII
      NumeroResolucion: numeroResolucion, // 0 en certificación
    },
  };

  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  form.append('files', dteXmlBuf, { filename: 'dte.xml', contentType: 'application/xml' });

  const res = await axios.post(
    `${DTE_BASE}/envio/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // Respuesta: EnvioDTE XML firmado — listo para enviar al SII
  return res.data;
}

// ──────────────────────────────────────────────
// ENVIAR AL SII — Envía el EnvioDTE (sobre) al SII y obtiene TrackID
// POST https://api.simpleapi.cl/api/v1/envio/enviar
// multipart: input(JSON) + files(PFX) + files(EnvioDTE XML del paso anterior)
//
// Tipo: 2 = boleta, 1 = factura/otros DTE (por confirmar si hay más valores)
// Ambiente: 0 = certificación, 1 = producción
//
// Respuesta JSON: { trackId, estado, ok, rutEnvia, rutEmpresa, fecha, glosa, errores }
//   estado 'REC' = recibido por SII (aún no validado — usar consultarEstadoEnvio para seguimiento)
// ──────────────────────────────────────────────
async function enviarSobre(apiKey, { rutCertificado, password, ambiente, tipo }, certBuf, envioXmlBuf) {
  const json = {
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
    Ambiente: ambiente, // 0 = certificación, 1 = producción
    Tipo:     tipo,     // 2 = boleta, 1 = factura
  };

  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  form.append('files', envioXmlBuf, { filename: 'envio.xml', contentType: 'application/xml' });

  const res = await axios.post(
    `${DTE_BASE}/envio/enviar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // Respuesta: { trackId, estado, ok, rutEnvia, rutEmpresa, fecha, glosa, errores, responseXml }
  // estado 'REC' = SII recibió el sobre (pendiente de validación)
  logger.info(`[SimpleAPI] Sobre enviado al SII — trackId ${res.data?.trackId} estado ${res.data?.estado}`);
  return res.data;
}

// ──────────────────────────────────────────────
// CONSULTAR ESTADO ENVÍO — Verifica si el SII aceptó o rechazó el sobre
// POST https://api.simpleapi.cl/api/v1/consulta/envio
// multipart: input(JSON) + files(PFX)  — NO lleva XML de DTE
//
// ServidorBoletaREST: false para facturas/NC/ND, true para boletas (servidor separado en SII)
// Ambiente: 0 = certificación, 1 = producción
// ──────────────────────────────────────────────
async function consultarEstadoEnvio(apiKey, { rutCertificado, password, rutEmpresa, trackId, ambiente, esBoletaRest = false }, certBuf) {
  const json = {
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
    RutEmpresa:        rutEmpresa,
    TrackId:           trackId,
    Ambiente:          ambiente,
    ServidorBoletaREST: esBoletaRest,
  };

  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  const res = await axios.post(
    `${DTE_BASE}/consulta/envio`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// CONSULTAR DTE INDIVIDUAL — Estado de un documento específico en el SII
// POST https://api.simpleapi.cl/api/v1/consulta/dte
// A diferencia de consultarEstadoEnvio (por trackId de sobre),
// este consulta por folio + receptor + monto + fecha del DTE
//
// Respuesta: { estado, ok, glosaEstado, responseXml }
//   estados conocidos: 'DOK'=aceptado, 'FAN'=anulado, 'RCH'=rechazado
// ──────────────────────────────────────────────
async function consultarEstadoDTE(apiKey, { rutCertificado, password, rutEmpresa, rutReceptor, folio, total, fechaDTE, tipoDte, ambiente, esBoletaRest = false }, certBuf) {
  const json = {
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
    RutEmpresa:         rutEmpresa,
    RutReceptor:        rutReceptor,
    Folio:              folio,
    Total:              total,
    FechaDTE:           fechaDTE,   // 'YYYY-MM-DD'
    Tipo:               tipoDte,
    Ambiente:           ambiente,
    ServidorBoletaREST: esBoletaRest,
  };

  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  const res = await axios.post(
    `${DTE_BASE}/consulta/dte`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // { estado, ok, glosaEstado, erR_CODE, glosa_ERR_CODE, numeroAtencion, fechaAtencion, responseXml }
  return res.data;
}

// ──────────────────────────────────────────────
// IMPRESIÓN — Timbre y PDF del DTE
// Nota: el campo del DTE XML es "fileEnvio" (no "files")
// ──────────────────────────────────────────────

// Timbre (QR del TED) — devuelve PNG en base64
// POST https://api.simpleapi.cl/api/v1/impresion/timbre
// Útil para tickets térmicos: incrustar el QR del timbre electrónico
async function obtenerTimbre(apiKey, dteXmlBuf) {
  const form = new FormData();
  form.append('fileEnvio', dteXmlBuf, { filename: 'dte.xml', contentType: 'application/xml' });
  const res = await axios.post(
    `${DTE_BASE}/impresion/timbre`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // Respuesta: string base64 del PNG con el QR del timbre electrónico
  return res.data;
}

// PDF tamaño carta (A4) — devuelve PDF en base64
// POST /api/v1/impresion/pdf/carta/v2
// Input: NumeroResolucion, UnidadSII, FechaResolucion, Vendedor, FormaPago, CondicionVenta, PropiedadLogo
// Acepta logo opcional
async function obtenerPDFCarta(apiKey, { numeroResolucion, unidadSII, fechaResolucion, vendedor, formaPago, condicionVenta, propiedadLogo = 'contain' }, dteXmlBuf, logoBuf = null) {
  const json = {
    NumeroResolucion: numeroResolucion,
    UnidadSII:        unidadSII,
    FechaResolucion:  fechaResolucion,
    Vendedor:         vendedor,
    FormaPago:        formaPago,         // 'EFECTIVO', 'TARJETA', etc.
    CondicionVenta:   condicionVenta,
    PropiedadLogo:    propiedadLogo,     // 'contain' | 'cover'
  };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('fileEnvio', dteXmlBuf, { filename: 'dte.xml', contentType: 'application/xml' });
  if (logoBuf) form.append('logo', logoBuf, { filename: 'logo.png', contentType: 'image/png' });
  const res = await axios.post(`${DTE_BASE}/impresion/pdf/carta/v2`, form, { headers: { ...getHeaders(apiKey), ...form.getHeaders() } });
  return res.data; // PDF en base64
}

// PDF rollo térmico: 80mm o 58mm
// Endpoints soportados (mismos campos, distinto path):
//   /impresion/base64/80mm  → base64 (preferred — guardar en DB)
//   /impresion/pdf/80mm     → PDF binario
//   /impresion/base64/58mm  → base64 58mm
//   /impresion/pdf/58mm     → PDF binario 58mm
// Input: NumeroResolucion, UnidadSII, FechaResolucion, Ejecutivo (NO Vendedor), Hora
// Sin logo (diferencia clave con carta)
async function obtenerPDFTermico(apiKey, { numeroResolucion, unidadSII, fechaResolucion, ejecutivo, hora }, dteXmlBuf, { base64 = true, ancho = '80mm' } = {}) {
  const json = {
    NumeroResolucion: numeroResolucion,
    UnidadSII:        unidadSII,
    FechaResolucion:  fechaResolucion,
    Ejecutivo:        ejecutivo,   // vendedor/cajero (distinto al campo de carta)
    Hora:             hora,        // 'HH:MM'
  };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('fileEnvio', dteXmlBuf, { filename: 'dte.xml', contentType: 'application/xml' });
  const path = base64 ? `base64/${ancho}` : `pdf/${ancho}`;
  const res = await axios.post(`${DTE_BASE}/impresion/${path}`, form, { headers: { ...getHeaders(apiKey), ...form.getHeaders() } });
  return res.data;
}

// ──────────────────────────────────────────────
// COMPRAS — Aceptación o Rechazo de DTE recibido de un proveedor
// POST https://api.simpleapi.cl/api/v1/compras/aceptacionreclamo
// Usado cuando CarolinaPOS recibe una factura de proveedor y debe responder al SII
//
// Accion:
//   'ACD' = Aceptación Comercial (acepta la factura)
//   'RCD' = Rechazo Comercial   (rechaza la factura)
//   'ERM' = Recibo de Mercaderías/Servicios (confirma recepción física)
//
// Respuesta: { codRespuesta (0=OK), descripcion, response (XML raw del SII) }
// ──────────────────────────────────────────────
async function aceptarRechazarCompra(apiKey, { rutCertificado, password, rutEmpresa, tipoDte, folio, accion, ambiente }, certBuf) {
  const json = {
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
    Tipo:       tipoDte,
    Folio:      folio,
    Accion:     accion,      // 'ACD' | 'RCD' | 'ERM'
    RutEmpresa: rutEmpresa,
    Ambiente:   ambiente,
  };

  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  const res = await axios.post(
    `${DTE_BASE}/compras/aceptacionreclamo`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // { codRespuesta (0=OK), descripcion, fechaRecepcion, detalles, response (XML) }
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
// LIQUIDACIÓN-FACTURA (43) — Emisión de liquidación
// POST https://api.simpleapi.cl/api/v1/dte/liquidacion/generar
// Igual que /dte/generar pero clave raíz "Liquidacion" (no "Documento")
// y tiene campo Comisiones en Totales + array Comisiones a nivel Liquidacion
//
// comisionesTotales: [{ ValorNeto, ValorExento, ValorIVA }]
// comisiones: [{ TipoMovimiento: 'OtrosCargos'|..., Glosa, Tasa, ValorNeto, ValorExento, ValorIVA }]
// ──────────────────────────────────────────────
async function emitirLiquidacion(apiKey, {
  rutCertificado, password = '', rutEmisor, razonSocial, giro, actividadEconomica,
  direccion, comuna, ciudad = '', folio, fecha, receptor, items, totales,
  comisionesTotales = [], comisiones = [], referencias = [],
  formaPago = 1, fechaVencimiento = null,
}, certBuf, cafBuf) {
  const identificacion = {
    TipoDTE:      TIPO_DTE.LIQUIDACION,
    Folio:        folio,
    FechaEmision: fecha,
    FormaPago:    formaPago,
  };
  if (fechaVencimiento) identificacion.FechaVencimiento = fechaVencimiento;

  const doc = {
    Liquidacion: {
      Encabezado: {
        IdentificacionDTE: identificacion,
        Emisor: {
          Rut:                rutEmisor,
          RazonSocial:        razonSocial,
          Giro:               giro,
          ActividadEconomica: Array.isArray(actividadEconomica) ? actividadEconomica : [actividadEconomica],
          DireccionOrigen:    direccion,
          ComunaOrigen:       comuna,
          CiudadOrigen:       ciudad,
          Telefono:           [],
        },
        Receptor: {
          Rut:               receptor.rut,
          RazonSocial:       receptor.razonSocial,
          Direccion:         receptor.direccion,
          Comuna:            receptor.comuna,
          Ciudad:            receptor.ciudad || '',
          Giro:              receptor.giro,
          Contacto:          receptor.contacto || '',
          CorreoElectronico: receptor.email   || '',
        },
        Totales: {
          MontoNeto:  totales.neto,
          TasaIVA:    19,
          IVA:        totales.iva,
          MontoTotal: totales.total,
          Comisiones: comisionesTotales,
        },
      },
      Detalles: items.map((item) => ({
        IndicadorExento:          0,
        Nombre:                   item.nombre,
        Descripcion:              item.descripcion || '',
        Cantidad:                 item.cantidad,
        UnidadMedida:             item.unidad || '',
        Precio:                   item.precioNeto,
        MontoItem:                Math.round(item.cantidad * item.precioNeto),
        TipoDocumentoLiquidacion: item.tipoDocLiquidacion,
      })),
      Comisiones: comisiones,
      Referencias: referencias,
    },
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
  };

  const form = buildForm(doc, certBuf, cafBuf);
  const res = await axios.post(
    `${DTE_BASE}/dte/liquidacion/generar`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  logger.info(`[SimpleAPI] Liquidación 43 emitida — folio ${folio} RUT emisor ${rutEmisor}`);
  return res.data;
}

// ──────────────────────────────────────────────
// FIRMAR XML EXISTENTE — Agrega TED + firma a un DTE XML ya construido
// POST https://api.simpleapi.cl/api/v1/dte/generar/xml
// Útil cuando el DTE XML fue construido externamente (sin usar /dte/generar)
//
// dteXmlBuf: Buffer del DTE XML sin TED ni firma (el documento base)
// certBuf:   Buffer PFX del certificado digital
// cafBuf:    Buffer CAF XML del tipo de DTE
// Orden en multipart: DTE XML primero, luego PFX, luego CAF
// ──────────────────────────────────────────────
async function firmarDTEXml(apiKey, { rutCertificado, password = '' }, dteXmlBuf, certBuf, cafBuf) {
  const json = {
    Certificado: {
      Rut:      rutCertificado,
      Password: password,
    },
  };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', dteXmlBuf, { filename: 'dte.xml',  contentType: 'application/xml' });
  form.append('files', certBuf,   { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  form.append('files', cafBuf,    { filename: 'caf.xml',  contentType: 'application/xml' });

  const res = await axios.post(
    `${DTE_BASE}/dte/generar/xml`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data; // XML firmado con TED
}

// ──────────────────────────────────────────────
// AUTH — Obtener JWT desde apikey (alternativa al header directo)
// GET https://api.simpleapi.cl/api/auth/token
// Body JSON: { apikey }
// Respuesta: string JWT (no JSON)
// Nota: el apikey directo en Authorization funciona igual — este JWT es opcional
// ──────────────────────────────────────────────
async function obtenerTokenJWT(apiKey) {
  const res = await axios.get(`${DTE_BASE.replace('/api/v1', '')}/api/auth/token`, {
    data: { apikey: apiKey },
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data; // JWT string
}

// ──────────────────────────────────────────────
// RCV — Registro de Compras y Ventas (para módulo contable futuro)
// POST servicios.simpleapi.cl/api/RCV/ventas/{mes}/{anio}
// POST servicios.simpleapi.cl/api/RCV/compras/{mes}/{anio}
//
// Input: multipart con Certificado PFX + JSON { RutCertificado, RutEmpresa, Ambiente, Password }
// URL puede incluir día opcional: /ventas/{dia}/{mes}/{anio}
// Respuesta: { caratula, compras: { resumenes, detalleCompras }, ventas: { resumenes, detalleVentas } }
// ──────────────────────────────────────────────
async function getRCVVentas(apiKey, { rutCertificado, password = '', rutEmpresa, ambiente = 1 }, mes, anio, certBuf) {
  const json = { RutCertificado: rutCertificado, RutEmpresa: rutEmpresa, Ambiente: ambiente, Password: password };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  const res = await axios.post(
    `${FOLIOS_BASE}/RCV/ventas/${String(mes).padStart(2,'0')}/${anio}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

async function getRCVCompras(apiKey, { rutCertificado, password = '', rutEmpresa, ambiente = 1 }, mes, anio, certBuf) {
  const json = { RutCertificado: rutCertificado, RutEmpresa: rutEmpresa, Ambiente: ambiente, Password: password };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  const res = await axios.post(
    `${FOLIOS_BASE}/RCV/compras/${String(mes).padStart(2,'0')}/${anio}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// ──────────────────────────────────────────────
// BHE — Boleta de Honorarios Electrónica (personas naturales)
// servicios.simpleapi.cl/api/bhe/...
// Se usa cuando el negocio PAGA honorarios a un trabajador independiente
//
// Retencion: 1 = con retención (SII descuenta 13%), 2 = sin retención
// FechaEmision: formato "DD-MM-YYYY" (distinto al DTE que usa "YYYY-MM-DD")
// Receptor.Region: número de región (13 = Metropolitana)
// Respuesta: { folio, codigoBarras, fechaEmision, pdfBase64 }
// ──────────────────────────────────────────────
async function emitirBHE(apiKey, { rutCertificado, password = '', retencion = 1, fechaEmision, emisor, receptor, detalles }, certBuf) {
  const json = {
    RutCertificado: rutCertificado,
    Password:       password,
    Retencion:      retencion,
    FechaEmision:   fechaEmision, // "DD-MM-YYYY"
    Emisor:  emisor,              // { Direccion }
    Receptor: {
      Rut:       receptor.rut,
      Nombre:    receptor.nombre,
      Direccion: receptor.direccion,
      Region:    receptor.region,
      Comuna:    receptor.comuna,
    },
    Detalles: detalles.map((d) => ({
      Nombre: d.nombre,
      Valor:  d.valor,
    })),
  };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  const res = await axios.post(
    `${FOLIOS_BASE}/bhe/emitir`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // { folio, codigoBarras, fechaEmision, pdfBase64 }
  return res.data;
}

// Anular BHE por folio
// POST servicios.simpleapi.cl/api/bhe/anular/{folio}/{tipo}
// tipo: 1 = BHE normal
// Respuesta: string de texto plano "Boleta N° X anulada correctamente"
async function anularBHE(apiKey, { rutCertificado, password = '', folio, tipo = 1 }, certBuf) {
  const json = { RutCertificado: rutCertificado, Password: password };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  const res = await axios.post(
    `${FOLIOS_BASE}/bhe/anular/${folio}/${tipo}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data; // texto plano
}

// Enviar BHE por email
// POST servicios.simpleapi.cl/api/bhe/mail/{folio}/{anio}
// Body JSON (no multipart): { RutUsuario, PasswordSII, Correo }
// Respuesta: string de texto plano
async function enviarBHEMail(apiKey, { rutUsuario, passwordSII, correo, folio, anio }) {
  const res = await axios.post(
    `${FOLIOS_BASE}/bhe/mail/${folio}/${anio}`,
    { RutUsuario: rutUsuario, PasswordSII: passwordSII, Correo: correo },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data; // texto plano
}

// BHE en nombre de terceros — emitir boleta para otro RUT
// POST servicios.simpleapi.cl/api/bhe/terceros/emitir
// A diferencia de emitirBHE(), aquí el Emisor.Rut es el trabajador independiente
// y rutCertificado es el representante autorizado que firma con su PFX
// Respuesta: { folio, codigoBarras, fechaEmision, pdfBase64 }
async function emitirBHETerceros(apiKey, { rutCertificado, password = '', retencion = 2, fechaEmision, emisorRut, receptor, detalles }, certBuf) {
  const json = {
    RutCertificado: rutCertificado,
    Password:       password,
    Retencion:      retencion,
    FechaEmision:   fechaEmision, // "DD-MM-YYYY"
    Emisor: { Rut: emisorRut },   // RUT del trabajador independiente (el que EMITE la boleta)
    Receptor: {
      Rut:       receptor.rut,
      Nombre:    receptor.nombre,
      Direccion: receptor.direccion,
      Region:    receptor.region,
      Comuna:    receptor.comuna,
    },
    Detalles: detalles.map((d) => ({
      Nombre: d.nombre,
      Valor:  d.valor,
    })),
  };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  const res = await axios.post(
    `${FOLIOS_BASE}/bhe/terceros/emitir`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  // { folio, codigoBarras, fechaEmision, pdfBase64 }
  return res.data;
}

// Consultar direcciones registradas del emisor BHE
// GET servicios.simpleapi.cl/api/bhe/direcciones
// Respuesta: array de strings con las direcciones
async function obtenerDireccionesBHE(apiKey, { rutCertificado, password = '' }, certBuf) {
  const json = { RutCertificado: rutCertificado, Password: password };
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });
  const res = await axios.post(
    `${FOLIOS_BASE}/bhe/direcciones`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data; // string[]
}

// Obtener PDF de BHE emitida (3 variantes de URL)
// GET /bhe/pdf/emitidas/{folio}/{anio}           — por folio + año
// GET /bhe/pdf/emitidas/{folio}                  — por folio + FechaEmision + RutEmpresa en input
// GET /bhe/pdf/{codigoBarras}                    — por código de barras
// Todas usan GET con multipart form-data (atípico pero confirmado)
async function obtenerPDFBHE(apiKey, { rutCertificado, password = '', folio, anio = null, fechaEmision = null, rutEmpresa = null, codigoBarras = null }, certBuf) {
  const json = { RutCertificado: rutCertificado, Password: password };
  if (fechaEmision) json.FechaEmision = fechaEmision;
  if (rutEmpresa)   json.RutEmpresa   = rutEmpresa;
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  let path;
  if (codigoBarras)  path = `bhe/pdf/${codigoBarras}`;
  else if (anio)     path = `bhe/pdf/emitidas/${folio}/${anio}`;
  else               path = `bhe/pdf/emitidas/${folio}`;

  const res = await axios.get(
    `${FOLIOS_BASE}/${path}`,
    { data: form, headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data; // PDF base64
}

// PDF de BHE recibida (cuando el negocio recibe honorarios de un trabajador)
// GET /bhe/pdf/recibidas/{folio}/{anio}      — por folio + año
// GET /bhe/pdf/recibidas/{folio}             — por folio + FechaEmision + RutEmisor
// rutEmisor: RUT del trabajador independiente que emitió la boleta
async function obtenerPDFBHERecibida(apiKey, { rutCertificado, password = '', folio, anio = null, fechaEmision = null, rutEmisor }, certBuf) {
  const json = { RutCertificado: rutCertificado, Password: password, RutEmisor: rutEmisor };
  if (fechaEmision) json.FechaEmision = fechaEmision;
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  const path = anio ? `bhe/pdf/recibidas/${folio}/${anio}` : `bhe/pdf/recibidas/${folio}`;
  const res = await axios.get(
    `${FOLIOS_BASE}/${path}`,
    { data: form, headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data; // PDF base64
}

// Listado de BHE emitidas — 3 variantes de URL con respuestas distintas:
//
// Anual:   /bhe/listado/emitidas/{anio}
//   → { anio, rut, periodos[{mes, cantidadVigentes, ... totalLiquido}], totales... }
//
// Mensual: /bhe/listado/emitidas/{MM}/{YYYY}
//   → { dia, mes, anio, rut, cantidadDocumentos, totalBruto, ..., boletas[] }
//
// Diario:  /bhe/listado/emitidas/{DD}/{MM}/{YYYY}
//   → igual al mensual pero con día específico
//
// Input opcional: Detallado (boolean) — solo en mensual/diario
async function listadoBHEEmitidas(apiKey, { rutCertificado, password = '', anio, mes = null, dia = null, detallado = false }, certBuf) {
  const json = { RutCertificado: rutCertificado, Password: password };
  if (mes !== null) json.Detallado = detallado;
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  let path;
  if (dia !== null && mes !== null) {
    path = `bhe/listado/emitidas/${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${anio}`;
  } else if (mes !== null) {
    path = `bhe/listado/emitidas/${String(mes).padStart(2,'0')}/${anio}`;
  } else {
    path = `bhe/listado/emitidas/${anio}`;
  }

  const res = await axios.post(
    `${FOLIOS_BASE}/${path}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// Listado de BHE recibidas — mismas 3 variantes de URL
async function listadoBHERecibidas(apiKey, { rutCertificado, password = '', anio, mes = null, dia = null, detallado = false }, certBuf) {
  const json = { RutCertificado: rutCertificado, Password: password };
  if (mes !== null) json.Detallado = detallado;
  const form = new FormData();
  form.append('input', JSON.stringify(json));
  form.append('files', certBuf, { filename: 'cert.pfx', contentType: 'application/x-pkcs12' });

  let path;
  if (dia !== null && mes !== null) {
    path = `bhe/listado/recibidas/${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${anio}`;
  } else if (mes !== null) {
    path = `bhe/listado/recibidas/${String(mes).padStart(2,'0')}/${anio}`;
  } else {
    path = `bhe/listado/recibidas/${anio}`;
  }

  const res = await axios.post(
    `${FOLIOS_BASE}/${path}`,
    form,
    { headers: { ...getHeaders(apiKey), ...form.getHeaders() } }
  );
  return res.data;
}

// Enviar observación sobre una BHE recibida
// POST /bhe/observacion/{tipoBoleta}/{folio}
// Body JSON (no multipart): { RutUsuario, RutEmpresa, PasswordSII }
// tipoBoleta: 1 = normal
// Respuesta: texto plano "Observación enviada correctamente"
async function observacionBHE(apiKey, { rutUsuario, rutEmpresa, passwordSII, folio, tipoBoleta = 1 }) {
  const res = await axios.post(
    `${FOLIOS_BASE}/bhe/observacion/${tipoBoleta}/${folio}`,
    { RutUsuario: rutUsuario, RutEmpresa: rutEmpresa, PasswordSII: passwordSII },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data; // texto plano
}

// ──────────────────────────────────────────────
// BHE EMPRESAS — Boleta de Honorarios para empresas con credenciales SII
// servicios.simpleapi.cl/api/bheempresas/...
//
// Diferencia vs BHE normal:
//   /bhe/emitir        → auth con PFX (certBuf) + RutCertificado + Password
//   /bheempresas/emitir → auth con RutUsuario + PasswordSII (JSON puro, sin PFX)
//
// Misma estructura de datos (Emisor, Receptor, Detalles) y misma respuesta.
// ──────────────────────────────────────────────
async function emitirBHEEmpresas(apiKey, { rutUsuario, passwordSII, retencion = 1, fechaEmision, emisor, receptor, detalles }) {
  const body = {
    RutUsuario:  rutUsuario,
    PasswordSII: passwordSII,
    Retencion:   retencion,
    FechaEmision: fechaEmision, // "DD-MM-YYYY"
    Emisor:   emisor,           // { Direccion: "0" } si no tiene una específica
    Receptor: {
      Rut:       receptor.rut,
      Nombre:    receptor.nombre,
      Direccion: receptor.direccion,
      Region:    receptor.region,
      Comuna:    receptor.comuna,
    },
    Detalles: detalles.map((d) => ({
      Nombre: d.nombre,
      Valor:  d.valor,
    })),
  };
  const res = await axios.post(
    `${FOLIOS_BASE}/bheempresas/emitir`,
    body,
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  // { folio, codigoBarras, fechaEmision, pdfBase64 }
  return res.data;
}

// PDF de BHE recibida (empresa es la receptora/pagadora)
// GET /bheempresas/pdf/recibidas/{folio}/{anio}  — con RutEmisor, RutUsuario, PasswordSII
// GET /bheempresas/pdf/recibidas/{folio}          — idem + FechaEmision
async function obtenerPDFBHEEmpresasRecibida(apiKey, { rutUsuario, passwordSII, folio, anio, fechaEmision, rutEmisor }) {
  let url;
  const body = { RutEmisor: rutEmisor, RutUsuario: rutUsuario, PasswordSII: passwordSII };
  if (anio && !fechaEmision) {
    url = `${FOLIOS_BASE}/bheempresas/pdf/recibidas/${folio}/${anio}`;
  } else {
    url  = `${FOLIOS_BASE}/bheempresas/pdf/recibidas/${folio}`;
    body.FechaEmision = fechaEmision;
  }
  const res = await axios.get(url, {
    data: body,
    headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' },
  });
  return res.data; // base64 PDF
}

// Listado BHE empresa emitidas — 2 variantes según params:
//   anual:   POST /bheempresas/listado/emitidas/{anio}       → { periodos[] }
//   mensual: POST /bheempresas/listado/emitidas/{MM}/{YYYY}  → { boletas[] }
async function listadoBHEEmpresasEmitidas(apiKey, { rutUsuario, passwordSII, anio, mes = null }) {
  const url = mes
    ? `${FOLIOS_BASE}/bheempresas/listado/emitidas/${String(mes).padStart(2, '0')}/${anio}`
    : `${FOLIOS_BASE}/bheempresas/listado/emitidas/${anio}`;
  const res = await axios.post(
    url,
    { RutUsuario: rutUsuario, PasswordSII: passwordSII },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  // anual: { anio, rut, periodos[], totalVigentes, totalAnuladas, ... }
  // mensual: { dia, mes, anio, rut, boletas[], cantidadDocumentos, ... }
  return res.data;
}

// Listado BHE empresa recibidas — mismos 2 variantes
async function listadoBHEEmpresasRecibidas(apiKey, { rutUsuario, passwordSII, anio, mes = null }) {
  const url = mes
    ? `${FOLIOS_BASE}/bheempresas/listado/recibidas/${String(mes).padStart(2, '0')}/${anio}`
    : `${FOLIOS_BASE}/bheempresas/listado/recibidas/${anio}`;
  const res = await axios.post(
    url,
    { RutUsuario: rutUsuario, PasswordSII: passwordSII },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data;
}

async function anularBHEEmpresas(apiKey, { rutUsuario, passwordSII, folio, tipo = 1 }) {
  const res = await axios.post(
    `${FOLIOS_BASE}/bheempresas/anular/${folio}/${tipo}`,
    { RutUsuario: rutUsuario, PasswordSII: passwordSII },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data; // texto plano
}

async function enviarBHEEmpresasMail(apiKey, { rutUsuario, passwordSII, correo, folio, anio }) {
  const res = await axios.post(
    `${FOLIOS_BASE}/bheempresas/mail/${folio}/${anio}`,
    { RutUsuario: rutUsuario, PasswordSII: passwordSII, Correo: correo },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data; // texto plano
}

async function obtenerDireccionesBHEEmpresas(apiKey, { rutUsuario, passwordSII }) {
  const res = await axios.post(
    `${FOLIOS_BASE}/bheempresas/direcciones`,
    { RutUsuario: rutUsuario, PasswordSII: passwordSII },
    { headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data; // string[]
}

// GET sin auth — lista regiones y comunas de Chile
async function listarComunasBHEEmpresas(apiKey) {
  const res = await axios.get(
    `${FOLIOS_BASE}/bheempresas/listarComunas`,
    { headers: getHeaders(apiKey) }
  );
  return res.data; // { regiones: [{ nombre, comunas[] }] }
}

// PDF BHE empresa — 3 variantes según params disponibles:
//   folio + anio                              → GET /bheempresas/pdf/emitidas/{folio}/{anio}
//   folio + fechaEmision + rutEmpresa         → GET /bheempresas/pdf/emitidas/{folio}
//   codigoBarras                              → GET /bheempresas/pdf/{codigoBarras}
async function obtenerPDFBHEEmpresas(apiKey, { rutUsuario, passwordSII, folio, anio, fechaEmision, rutEmpresa, codigoBarras }) {
  let url;
  const body = { RutUsuario: rutUsuario, PasswordSII: passwordSII };

  if (codigoBarras) {
    url = `${FOLIOS_BASE}/bheempresas/pdf/${codigoBarras}`;
  } else if (anio && !fechaEmision) {
    url = `${FOLIOS_BASE}/bheempresas/pdf/emitidas/${folio}/${anio}`;
  } else {
    // folio solo, con FechaEmision + RutEmpresa (RutUsuario = emisor)
    url = `${FOLIOS_BASE}/bheempresas/pdf/emitidas/${folio}`;
    body.RutEmpresa  = rutEmpresa;  // receptor/empresa pagadora
    body.FechaEmision = fechaEmision;
  }

  const res = await axios.get(url, {
    data: body,
    headers: { ...getHeaders(apiKey), 'Content-Type': 'application/json' },
  });
  return res.data; // base64 PDF
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
  // Constantes
  TIPO_DTE,
  // Utilidades RUT
  validarRUT,
  formatRUT,
  // Auth
  getHeaders,
  obtenerTokenJWT,
  // Contribuyente
  buscarContribuyente,
  // Suscripción
  consultarSuscripcion,
  // Folios CAF
  obtenerFolios,
  consultarFoliosDisponibles,
  consultarUsoFolios,
  anularFolios,
  // Emisión DTE
  // rutCertificado = RUT del dueño del PFX (persona), puede diferir del RUT empresa (emisor)
  emitirBoleta,
  emitirFactura,
  emitirNotaCredito,
  emitirLiquidacion,  // tipo 43 — endpoint /dte/liquidacion/generar
  firmarDTEXml,       // firma un DTE XML ya construido — /dte/generar/xml
  // Envío SII
  generarSobre,
  enviarSobre,
  // Consultas estado
  consultarEstadoEnvio,
  consultarEstadoDTE,
  // Compras (facturas recibidas)
  aceptarRechazarCompra,
  // Impresión / PDF
  obtenerTimbre,
  obtenerPDFCarta,
  obtenerPDFTermico,   // 80mm y 58mm (reemplaza obtenerPDF80mm)
  // BHE — Boleta de Honorarios Electrónica (personas naturales)
  emitirBHE,           // emisor = titular del cert
  emitirBHETerceros,   // emisor = otro RUT; rutCertificado = representante autorizado
  anularBHE,
  enviarBHEMail,
  obtenerDireccionesBHE,
  obtenerPDFBHE,           // emitidas: por folio+anio, folio solo, o codigoBarras
  obtenerPDFBHERecibida,   // recibidas: por folio+anio o folio+fecha+RutEmisor
  listadoBHEEmitidas,      // anual/{anio} | mensual/{MM}/{YYYY} | diario/{DD}/{MM}/{YYYY}
  listadoBHERecibidas,     // idem — con campo boletas[] en mensual/diario
  observacionBHE,          // POST /bhe/observacion/{tipoBoleta}/{folio}
  // BHE EMPRESAS — mismos endpoints pero auth con RutUsuario+PasswordSII (sin PFX)
  // servicios.simpleapi.cl/api/bheempresas/...
  emitirBHEEmpresas,        // POST /bheempresas/emitir
  anularBHEEmpresas,        // POST /bheempresas/anular/{folio}/{tipo}
  enviarBHEEmpresasMail,    // POST /bheempresas/mail/{folio}/{anio}
  obtenerDireccionesBHEEmpresas, // POST /bheempresas/direcciones → string[]
  listarComunasBHEEmpresas, // GET /bheempresas/listarComunas (sin auth) → { regiones[] }
  obtenerPDFBHEEmpresas,         // GET — 3 variantes: /{codigoBarras} | /emitidas/{folio}/{anio} | /emitidas/{folio}
  obtenerPDFBHEEmpresasRecibida, // GET — /recibidas/{folio}/{anio} | /recibidas/{folio}
  listadoBHEEmpresasEmitidas,    // POST /listado/emitidas/{anio} → periodos[] | /{MM}/{YYYY} → boletas[]
  listadoBHEEmpresasRecibidas,   // POST /listado/recibidas/{anio} → periodos[] | /{MM}/{YYYY} → boletas[]
  // RCV — Registro de Compras y Ventas
  // Firma: (apiKey, { rutCertificado, password, rutEmpresa, ambiente }, mes, anio, certBuf)
  getRCVVentas,
  getRCVCompras,
  // Helpers IVA Chile 19%
  calcularTotalesDesdeTotal,
  calcularTotalesDesdeNeto,
};

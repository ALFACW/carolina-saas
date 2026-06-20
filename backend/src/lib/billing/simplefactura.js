// Cliente SimpleFactura — Facturación Electrónica SII Chile (Chilesystems)
// URL: api.simplefactura.cl
// Auth: Authorization: Bearer <token>
//
// DIFERENCIAS vs SimpleAPI:
//   - No se sube PFX en cada request — Chilesystems guarda el certificado en su portal
//   - No se gestionan CAF — SimpleFactura los maneja internamente
//   - JSON usa nombres de campo SII directos (IdDoc, RUTEmisor, RznSoc, Detalle...)
//   - Liquidación (43) tiene endpoint propio /liquidacion/{sucursal}
//
// IVA Chile = 19%
//   Boleta  (39): PrcItem = precio CON IVA. MntNeto = total / 1.19
//   Factura (33): PrcItem = precio SIN IVA (neto). MntNeto = suma items
//   Si MntBruto=1 en boleta: items se envían con IVA incluido (default de boletas)

const axios = require('axios');
const logger = require('../logger');

const BASE = 'https://api.simplefactura.cl';

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ──────────────────────────────────────────────────────────
// EMISIÓN DTE — un solo endpoint para todos los tipos
// POST /invoiceV2/{sucursal}         tipos: 33,34,39,41,46,52,56,61
// POST /invoiceV2/{sucursal}/validaMontos  (verifica que los totales cuadren)
//
// Tipos soportados:
//   33 = Factura Electrónica          (items NETOS)
//   34 = Factura Exenta               (items NETOS, sin IVA)
//   39 = Boleta Electrónica           (items BRUTOS con IVA)
//   41 = Boleta Exenta                (sin IVA)
//   46 = Factura de Compra            (cuando CarolinaPOS es receptor)
//   52 = Guía de Despacho             (extra: TipoDespacho, IndTraslado)
//   56 = Nota de Débito               (extra: Referencia al doc original)
//   61 = Nota de Crédito              (extra: Referencia al doc original)
//
// Respuesta: { tipoDTE, rutEmisor, rutReceptor, folio, fechaEmision, total }
// ──────────────────────────────────────────────────────────
async function emitirDTE(token, sucursal, documento, { validarMontos = false, observaciones, tipoPago } = {}) {
  const sucursalUrl = sucursal.replace(/\s+/g, '_');
  const url = `${BASE}/invoiceV2/${sucursalUrl}${validarMontos ? '/validaMontos' : ''}`;

  const body = { Documento: documento };
  if (observaciones) body.Observaciones = observaciones;
  if (tipoPago)      body.TipoPago      = tipoPago;

  const res = await axios.post(url, body, { headers: headers(token) });
  logger.info(`[SimpleFactura] DTE tipo ${documento?.Encabezado?.IdDoc?.TipoDTE} emitido — folio ${res.data?.data?.folio}`);
  return res.data?.data; // { tipoDTE, rutEmisor, rutReceptor, folio, fechaEmision, total }
}

// ──────────────────────────────────────────────────────────
// LIQUIDACIÓN-FACTURA (43) — endpoint propio
// POST /liquidacion/{sucursal}
// Root key es "Liquidacion" (no "Documento")
// Extra campo en Detalle: TpoDocLiq (código del doc que se liquida, ej "33")
// Extra sección: Comisiones [{ NroLinCom, TipoMovim, Glosa, TasaComision, ValComNeto, ValComExe, ValComIVA }]
// ──────────────────────────────────────────────────────────
async function emitirLiquidacion(token, sucursal, liquidacion) {
  const sucursalUrl = sucursal.replace(/\s+/g, '_');
  const res = await axios.post(
    `${BASE}/liquidacion/${sucursalUrl}`,
    { Liquidacion: liquidacion },
    { headers: headers(token) }
  );
  logger.info(`[SimpleFactura] Liquidación 43 emitida — folio ${res.data?.data?.folio}`);
  return res.data?.data;
}

// ──────────────────────────────────────────────────────────
// PREVISUALIZAR DTE — PDF de muestra (folio 0, no oficial)
// POST /dte/preview/{sucursal}
// Mismo body que emitirDTE — útil para que el usuario vea el PDF antes de emitir
// ──────────────────────────────────────────────────────────
async function previewDTE(token, sucursal, documento) {
  const sucursalUrl = sucursal.replace(/\s+/g, '_');
  const res = await axios.post(
    `${BASE}/dte/preview/${sucursalUrl}`,
    { Documento: documento },
    { headers: headers(token) }
  );
  return res.data; // PDF base64 o similar
}

// ──────────────────────────────────────────────────────────
// TRAZAS DTE EMITIDO — estado y seguimiento de un DTE
// POST /dte/trazasIssued  (método GET en docs pero body JSON → usar POST)
// ambiente: 0=certificación, 1=producción
// Respuesta 200: trazas del doc | 404: no encontrado
// ──────────────────────────────────────────────────────────
async function obtenerTrazas(token, { rutEmisor, folio, codigoTipoDte, ambiente = 1 }) {
  const res = await axios.post(
    `${BASE}/dte/trazasIssued`,
    {
      credenciales: { rutEmisor },
      dteReferenciadoExterno: { folio, codigoTipoDte, ambiente },
    },
    { headers: headers(token) }
  );
  return res.data;
}

// ──────────────────────────────────────────────────────────
// FACTURACIÓN MASIVA CSV
// POST /massiveInvoice   multipart/form-data
// data: JSON { rutEmisor, nombreSucursal }
// input: archivo CSV con los documentos
//
// Importante: un solo tipo de DTE por archivo CSV
// Respuesta: [{ idCsv, folio }]
// ──────────────────────────────────────────────────────────
async function facturacionMasiva(token, { rutEmisor, nombreSucursal }, csvBuffer, csvFilename = 'documentos.csv') {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('data', JSON.stringify({ rutEmisor, nombreSucursal }));
  form.append('input', csvBuffer, { filename: csvFilename, contentType: 'text/csv' });

  const res = await axios.post(`${BASE}/massiveInvoice`, form, {
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders(),
    },
  });
  return res.data?.data; // [{ idCsv, folio }]
}

// ──────────────────────────────────────────────────────────
// Helpers para construir el body de cada tipo de DTE
// Usan nombres de campo de la API (SII directo)
// ──────────────────────────────────────────────────────────

// Construir encabezado emisor (común a todos los docs)
function buildEmisor({ rutEmisor, razonSocial, giro, telefono = [], correo = '', acteco = [], direccion, comuna, ciudad = '' }) {
  return {
    RUTEmisor:     rutEmisor,
    RznSoc:        razonSocial,
    GiroEmis:      giro,
    Telefono:      Array.isArray(telefono) ? telefono : [telefono],
    CorreoEmisor:  correo,
    Acteco:        Array.isArray(acteco) ? acteco : [acteco],
    DirOrigen:     direccion,
    CmnaOrigen:    comuna,
    CiudadOrigen:  ciudad,
  };
}

// Construir body de boleta electrónica (39/41)
// items: [{ nombre, descripcion?, cantidad, precio (CON IVA), descuento?, unidad? }]
// totales: { neto, iva, total }  ← neto = total/1.19
function buildBoleta({ emisor, receptor = null, items, totales, fecha, formaPago = 1, cajero = '' }) {
  return {
    Encabezado: {
      IdDoc: {
        TipoDTE:  39,
        FchEmis:  fecha,
        FmaPago:  formaPago,
      },
      Emisor: buildEmisor(emisor),
      Receptor: {
        RUTRecep:    receptor?.rut       || '66666666-6', // anónimo si no hay RUT
        RznSocRecep: receptor?.razonSocial || 'Sin identificar',
        CorreoRecep: receptor?.correo    || '',
        DirRecep:    receptor?.direccion || '',
        CmnaRecep:   receptor?.comuna    || '',
        CiudadRecep: receptor?.ciudad    || '',
      },
      Totales: {
        MntNeto:  totales.neto,
        TasaIVA:  19,
        IVA:      totales.iva,
        MntTotal: totales.total,
      },
    },
    Detalle: items.map((item, i) => ({
      NroLinDet: i + 1,
      NmbItem:   item.nombre,
      DscItem:   item.descripcion || undefined,
      QtyItem:   item.cantidad,
      UnmdItem:  item.unidad || 'un',
      PrcItem:   item.precio,          // precio CON IVA en boleta
      DescuentoMonto: item.descuento || undefined,
      MontoItem: Math.round(item.cantidad * item.precio - (item.descuento || 0)),
    })),
  };
}

// Construir body de factura electrónica (33)
// items: [{ nombre, descripcion?, cantidad, precioNeto (SIN IVA), descuento?, unidad? }]
// totales: { neto, iva, total }
// referencias: [{ NroLinRef, TpoDocRef, FolioRef, RazonRef, FchRef }]
function buildFactura({ emisor, receptor, items, totales, fecha, formaPago = 1, fechaVenc = null, referencias = [], descuentosGlobales = [] }) {
  const idDoc = {
    TipoDTE: 33,
    FchEmis: fecha,
    FmaPago: formaPago,
  };
  if (fechaVenc) idDoc.FchVenc = fechaVenc;

  return {
    Encabezado: {
      IdDoc: idDoc,
      Emisor: buildEmisor(emisor),
      Receptor: {
        RUTRecep:    receptor.rut,
        RznSocRecep: receptor.razonSocial,
        GiroRecep:   receptor.giro      || '',
        CorreoRecep: receptor.correo    || '',
        DirRecep:    receptor.direccion || '',
        CmnaRecep:   receptor.comuna    || '',
        CiudadRecep: receptor.ciudad    || '',
      },
      Totales: {
        MntNeto:  totales.neto,
        TasaIVA:  19,
        IVA:      totales.iva,
        MntTotal: totales.total,
      },
    },
    Detalle: items.map((item, i) => ({
      NroLinDet: i + 1,
      NmbItem:   item.nombre,
      DscItem:   item.descripcion || undefined,
      QtyItem:   item.cantidad,
      UnmdItem:  item.unidad || 'un',
      PrcItem:   item.precioNeto,      // precio SIN IVA en factura
      DescuentoMonto: item.descuento || undefined,
      MontoItem: Math.round(item.cantidad * item.precioNeto - (item.descuento || 0)),
    })),
    Referencia:    referencias.length   ? referencias.map((r, i) => ({ NroLinRef: i + 1, ...r })) : undefined,
    DscRcgGlobal:  descuentosGlobales.length ? descuentosGlobales.map((d, i) => ({ NroLinDR: i + 1, ...d })) : undefined,
  };
}

// Construir body de guía de despacho (52)
// tipoDespacho: 1=receptor, 2=emisor→cliente, 3=emisor→otras instalaciones
// indTraslado:  1=venta, 2=ventas por efectuar, 5=traslado interno, etc.
// transporte (opcional): { patente, rutTrans, chofer: { rut, nombre } }
function buildGuiaDespacho({ emisor, receptor, items, totales, fecha, tipoDespacho = 2, indTraslado = 1, transporte = null, referencias = [] }) {
  const doc = buildFactura({ emisor, receptor, items, totales, fecha, referencias });
  doc.Encabezado.IdDoc.TipoDTE       = 52;
  doc.Encabezado.IdDoc.TipoDespacho  = tipoDespacho;
  doc.Encabezado.IdDoc.IndTraslado   = indTraslado;

  if (transporte) {
    doc.Encabezado.Transporte = {
      Patente:  transporte.patente  || '',
      RUTTrans: transporte.rutTrans || '',
      Chofer:   transporte.chofer
        ? { RUTChofer: transporte.chofer.rut, NombreChofer: transporte.chofer.nombre }
        : undefined,
    };
  }

  return doc;
}

// Construir body de nota de crédito (61) o nota de débito (56)
// dteRef: { tipoDte, folio, fecha }   ← el DTE que se está anulando/ajustando
// motivo: string   ← ej. "Anula factura", "Error en precio"
function buildNotaCredDebito({ tipoDte, emisor, receptor, items, totales, fecha, dteRef, motivo }) {
  const doc = buildFactura({ emisor, receptor, items, totales, fecha });
  doc.Encabezado.IdDoc.TipoDTE = tipoDte; // 61 o 56

  doc.Referencia = [{
    NroLinRef: 1,
    TpoDocRef: String(dteRef.tipoDte),
    FolioRef:  dteRef.folio,
    FchRef:    dteRef.fecha,
    RazonRef:  motivo,
  }];

  return doc;
}

// ──────────────────────────────────────────────────────────
// IVA helpers
// ──────────────────────────────────────────────────────────
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
  // Emisión
  emitirDTE,          // tipos 33,34,39,41,46,52,56,61 — /invoiceV2/{sucursal}
  emitirLiquidacion,  // tipo 43 — /liquidacion/{sucursal}
  // Preview y trazas
  previewDTE,
  obtenerTrazas,
  // Masiva
  facturacionMasiva,
  // Builders de documento (input para emitirDTE)
  buildEmisor,
  buildBoleta,
  buildFactura,
  buildGuiaDespacho,
  buildNotaCredDebito,
  // IVA helpers
  calcularTotalesDesdeTotal,
  calcularTotalesDesdeNeto,
};

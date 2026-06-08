// Cliente Factus — Facturación Electrónica DIAN Colombia
// Bolsa Multifacturador: una cuenta Carolina, todos los clientes facturan
const axios = require('axios');
const logger = require('./logger');

// Códigos DANE para municipios colombianos más comunes
const DANE_MUNICIPIOS = {
  'bogota': '11001', 'bogotá': '11001',
  'medellin': '05001', 'medellín': '05001',
  'cali': '76001',
  'barranquilla': '08001',
  'cartagena': '13001',
  'cucuta': '54001', 'cúcuta': '54001',
  'bucaramanga': '68001',
  'pereira': '66001',
  'santa marta': '47001',
  'ibague': '73001', 'ibagué': '73001',
  'pasto': '52001',
  'manizales': '17001',
  'neiva': '41001',
  'villavicencio': '50001',
  'armenia': '63001',
  'monteria': '23001', 'montería': '23001',
  'valledupar': '20001',
  'sincelejo': '70001',
  'popayan': '19001', 'popayán': '19001',
  'tunja': '15001',
  'florencia': '18001',
  'quibdo': '27001', 'quibdó': '27001',
  'riohacha': '44001',
  'san gil': '68679',
  'bello': '05088',
  'itagui': '05360', 'itagüí': '05360',
  'envigado': '05266',
  'buenaventura': '76109',
  'palmira': '76520',
  'buga': '76111',
  'tulua': '76834', 'tuluá': '76834',
  'calarca': '63130', 'calarcá': '63130',
  'la tebaida': '63401',
  'circasia': '63212',
  'montenegro': '63470',
  'quimbaya': '63594',
  'filandia': '63272',
  'espinal': '73268',
  'girardot': '25307',
  'fusagasuga': '25290', 'fusagasugá': '25290',
  'facatativa': '25269', 'facatativá': '25269',
  'zipaquira': '25899', 'zipaquirá': '25899',
  'soacha': '25754',
  'chia': '25175', 'chía': '25175',
  'cajica': '25126', 'cajicá': '25126',
  'mosquera': '25473',
  'madrid': '25430',
  'funza': '25286',
  'tocancipa': '25817', 'tocancipá': '25817',
  'gachancipa': '25295', 'gachanciipá': '25295',
  'yopal': '85001',
  'arauca': '81001',
  'mocoa': '86001',
  'mitu': '97001', 'mitú': '97001',
  'puerto inirida': '94001', 'puerto inírida': '94001',
  'san jose del guaviare': '95001', 'san josé del guaviare': '95001',
  'leticia': '91001',
  'puerto carreno': '99001', 'puerto carreño': '99001',
  'inirida': '94001',
};

function getMunicipioCode(ciudad) {
  if (!ciudad) return '11001';
  const key = ciudad.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes para normalizar
    .trim();
  // buscar primero con tildes normalizadas, luego tal cual
  const normalizedMap = {};
  for (const [k, v] of Object.entries(DANE_MUNICIPIOS)) {
    const nk = k.normalize('NFD').replace(/[̀-ͯ]/g, '');
    normalizedMap[nk] = v;
  }
  return normalizedMap[key] || DANE_MUNICIPIOS[ciudad.toLowerCase().trim()] || '11001';
}

// Mapeo de métodos de pago Carolina → Factus
const PAGO_MAP = {
  efectivo:        { payment_method_code: '10', payment_form: '1' },
  tarjeta_credito: { payment_method_code: '48', payment_form: '1' },
  tarjeta_debito:  { payment_method_code: '49', payment_form: '1' },
  transferencia:   { payment_method_code: '47', payment_form: '1' },
  credito:         { payment_method_code: '10', payment_form: '2' },
};

class FactusClient {
  constructor() {
    this.baseURL = process.env.FACTUS_BASE_URL || 'https://api-sandbox.factus.com.co';
    this.clientId     = process.env.FACTUS_CLIENT_ID;
    this.clientSecret = process.env.FACTUS_CLIENT_SECRET;
    this.username     = process.env.FACTUS_USERNAME;
    this.password     = process.env.FACTUS_PASSWORD;
    this._token      = null;
    this._tokenExpiry = 0;
  }

  // ── Autenticación con cache del token ─────────────────
  async getToken() {
    // Renovar si expira en menos de 5 minutos
    if (this._token && Date.now() < this._tokenExpiry - 300_000) {
      return this._token;
    }
    const params = new URLSearchParams({
      grant_type:    'password',
      client_id:     this.clientId,
      client_secret: this.clientSecret,
      username:      this.username,
      password:      this.password,
    });
    const { data } = await axios.post(`${this.baseURL}/oauth/token`, params, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    });
    this._token      = data.access_token;
    this._tokenExpiry = Date.now() + data.expires_in * 1_000;
    logger.debug('Factus token renovado');
    return this._token;
  }

  async _req(method, path, body = null) {
    const token = await this.getToken();
    const config = {
      method,
      url: `${this.baseURL}${path}`,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 20_000,
    };
    if (body) config.data = body;
    try {
      const { data } = await axios(config);
      return data;
    } catch (err) {
      const detail = err.response?.data;
      logger.error('Factus API error', { path, status: err.response?.status, detail });
      throw new Error(`Factus: ${JSON.stringify(detail?.message || detail?.errors || err.message)}`);
    }
  }

  // ── Crear y validar factura electrónica ───────────────
  async crearFactura({ referenceCode, items, cliente, metodoPago, numbering_range_id }) {
    const pago = PAGO_MAP[metodoPago] || PAGO_MAP.efectivo;
    const hoy  = new Date().toISOString().split('T')[0];

    // Datos del comprador
    let customer;
    if (!cliente) {
      customer = {
        identification_document_code: '13',
        identification:               '222222222222',
        names:                        'Consumidor Final',
        legal_organization_code:      '2',
        tribute_code:                 'ZZ',
      };
    } else {
      const esNIT = cliente.tipo_documento === 'NIT';
      customer = {
        identification_document_code: esNIT ? '31' : '13',
        identification:               cliente.numero_documento,
        legal_organization_code:      esNIT ? '1' : '2',
        tribute_code:                 'ZZ',
        address:                      cliente.direccion  || '',
        email:                        cliente.email      || '',
        phone:                        cliente.telefono   || '',
        municipality_code:            getMunicipioCode(cliente.ciudad),
      };
      if (esNIT) {
        customer.company    = cliente.nombre;
        customer.trade_name = cliente.nombre;
      } else {
        customer.names = cliente.nombre;
      }
    }

    // Items de la factura
    const factusItems = items.map(item => {
      const iva = parseFloat(item.iva_rate ?? item.impuesto_iva ?? 0);
      return {
        code_reference:   (item.codigo || item.producto_id?.substring(0, 10) || 'PRD').substring(0, 20),
        name:             item.descripcion,
        quantity:         parseFloat(item.cantidad).toFixed(2),
        discount_rate:    parseFloat(item.descuento || 0).toFixed(2),
        price:            parseFloat(item.precio_unitario).toFixed(2),
        unit_measure_code:'94',   // Unidad
        standard_code:    '999',  // Adopción del contribuyente
        taxes: iva > 0
          ? [{ code: '01', rate: iva.toFixed(2) }]
          : [{ is_excluded: true }],
      };
    });

    // Total para el medio de pago
    const totalFactura = items.reduce((s, item) => {
      const base = parseFloat(item.precio_unitario) * parseFloat(item.cantidad) * (1 - parseFloat(item.descuento || 0) / 100);
      const iva  = parseFloat(item.iva_rate ?? item.impuesto_iva ?? 0);
      return s + base + base * iva / 100;
    }, 0);

    const body = {
      reference_code:  referenceCode,
      document:        '01',
      operation_type:  '10',
      send_email:      false,
      payment_details: [{
        payment_form:        pago.payment_form,
        payment_method_code: pago.payment_method_code,
        amount:              totalFactura.toFixed(2),
        ...(pago.payment_form === '2' ? {
          due_date: new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0],
        } : {}),
      }],
      customer,
      items: factusItems,
    };

    if (numbering_range_id) body.numbering_range_id = numbering_range_id;

    return this._req('POST', '/v2/bills/validate', body);
  }

  // ── Obtener PDF de una factura ────────────────────────
  async obtenerPDF(numeroBill) {
    return this._req('GET', `/v2/bills/${numeroBill}/download-pdf`);
  }

  // ── Ver factura ───────────────────────────────────────
  async verFactura(numeroBill) {
    return this._req('GET', `/v2/bills/${numeroBill}`);
  }

  // ── Enviar factura por email ──────────────────────────
  async enviarEmail(numeroBill, email) {
    return this._req('POST', `/v2/bills/${numeroBill}/send-email`, { email });
  }

  // ── Crear nota crédito (anulación) ────────────────────
  async crearNotaCredito({ numeroBill, referenceCode, items, metodoPago, numbering_range_id }) {
    const pago = PAGO_MAP[metodoPago] || PAGO_MAP.efectivo;
    const total = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);

    const body = {
      reference_code:        referenceCode,
      correction_concept_code: '2', // Anulación de factura electrónica
      customization_id:      '20',
      bill_number:           numeroBill,
      payment_details: [{
        payment_form:        pago.payment_form,
        payment_method_code: pago.payment_method_code,
        amount:              total.toFixed(2),
      }],
      items: items.map(item => ({
        code_reference:    (item.codigo || 'PRD').substring(0, 20),
        name:              item.descripcion,
        quantity:          parseFloat(item.cantidad).toFixed(2),
        discount_rate:     '0.00',
        price:             parseFloat(item.precio_unitario).toFixed(2),
        unit_measure_code: '94',
        standard_code:     '999',
        taxes:             [{ is_excluded: true }],
      })),
    };

    if (numbering_range_id) body.numbering_range_id = numbering_range_id;
    return this._req('POST', '/v2/credit-notes/validate', body);
  }

  // ── Rangos de numeración ──────────────────────────────
  async listarRangos() {
    return this._req('GET', '/v2/numbering-ranges?filter[is_active]=1&filter[document]=21');
  }

  async crearRango({ prefix, resolution_number, current = 1 }) {
    return this._req('POST', '/v2/numbering-ranges', {
      document: '21',
      prefix,
      resolution_number,
      current,
    });
  }

  // ── Info de la empresa configurada ───────────────────
  async verEmpresa() {
    return this._req('GET', '/v2/companies');
  }

  // ── Suscripciones/cuotas disponibles ─────────────────
  async verSuscripciones() {
    return this._req('GET', '/v2/subscriptions');
  }
}

// Singleton — reutiliza el token entre requests
let _instance = null;
function getFactusClient() {
  if (!_instance) _instance = new FactusClient();
  return _instance;
}

module.exports = { FactusClient, getFactusClient };

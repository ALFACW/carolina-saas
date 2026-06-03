const axios = require('axios');
const logger = require('./logger');

class AlegraClient {
  constructor(usuario, token) {
    if (!usuario || !token) throw new Error('Credenciales de Alegra requeridas');
    this.baseURL = process.env.ALEGRA_BASE_URL || 'https://api.alegra.com/api/v1';
    this.auth = { username: usuario, password: token };
  }

  async _request(method, path, data = null, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = {
          method,
          url: `${this.baseURL}${path}`,
          auth: this.auth,
          timeout: 10000,
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        };
        if (data) config.data = data;

        const response = await axios(config);
        return response.data;
      } catch (err) {
        const status = err.response?.status;
        logger.warn(`Alegra API error (intento ${attempt}/${retries})`, { path, status, msg: err.message });

        if (status === 401) throw new Error('Credenciales de Alegra inválidas');
        if (status === 400) throw new Error(`Error en datos enviados a Alegra: ${JSON.stringify(err.response?.data)}`);
        if (status === 429) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        if (attempt === retries) throw new Error(`Alegra no disponible: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async validarCredenciales() {
    const data = await this._request('GET', '/company');
    return { valido: true, empresa: data };
  }

  async crearContacto(cliente) {
    const contacto = {
      identification: cliente.numero_documento,
      name: cliente.nombre,
      email: cliente.email || undefined,
      phonePrimary: cliente.telefono || undefined,
      type: ['client'],
    };
    if (cliente.direccion || cliente.ciudad) {
      contacto.address = {
        address: cliente.direccion || '',
        city: cliente.ciudad || '',
      };
    }
    return this._request('POST', '/contacts', contacto);
  }

  async buscarContacto(numeroDocumento) {
    try {
      const result = await this._request('GET', `/contacts?identification=${encodeURIComponent(numeroDocumento)}`);
      return Array.isArray(result) ? result[0] : null;
    } catch {
      return null;
    }
  }

  async crearFactura(datos) {
    return this._request('POST', '/invoices', {
      ...datos,
      stamp: { generateStamp: true },
    });
  }

  async obtenerFactura(alegraId) {
    return this._request('GET', `/invoices/${alegraId}`);
  }

  async obtenerPDF(alegraId) {
    const factura = await this._request('GET', `/invoices/${alegraId}`);
    return factura.pdf || factura.pdfUrl || null;
  }

  async crearNotaCredito(notaData) {
    return this._request('POST', '/credit-notes', notaData);
  }
}

module.exports = AlegraClient;

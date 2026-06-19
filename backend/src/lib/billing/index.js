// Factory de billing — elige proveedor según país del tenant
const factus   = require('./factus');
const simpleapi = require('./simpleapi');

/**
 * Retorna el cliente de facturación electrónica correspondiente al país del tenant.
 * @param {object} tenant — objeto tenant con campo country ('CO' | 'CL')
 */
function getBillingProvider(tenant) {
  if (tenant.country === 'CL') return simpleapi;
  return factus; // default Colombia
}

module.exports = { getBillingProvider };

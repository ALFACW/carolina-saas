const db = require('../db');
const logger = require('../lib/logger');

async function getEstado(req, res, next) {
  try {
    const tenant = req.tenant;
    res.json({
      onboarding_completado: tenant.onboarding_completado,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEstado };

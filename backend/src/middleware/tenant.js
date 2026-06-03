const db = require('../db');
const logger = require('../lib/logger');

async function tenantMiddleware(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tenants WHERE id = $1 AND estado = $2',
      [req.user.tenant_id, 'activo']
    );

    if (!rows.length) {
      return res.status(403).json({ error: 'Tenant no encontrado o suspendido' });
    }

    req.tenant = rows[0];
    next();
  } catch (err) {
    logger.error('Error cargando tenant', { error: err.message });
    next(err);
  }
}

module.exports = tenantMiddleware;

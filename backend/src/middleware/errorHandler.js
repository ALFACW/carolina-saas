const logger = require('../lib/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error no manejado', {
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      detalles: err.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message })),
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Error interno del servidor';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;

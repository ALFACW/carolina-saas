const logger = require('../lib/logger');

// Mensajes amigables para códigos de error PostgreSQL
const PG_MESSAGES = {
  '23505': 'Ya existe un registro con ese valor (duplicado).',
  '23503': 'No se puede eliminar: tiene registros asociados.',
  '23502': 'Falta un campo requerido en la base de datos.',
  '22001': 'El valor ingresado es demasiado largo.',
  '22003': 'El número ingresado está fuera del rango permitido.',
  '08006': 'Error de conexión con la base de datos. Intenta de nuevo.',
  '08001': 'Error de conexión con la base de datos. Intenta de nuevo.',
  '57014': 'La operación tardó demasiado y fue cancelada. Intenta de nuevo.',
  '42703': 'Error de configuración interna (columna no encontrada).',
  '42P01': 'Error de configuración interna (tabla no encontrada).',
};

function getMessageFromError(err) {
  // Error de PostgreSQL con código conocido
  if (err.code && PG_MESSAGES[err.code]) {
    return { status: 400, message: PG_MESSAGES[err.code] };
  }

  // Error de Factus — viene como "Factus: ..." y es información útil para el usuario
  if (err.message?.startsWith('Factus:')) {
    const detail = err.message.replace('Factus:', '').trim();
    // Limpiar JSON crudo si viene así
    let friendly = detail;
    try {
      const parsed = JSON.parse(detail);
      if (typeof parsed === 'string') friendly = parsed;
      else if (parsed?.message) friendly = parsed.message;
      else if (parsed?.errors) friendly = Object.values(parsed.errors).flat().join('. ');
    } catch (_) {}
    return { status: 422, message: `Error DIAN/Factus: ${friendly}` };
  }

  // Timeout de red / conexión rechazada
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return { status: 503, message: 'No se pudo conectar con un servicio externo. Intenta de nuevo en unos segundos.' };
  }

  // Error de axios (llamadas a APIs externas)
  if (err.isAxiosError) {
    const apiMsg = err.response?.data?.message || err.response?.data?.error || err.message;
    return { status: err.response?.status || 502, message: `Error de servicio externo: ${apiMsg}` };
  }

  return null;
}

function errorHandler(err, req, res, next) {
  logger.error('Error no manejado', {
    error: err.message,
    code: err.code,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Error de validación Zod — campos inválidos con detalle por campo
  if (err.name === 'ZodError') {
    const primero = err.errors[0];
    const campoLabel = primero?.path?.length ? `"${primero.path.join('.')}"` : '';
    const resumen = campoLabel
      ? `Campo ${campoLabel}: ${primero.message}`
      : primero?.message || 'Datos de entrada inválidos';
    return res.status(400).json({
      error: resumen,
      detalles: err.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message })),
    });
  }

  // Errores con status explícito (lanzados a propósito en los controllers)
  const status = err.status || err.statusCode;
  if (status && status < 500) {
    return res.status(status).json({ error: err.message });
  }

  // Intentar obtener mensaje específico del tipo de error
  const mapped = getMessageFromError(err);
  if (mapped) {
    return res.status(mapped.status).json({ error: mapped.message });
  }

  // Error desconocido — no exponer detalles internos
  res.status(500).json({ error: 'Error interno del servidor. Si el problema persiste contacta soporte.' });
}

module.exports = errorHandler;

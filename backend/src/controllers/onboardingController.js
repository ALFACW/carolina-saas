const { z } = require('zod');
const db = require('../db');
const { encrypt } = require('../lib/crypto');
const AlegraClient = require('../lib/alegra');
const logger = require('../lib/logger');

async function getEstado(req, res, next) {
  try {
    const tenant = req.tenant;
    res.json({
      onboarding_completado: tenant.onboarding_completado,
      alegra_conectado: tenant.alegra_conectado,
      alegra_user: tenant.alegra_user || null,
    });
  } catch (err) {
    next(err);
  }
}

const validarSchema = z.object({
  alegra_user: z.string().min(1, 'Usuario de Alegra requerido'),
  alegra_token: z.string().min(1, 'Token de Alegra requerido'),
});

async function validarAlegra(req, res, next) {
  try {
    const { alegra_user, alegra_token } = validarSchema.parse(req.body);

    const alegraClient = new AlegraClient(alegra_user, alegra_token);
    let empresa;
    try {
      const result = await alegraClient.validarCredenciales();
      empresa = result.empresa;
    } catch (err) {
      return res.status(400).json({ error: `Credenciales de Alegra inválidas: ${err.message}` });
    }

    const tokenEncriptado = encrypt(alegra_token);

    await db.query(
      `UPDATE tenants SET alegra_user = $1, alegra_token_encrypted = $2, alegra_conectado = true, onboarding_completado = true, fecha_actualizacion = NOW()
       WHERE id = $3`,
      [alegra_user, tokenEncriptado, req.tenant.id]
    );

    logger.info('Alegra conectado para tenant', { tenant_id: req.tenant.id, alegra_user });

    res.json({
      mensaje: '¡Conexión exitosa con Alegra! Ya puedes emitir facturas electrónicas.',
      empresa: empresa?.name || empresa?.nombre || 'Tu empresa',
      alegra_conectado: true,
    });
  } catch (err) {
    next(err);
  }
}

async function desconectarAlegra(req, res, next) {
  try {
    await db.query(
      `UPDATE tenants SET alegra_user = NULL, alegra_token_encrypted = NULL, alegra_conectado = false, onboarding_completado = false, fecha_actualizacion = NOW()
       WHERE id = $1`,
      [req.tenant.id]
    );
    logger.info('Alegra desconectado para tenant', { tenant_id: req.tenant.id });
    res.json({ mensaje: 'Alegra desconectado. Puedes reconectar con nuevas credenciales.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEstado, validarAlegra, desconectarAlegra };

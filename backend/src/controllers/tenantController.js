const { z } = require('zod');
const db = require('../db');
const logger = require('../lib/logger');

async function getMe(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, nit, email, telefono, direccion, ciudad, plan, estado, alegra_conectado, onboarding_completado, fecha_creacion FROM tenants WHERE id = $1',
      [req.tenant.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

const updateSchema = z.object({
  nombre:    z.string().min(2).optional(),
  telefono:  z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  ciudad:    z.string().nullable().optional(),
});

async function updateMe(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Sin datos para actualizar' });
    const set = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);
    const { rows } = await db.query(
      `UPDATE tenants SET ${set}, fecha_actualizacion = NOW() WHERE id = $1 RETURNING id, nombre, nit, email, telefono, direccion, ciudad, plan`,
      [req.tenant.id, ...values]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function changePlan(req, res, next) {
  try {
    const { plan } = z.object({ plan: z.enum(['starter', 'basico', 'profesional', 'empresarial']) }).parse(req.body);
    await db.query('UPDATE tenants SET plan = $1, fecha_actualizacion = NOW() WHERE id = $2', [plan, req.tenant.id]);
    logger.info('Plan cambiado', { tenant_id: req.tenant.id, plan });
    res.json({ mensaje: `Plan actualizado a ${plan}`, plan });
  } catch (err) { next(err); }
}

async function getUsage(req, res, next) {
  try {
    const { rows: planRows } = await db.query('SELECT * FROM planes_config WHERE tipo_plan = $1', [req.tenant.plan]);
    const plan = planRows[0] || {};
    const hoy = new Date().toISOString().split('T')[0];
    const [users, ventasHoy] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM users WHERE tenant_id = $1 AND activo = true', [req.tenant.id]),
      db.query(
        `SELECT COUNT(*) as total FROM facturas WHERE tenant_id = $1 AND fecha_emision >= $2::date AND fecha_emision < ($2::date + INTERVAL '1 day')`,
        [req.tenant.id, hoy]
      ),
    ]);
    res.json({
      plan: req.tenant.plan,
      limites: { max_usuarios: plan.max_usuarios, max_ventas_dia: plan.max_ventas_dia, precio_mensual: plan.precio_mensual },
      uso: { usuarios: parseInt(users.rows[0].total), ventas_hoy: parseInt(ventasHoy.rows[0].total) },
    });
  } catch (err) { next(err); }
}

module.exports = { getMe, updateMe, changePlan, getUsage };

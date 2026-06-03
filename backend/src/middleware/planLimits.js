const db = require('../db');
const logger = require('../lib/logger');

function checkPlanLimit(tipo) {
  return async (req, res, next) => {
    try {
      const { rows: planRows } = await db.query(
        'SELECT * FROM planes_config WHERE tipo_plan = $1',
        [req.tenant.plan]
      );

      if (!planRows.length) return next();
      const plan = planRows[0];

      if (tipo === 'usuarios') {
        const { rows } = await db.query(
          'SELECT COUNT(*) as total FROM users WHERE tenant_id = $1 AND activo = true',
          [req.tenant.id]
        );
        const total = parseInt(rows[0].total);
        const max = plan.max_usuarios;

        if (total >= max) {
          return res.status(403).json({
            error: `Has alcanzado el límite de ${max} usuario(s) en tu plan ${req.tenant.plan}. Actualiza para continuar.`,
            plan_actual: req.tenant.plan,
            limite: max,
            uso_actual: total,
          });
        }
        if (total >= max * 0.8) {
          req.planWarning = `Estás cerca del límite de usuarios de tu plan (${total}/${max})`;
        }
      }

      if (tipo === 'ventas_dia') {
        const hoy = new Date().toISOString().split('T')[0];
        const { rows } = await db.query(
          `SELECT COUNT(*) as total FROM facturas
           WHERE tenant_id = $1 AND fecha_emision >= $2::date AND fecha_emision < ($2::date + INTERVAL '1 day')`,
          [req.tenant.id, hoy]
        );
        const total = parseInt(rows[0].total);
        const max = plan.max_ventas_dia;

        if (total >= max) {
          return res.status(403).json({
            error: `Has alcanzado el límite de ${max} ventas por día en tu plan ${req.tenant.plan}. Actualiza para continuar.`,
            plan_actual: req.tenant.plan,
            limite: max,
            uso_actual: total,
          });
        }
        if (total >= max * 0.8) {
          req.planWarning = `Estás cerca del límite diario de ventas de tu plan (${total}/${max})`;
        }
      }

      next();
    } catch (err) {
      logger.error('Error verificando límite de plan', { error: err.message });
      next(err);
    }
  };
}

module.exports = { checkPlanLimit };

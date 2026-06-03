require('dotenv').config();
const db = require('./index');
const logger = require('../lib/logger');

async function seed() {
  logger.info('Ejecutando seed...');

  const planes = [
    { tipo_plan: 'starter',     max_usuarios: 1,   max_cajas: 1,   max_bodegas: 1,   max_ventas_dia: 30,  precio_mensual: 129000 },
    { tipo_plan: 'basico',      max_usuarios: 3,   max_cajas: 3,   max_bodegas: 3,   max_ventas_dia: 100, precio_mensual: 179000 },
    { tipo_plan: 'profesional', max_usuarios: 10,  max_cajas: 999, max_bodegas: 999, max_ventas_dia: 300, precio_mensual: 279000 },
    { tipo_plan: 'empresarial', max_usuarios: 999, max_cajas: 999, max_bodegas: 999, max_ventas_dia: 800, precio_mensual: 489000 },
  ];

  for (const plan of planes) {
    await db.query(`
      INSERT INTO planes_config (tipo_plan, max_usuarios, max_cajas, max_bodegas, max_ventas_dia, precio_mensual)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tipo_plan) DO UPDATE SET
        max_usuarios = EXCLUDED.max_usuarios,
        max_cajas = EXCLUDED.max_cajas,
        max_bodegas = EXCLUDED.max_bodegas,
        max_ventas_dia = EXCLUDED.max_ventas_dia,
        precio_mensual = EXCLUDED.precio_mensual
    `, [plan.tipo_plan, plan.max_usuarios, plan.max_cajas, plan.max_bodegas, plan.max_ventas_dia, plan.precio_mensual]);
    logger.info(`Plan ${plan.tipo_plan} OK`);
  }

  // Crear caja principal para tenants que no tengan cajas
  await db.query(`
    INSERT INTO cajas (tenant_id, nombre, descripcion)
    SELECT id, 'Caja Principal', 'Caja predeterminada'
    FROM tenants t
    WHERE NOT EXISTS (SELECT 1 FROM cajas c WHERE c.tenant_id = t.id)
  `)
  logger.info('Cajas por defecto creadas para tenants existentes')

  logger.info('Seed completado.');
  process.exit(0);
}

seed().catch(err => {
  logger.error('Error en seed', { error: err.message });
  process.exit(1);
});

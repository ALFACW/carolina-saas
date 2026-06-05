const { z } = require('zod')
const bcrypt = require('bcrypt')
const db = require('../db')
const { generateAccessToken } = require('../lib/jwt')
const logger = require('../lib/logger')

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const updateTenantSchema = z.object({
  plan:              z.enum(['basico', 'profesional', 'empresarial']).optional(),
  estado:            z.enum(['activo', 'suspendido', 'cancelado']).optional(),
  modo_caja:         z.enum(['simple', 'multicaja']).optional(),
  nombre:            z.string().min(2).optional(),
  notas:             z.string().optional().nullable(),
})

// POST /api/super-admin/login
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const superEmail    = process.env.SUPER_ADMIN_EMAIL
    const superPassword = process.env.SUPER_ADMIN_PASSWORD

    if (!superEmail || !superPassword) {
      logger.error('SUPER_ADMIN_EMAIL o SUPER_ADMIN_PASSWORD no configurados en .env')
      return res.status(503).json({ error: 'Super admin no configurado en el servidor' })
    }

    if (email !== superEmail || password !== superPassword) {
      logger.warn('Intento de login super admin fallido', { email })
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = generateAccessToken({
      id:  'carolina_admin',
      rol: 'carolina_admin',
    })

    logger.info('Login super admin exitoso', { email })
    res.json({ token, rol: 'carolina_admin' })
  } catch (err) { next(err) }
}

// Middleware para proteger rutas de super admin
function requireSuperAdmin(req, res, next) {
  if (req.user?.rol !== 'carolina_admin') {
    return res.status(403).json({ error: 'Acceso restringido a super administradores' })
  }
  next()
}

// GET /api/super-admin/tenants — lista todos los tenants con estadísticas
async function getTenants(req, res, next) {
  try {
    const { estado, plan, search, limit = 50, offset = 0 } = req.query
    const conditions = ['1=1']
    const params = []
    let idx = 1

    if (estado) { conditions.push(`t.estado = $${idx++}`); params.push(estado) }
    if (plan)   { conditions.push(`t.plan = $${idx++}`);   params.push(plan) }
    if (search) {
      conditions.push(`(t.nombre ILIKE $${idx} OR t.nit ILIKE $${idx} OR t.email ILIKE $${idx})`)
      params.push(`%${search}%`)
      idx++
    }

    const { rows } = await db.query(
      `SELECT
         t.id, t.nombre, t.nit, t.email, t.telefono, t.ciudad,
         t.plan, t.estado, t.modo_caja,
         t.onboarding_completado,
         t.fecha_creacion, t.fecha_actualizacion,
         (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.activo = true)  AS usuarios_activos,
         (SELECT COUNT(*) FROM facturas f WHERE f.tenant_id = t.id)                   AS total_facturas,
         (SELECT COUNT(*) FROM facturas f WHERE f.tenant_id = t.id
           AND f.fecha_emision >= NOW() - INTERVAL '30 days')                         AS facturas_30d,
         (SELECT COALESCE(SUM(f.total),0) FROM facturas f WHERE f.tenant_id = t.id
           AND f.estado != 'anulada'
           AND f.fecha_emision >= NOW() - INTERVAL '30 days')                         AS ventas_30d
       FROM tenants t
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.fecha_creacion DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), parseInt(offset)]
    )

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total FROM tenants t WHERE ${conditions.join(' AND ')}`,
      params
    )

    res.json({ tenants: rows, total: parseInt(countRows[0].total) })
  } catch (err) { next(err) }
}

// GET /api/super-admin/tenants/:id — detalle de un tenant
async function getTenantById(req, res, next) {
  try {
    const [tenantRows, userRows, factRows] = await Promise.all([
      db.query(
        `SELECT id, nombre, nit, email, telefono, direccion, ciudad,
                plan, estado, modo_caja,
                onboarding_completado, fecha_creacion, fecha_actualizacion
         FROM tenants WHERE id = $1`,
        [req.params.id]
      ),
      db.query(
        'SELECT id, nombre, email, rol, activo, ultimo_login FROM users WHERE tenant_id = $1 ORDER BY fecha_creacion',
        [req.params.id]
      ),
      db.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN estado != 'anulada' THEN total ELSE 0 END), 0) AS monto_total,
           COALESCE(SUM(CASE WHEN fecha_emision >= NOW() - INTERVAL '30 days' AND estado != 'anulada' THEN total ELSE 0 END), 0) AS monto_30d,
           COUNT(CASE WHEN fecha_emision >= NOW() - INTERVAL '30 days' THEN 1 END) AS count_30d
         FROM facturas WHERE tenant_id = $1`,
        [req.params.id]
      ),
    ])

    if (!tenantRows.rows.length) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    res.json({
      tenant:     tenantRows.rows[0],
      usuarios:   userRows.rows,
      estadisticas: factRows.rows[0],
    })
  } catch (err) { next(err) }
}

// PUT /api/super-admin/tenants/:id — actualizar tenant (plan, estado, etc.)
async function updateTenant(req, res, next) {
  try {
    const data = updateTenantSchema.parse(req.body)
    const updates = []
    const values = []
    let idx = 2

    if (data.plan             !== undefined) { updates.push(`plan = $${idx++}`);      values.push(data.plan) }
    if (data.estado           !== undefined) { updates.push(`estado = $${idx++}`);   values.push(data.estado) }
    if (data.modo_caja        !== undefined) { updates.push(`modo_caja = $${idx++}`); values.push(data.modo_caja) }
    if (data.nombre           !== undefined) { updates.push(`nombre = $${idx++}`);   values.push(data.nombre) }

    if (!updates.length) return res.status(400).json({ error: 'Sin datos para actualizar' })

    updates.push(`fecha_actualizacion = NOW()`)

    const { rows } = await db.query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $1
       RETURNING id, nombre, nit, email, plan, estado, modo_caja, onboarding_completado`,
      [req.params.id, ...values]
    )
    if (!rows.length) return res.status(404).json({ error: 'Tenant no encontrado' })

    logger.info('Tenant actualizado por super admin', {
      tenant_id: req.params.id,
      cambios: Object.keys(data),
    })
    res.json(rows[0])
  } catch (err) { next(err) }
}

// GET /api/super-admin/estadisticas — estadísticas globales del SaaS
async function getEstadisticas(req, res, next) {
  try {
    const [tenantsStats, ventasStats, topPlanes] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)                                               AS total_tenants,
           COUNT(*) FILTER (WHERE estado = 'activo')             AS tenants_activos,
           COUNT(*) FILTER (WHERE estado = 'suspendido')         AS tenants_suspendidos,
           COUNT(*) FILTER (WHERE fecha_creacion >= NOW() - INTERVAL '30 days') AS nuevos_30d
         FROM tenants`
      ),
      db.query(
        `SELECT
           COUNT(*)                                                                         AS total_facturas,
           COALESCE(SUM(CASE WHEN estado != 'anulada' THEN total ELSE 0 END), 0)           AS monto_total,
           COALESCE(SUM(CASE WHEN fecha_emision >= NOW() - INTERVAL '30 days' AND estado != 'anulada' THEN total ELSE 0 END), 0) AS monto_30d,
           COUNT(CASE WHEN fecha_emision >= NOW() - INTERVAL '30 days' THEN 1 END)         AS facturas_30d,
           COUNT(CASE WHEN fecha_emision >= NOW() - INTERVAL '1 day'   THEN 1 END)         AS facturas_hoy
         FROM facturas`
      ),
      db.query(
        `SELECT plan, COUNT(*) AS cantidad
         FROM tenants
         GROUP BY plan
         ORDER BY cantidad DESC`
      ),
    ])

    res.json({
      tenants:    tenantsStats.rows[0],
      ventas:     ventasStats.rows[0],
      planes:     topPlanes.rows,
    })
  } catch (err) { next(err) }
}

module.exports = { login, requireSuperAdmin, getTenants, getTenantById, updateTenant, getEstadisticas }

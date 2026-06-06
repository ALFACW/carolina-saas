const { z } = require('zod')
const db = require('../db')
const logger = require('../lib/logger')

// POST /api/sesiones/abrir — cajero abre su turno
async function abrir(req, res, next) {
  try {
    const { caja_id, fondo_inicial } = z.object({
      caja_id:       z.string().uuid().optional().nullable(),
      fondo_inicial: z.coerce.number().min(0).default(0),
    }).parse(req.body)

    // Verificar que el cajero no tiene ya una sesión abierta en este tenant
    const { rows: abierta } = await db.query(
      "SELECT id FROM sesiones_caja WHERE cajero_id = $1 AND tenant_id = $2 AND estado = 'abierta'",
      [req.user.id, req.tenant.id]
    )
    if (abierta.length) {
      return res.status(400).json({ error: 'Ya tienes una sesión abierta. Ciérrala antes de abrir una nueva.' })
    }

    if (caja_id) {
      const { rows: cajaRows } = await db.query(
        'SELECT id FROM cajas WHERE id = $1 AND tenant_id = $2 AND activo = true',
        [caja_id, req.tenant.id]
      )
      if (!cajaRows.length) {
        return res.status(404).json({ error: 'Caja no encontrada o inactiva' })
      }
    }

    const { rows } = await db.query(
      `INSERT INTO sesiones_caja (tenant_id, caja_id, cajero_id, fondo_inicial)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.tenant.id, caja_id || null, req.user.id, fondo_inicial]
    )

    const sesion = rows[0]
    let caja_nombre = null
    if (sesion.caja_id) {
      const { rows: cajaInfo } = await db.query('SELECT nombre FROM cajas WHERE id = $1', [sesion.caja_id])
      caja_nombre = cajaInfo[0]?.nombre || null
    }

    logger.info('Sesión de caja abierta', { sesion_id: sesion.id, cajero_id: req.user.id, caja_id })
    res.status(201).json({ ...sesion, caja_nombre })
  } catch (err) { next(err) }
}

// GET /api/sesiones/activa — obtener sesión activa del cajero actual
async function getSesionActiva(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
         c.nombre AS caja_nombre,
         u.nombre AS cajero_nombre
       FROM sesiones_caja s
       LEFT JOIN cajas c ON s.caja_id = c.id
       JOIN users u ON s.cajero_id = u.id
       WHERE s.cajero_id = $1 AND s.tenant_id = $2 AND s.estado = 'abierta'
       ORDER BY s.fecha_apertura DESC
       LIMIT 1`,
      [req.user.id, req.tenant.id]
    )
    res.json(rows[0] || null)
  } catch (err) { next(err) }
}

// POST /api/sesiones/:id/cerrar — cajero cierra su turno con cuadratura
async function cerrar(req, res, next) {
  try {
    const { efectivo_contado, notas_cierre, denominaciones, tipo_cierre, fondo_siguiente } = z.object({
      efectivo_contado: z.coerce.number().min(0),
      notas_cierre:     z.string().optional(),
      tipo_cierre:      z.enum(['cierre_final', 'cambio_turno']).default('cierre_final'),
      fondo_siguiente:  z.coerce.number().min(0).default(0),
      denominaciones:   z.array(z.object({
        denominacion: z.number(),
        cantidad:     z.number().int().min(0),
      })).optional(),
    }).parse(req.body)

    const { rows: sesRows } = await db.query(
      "SELECT * FROM sesiones_caja WHERE id = $1 AND tenant_id = $2 AND cajero_id = $3 AND estado = 'abierta'",
      [req.params.id, req.tenant.id, req.user.id]
    )
    if (!sesRows.length) {
      return res.status(404).json({ error: 'Sesión no encontrada, ya cerrada o no te pertenece' })
    }
    const sesion = sesRows[0]

    // Calcular totales + conteo de facturas
    const { rows: totales } = await db.query(
      `SELECT
         COUNT(*)                                                          AS num_facturas,
         COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo'
                          THEN total ELSE 0 END), 0)                      AS ventas_efectivo,
         COALESCE(SUM(CASE WHEN metodo_pago IN ('tarjeta_credito','tarjeta_debito','tarjeta')
                          THEN total ELSE 0 END), 0)                      AS ventas_tarjeta,
         COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia'
                          THEN total ELSE 0 END), 0)                      AS ventas_transferencia,
         COALESCE(SUM(CASE WHEN metodo_pago = 'credito'
                          THEN total ELSE 0 END), 0)                      AS ventas_credito,
         COALESCE(SUM(total), 0)                                          AS total_ventas
       FROM facturas
       WHERE sesion_id = $1 AND estado != 'anulada'`,
      [sesion.id]
    )
    const t = totales[0]
    const efectivoEsperado = parseFloat(sesion.fondo_inicial) + parseFloat(t.ventas_efectivo)
    const diferencia = parseFloat(efectivo_contado) - efectivoEsperado

    const { rows: closed } = await db.query(
      `UPDATE sesiones_caja SET
         estado            = 'cerrada',
         fecha_cierre      = NOW(),
         total_efectivo    = $1,
         total_tarjeta     = $2,
         total_transferencia = $3,
         total_credito     = $4,
         total_ventas      = $5,
         efectivo_contado  = $6,
         diferencia        = $7,
         notas_cierre      = $8,
         tipo_cierre       = $9,
         fondo_siguiente   = $10
       WHERE id = $11
       RETURNING *`,
      [
        t.ventas_efectivo, t.ventas_tarjeta, t.ventas_transferencia, t.ventas_credito,
        t.total_ventas, efectivo_contado, diferencia, notas_cierre || null,
        tipo_cierre, fondo_siguiente, sesion.id,
      ]
    )

    if (denominaciones?.length) {
      for (const d of denominaciones) {
        if (d.cantidad > 0) {
          await db.query(
            'INSERT INTO cierres_denominaciones (sesion_id, denominacion, cantidad) VALUES ($1, $2, $3)',
            [sesion.id, d.denominacion, d.cantidad]
          )
        }
      }
    }

    logger.info('Sesión de caja cerrada', { sesion_id: sesion.id, cajero_id: req.user.id, diferencia, tipo_cierre })
    res.json({
      sesion: closed[0],
      resumen: {
        fondo_inicial:       parseFloat(sesion.fondo_inicial),
        ventas_efectivo:     parseFloat(t.ventas_efectivo),
        efectivo_esperado:   efectivoEsperado,
        efectivo_contado:    parseFloat(efectivo_contado),
        diferencia,
        total_tarjeta:       parseFloat(t.ventas_tarjeta),
        total_transferencia: parseFloat(t.ventas_transferencia),
        total_credito:       parseFloat(t.ventas_credito),
        total_ventas:        parseFloat(t.total_ventas),
        num_facturas:        parseInt(t.num_facturas),
        tipo_cierre,
        fondo_siguiente:     parseFloat(fondo_siguiente),
      },
    })
  } catch (err) { next(err) }
}

// GET /api/sesiones — admin/supervisor: lista todas las sesiones del tenant
async function getAll(req, res, next) {
  try {
    if (!['admin', 'supervisor'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permiso para listar sesiones' })
    }

    const { fecha, caja_id, cajero_id, estado, limit = 50, offset = 0 } = req.query
    const conditions = ['s.tenant_id = $1']
    const params = [req.tenant.id]
    let idx = 2

    if (fecha)     { conditions.push(`DATE(s.fecha_apertura) = $${idx++}`); params.push(fecha) }
    if (caja_id)   { conditions.push(`s.caja_id = $${idx++}`);             params.push(caja_id) }
    if (cajero_id) { conditions.push(`s.cajero_id = $${idx++}`);           params.push(cajero_id) }
    if (estado)    { conditions.push(`s.estado = $${idx++}`);              params.push(estado) }

    const { rows } = await db.query(
      `SELECT s.*,
         c.nombre AS caja_nombre,
         u.nombre AS cajero_nombre
       FROM sesiones_caja s
       LEFT JOIN cajas c ON s.caja_id = c.id
       JOIN users u ON s.cajero_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.fecha_apertura DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), parseInt(offset)]
    )
    res.json(rows)
  } catch (err) { next(err) }
}

// GET /api/sesiones/:id — detalle de sesión con todas sus ventas
async function getById(req, res, next) {
  try {
    const [sesRows, factRows, denomRows] = await Promise.all([
      db.query(
        `SELECT s.*,
           c.nombre AS caja_nombre,
           u.nombre AS cajero_nombre,
           a.nombre AS aprobado_por_nombre
         FROM sesiones_caja s
         LEFT JOIN cajas c ON s.caja_id = c.id
         JOIN users u ON s.cajero_id = u.id
         LEFT JOIN users a ON s.aprobado_por = a.id
         WHERE s.id = $1 AND s.tenant_id = $2`,
        [req.params.id, req.tenant.id]
      ),
      db.query(
        `SELECT f.id, f.numero_factura, f.total, f.metodo_pago, f.estado, f.fecha_emision,
           cl.nombre AS cliente_nombre
         FROM facturas f
         LEFT JOIN clientes cl ON f.cliente_id = cl.id
         WHERE f.sesion_id = $1
         ORDER BY f.fecha_emision`,
        [req.params.id]
      ),
      db.query(
        'SELECT denominacion, cantidad, subtotal FROM cierres_denominaciones WHERE sesion_id = $1 ORDER BY denominacion DESC',
        [req.params.id]
      ),
    ])

    if (!sesRows.rows.length) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    res.json({
      ...sesRows.rows[0],
      facturas:       factRows.rows,
      denominaciones: denomRows.rows,
    })
  } catch (err) { next(err) }
}

// POST /api/sesiones/:id/aprobar — supervisor/admin aprueba el cierre
async function aprobar(req, res, next) {
  try {
    if (!['admin', 'supervisor'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Se requiere rol admin o supervisor para aprobar cierres' })
    }

    const { rows: sesRows } = await db.query(
      "SELECT * FROM sesiones_caja WHERE id = $1 AND tenant_id = $2 AND estado = 'cerrada'",
      [req.params.id, req.tenant.id]
    )
    if (!sesRows.length) {
      return res.status(404).json({ error: 'Sesión no encontrada o no está cerrada' })
    }
    if (sesRows[0].aprobado_por) {
      return res.status(400).json({ error: 'Esta sesión ya fue aprobada' })
    }

    const { rows } = await db.query(
      `UPDATE sesiones_caja
       SET aprobado_por = $1, fecha_aprobacion = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, req.params.id]
    )
    logger.info('Sesión aprobada', { sesion_id: req.params.id, aprobado_por: req.user.id })
    res.json({ mensaje: 'Sesión aprobada correctamente', sesion: rows[0] })
  } catch (err) { next(err) }
}

// GET /api/sesiones/ultima — última sesión cerrada (para pre-llenar fondo)
// Query param opcional: caja_id
async function getUltimaSesion(req, res, next) {
  try {
    const { caja_id } = req.query
    const conditions = ["s.tenant_id = $1", "s.estado IN ('cerrada','aprobada')", 's.fondo_siguiente > 0']
    const params = [req.tenant.id]

    if (caja_id) {
      conditions.push(`s.caja_id = $2`)
      params.push(caja_id)
    }

    const { rows } = await db.query(
      `SELECT s.id, s.fondo_siguiente, s.tipo_cierre, s.efectivo_contado,
              s.fecha_cierre, u.nombre AS cajero_nombre
         FROM sesiones_caja s
         JOIN users u ON s.cajero_id = u.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.fecha_cierre DESC
        LIMIT 1`,
      params
    )
    res.json(rows[0] || null)
  } catch (err) { next(err) }
}

module.exports = { abrir, getSesionActiva, cerrar, getAll, getById, aprobar, getUltimaSesion }

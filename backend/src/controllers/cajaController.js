const { z } = require('zod')
const db = require('../db')
const logger = require('../lib/logger')

const cajaSchema = z.object({
  nombre:      z.string().min(1),
  descripcion: z.string().optional(),
})

// GET /api/cajas — lista cajas del tenant con conteo de sesiones activas
async function getAll(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM sesiones_caja s
          WHERE s.caja_id = c.id AND s.estado = 'abierta') AS sesiones_activas
       FROM cajas c
       WHERE c.tenant_id = $1
       ORDER BY c.fecha_creacion`,
      [req.tenant.id]
    )
    res.json(rows)
  } catch (err) { next(err) }
}

// POST /api/cajas — crear nueva caja
async function create(req, res, next) {
  try {
    const { nombre, descripcion } = cajaSchema.parse(req.body)
    const { rows } = await db.query(
      `INSERT INTO cajas (tenant_id, nombre, descripcion)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.tenant.id, nombre, descripcion || null]
    )
    logger.info('Caja creada', { tenant_id: req.tenant.id, caja_id: rows[0].id, nombre })
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
}

// PUT /api/cajas/:id — actualizar caja
async function update(req, res, next) {
  try {
    const data = cajaSchema.extend({ activo: z.boolean().optional() }).partial().parse(req.body)

    const updates = []
    const values = []
    let idx = 3

    if (data.nombre      !== undefined) { updates.push(`nombre = $${idx++}`);      values.push(data.nombre) }
    if (data.descripcion !== undefined) { updates.push(`descripcion = $${idx++}`); values.push(data.descripcion) }
    if (data.activo      !== undefined) { updates.push(`activo = $${idx++}`);      values.push(data.activo) }

    if (!updates.length) return res.status(400).json({ error: 'Sin datos para actualizar' })

    const { rows } = await db.query(
      `UPDATE cajas SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenant.id, ...values]
    )
    if (!rows.length) return res.status(404).json({ error: 'Caja no encontrada' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

// DELETE /api/cajas/:id — desactivar caja (soft delete)
async function remove(req, res, next) {
  try {
    // Verificar que no tenga sesiones abiertas
    const { rows: sesionesAbiertas } = await db.query(
      "SELECT id FROM sesiones_caja WHERE caja_id = $1 AND estado = 'abierta'",
      [req.params.id]
    )
    if (sesionesAbiertas.length) {
      return res.status(400).json({ error: 'No puedes desactivar una caja con sesiones abiertas' })
    }

    const { rows } = await db.query(
      'UPDATE cajas SET activo = false WHERE id = $1 AND tenant_id = $2 RETURNING id, nombre, activo',
      [req.params.id, req.tenant.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Caja no encontrada' })
    logger.info('Caja desactivada', { tenant_id: req.tenant.id, caja_id: req.params.id })
    res.json({ mensaje: 'Caja desactivada correctamente', caja: rows[0] })
  } catch (err) { next(err) }
}

module.exports = { getAll, create, update, remove }

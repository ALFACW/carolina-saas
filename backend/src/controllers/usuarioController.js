const { z } = require('zod')
const bcrypt = require('bcrypt')
const db = require('../db')
const logger = require('../lib/logger')

const crearSchema = z.object({
  nombre:   z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  rol:      z.enum(['admin', 'supervisor', 'cajero', 'vendedor', 'inventario']).default('cajero'),
})

const updateSchema = z.object({
  nombre:   z.string().min(2).optional(),
  email:    z.string().email().optional(),
  rol:      z.enum(['admin', 'supervisor', 'cajero', 'vendedor', 'inventario']).optional(),
  activo:   z.boolean().optional(),
})

const resetPasswordSchema = z.object({
  nueva_password: z.string().min(6),
})

// GET /api/usuarios — lista usuarios del tenant
async function getAll(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, email, rol, activo, ultimo_login, fecha_creacion
       FROM users
       WHERE tenant_id = $1
       ORDER BY fecha_creacion`,
      [req.tenant.id]
    )
    res.json(rows)
  } catch (err) { next(err) }
}

// POST /api/usuarios — crear usuario (el límite del plan lo verifica checkPlanLimit antes)
async function create(req, res, next) {
  try {
    const data = crearSchema.parse(req.body)

    // Verificar email único global
    const { rows: existe } = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    )
    if (existe.length) return res.status(400).json({ error: 'Ya existe un usuario con ese email' })

    const hash = await bcrypt.hash(data.password, 12)
    const { rows } = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, nombre, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [req.tenant.id, data.email, hash, data.nombre, data.rol]
    )
    logger.info('Usuario creado', { tenant_id: req.tenant.id, email: data.email, rol: data.rol })
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
}

// PUT /api/usuarios/:id — actualizar usuario
async function update(req, res, next) {
  try {
    const data = updateSchema.parse(req.body)

    // Verificar que el usuario pertenece al tenant
    const { rows: target } = await db.query(
      'SELECT id, rol FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    )
    if (!target.length) return res.status(404).json({ error: 'Usuario no encontrado' })

    // No puede quitarse el rol admin si es el último admin
    if (data.rol && data.rol !== 'admin' && req.params.id === req.user.id) {
      const { rows: adminCount } = await db.query(
        "SELECT COUNT(*) as total FROM users WHERE tenant_id = $1 AND rol = 'admin' AND activo = true",
        [req.tenant.id]
      )
      if (parseInt(adminCount[0].total) <= 1) {
        return res.status(400).json({ error: 'Debe haber al menos un administrador activo' })
      }
    }

    // Verificar email único si se está cambiando
    if (data.email) {
      const { rows: emailExiste } = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [data.email, req.params.id]
      )
      if (emailExiste.length) return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
    }

    const updates = []
    const values = []
    let idx = 3

    if (data.nombre !== undefined) { updates.push(`nombre = $${idx++}`); values.push(data.nombre) }
    if (data.email  !== undefined) { updates.push(`email = $${idx++}`);  values.push(data.email) }
    if (data.rol    !== undefined) { updates.push(`rol = $${idx++}`);    values.push(data.rol) }
    if (data.activo !== undefined) { updates.push(`activo = $${idx++}`); values.push(data.activo) }

    if (!updates.length) return res.status(400).json({ error: 'Sin datos para actualizar' })

    const { rows } = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2
       RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [req.params.id, req.tenant.id, ...values]
    )
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

// DELETE /api/usuarios/:id — desactivar usuario (soft delete)
async function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' })
    }

    // Verificar que no es el último admin
    const { rows: target } = await db.query(
      'SELECT rol FROM users WHERE id = $1 AND tenant_id = $2 AND activo = true',
      [req.params.id, req.tenant.id]
    )
    if (!target.length) return res.status(404).json({ error: 'Usuario no encontrado o ya inactivo' })

    if (target[0].rol === 'admin') {
      const { rows: adminCount } = await db.query(
        "SELECT COUNT(*) as total FROM users WHERE tenant_id = $1 AND rol = 'admin' AND activo = true",
        [req.tenant.id]
      )
      if (parseInt(adminCount[0].total) <= 1) {
        return res.status(400).json({ error: 'Debe haber al menos un administrador activo' })
      }
    }

    await db.query(
      'UPDATE users SET activo = false WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    )
    logger.info('Usuario desactivado', { tenant_id: req.tenant.id, usuario_id: req.params.id })
    res.json({ mensaje: 'Usuario desactivado correctamente' })
  } catch (err) { next(err) }
}

// PUT /api/usuarios/:id/reset-password — resetear contraseña (solo admin)
async function resetPassword(req, res, next) {
  try {
    const { nueva_password } = resetPasswordSchema.parse(req.body)

    // Verificar que el usuario pertenece al tenant
    const { rows: target } = await db.query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    )
    if (!target.length) return res.status(404).json({ error: 'Usuario no encontrado' })

    const hash = await bcrypt.hash(nueva_password, 12)
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND tenant_id = $3',
      [hash, req.params.id, req.tenant.id]
    )
    logger.info('Contraseña reseteada por admin', { tenant_id: req.tenant.id, usuario_id: req.params.id, admin_id: req.user.id })
    res.json({ mensaje: 'Contraseña actualizada correctamente' })
  } catch (err) { next(err) }
}

// PUT /api/usuarios/:id/reactivar — reactivar usuario
async function reactivate(req, res, next) {
  try {
    const { rows } = await db.query(
      'UPDATE users SET activo = true WHERE id = $1 AND tenant_id = $2 RETURNING id, nombre, email, rol, activo',
      [req.params.id, req.tenant.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ mensaje: 'Usuario reactivado correctamente', usuario: rows[0] })
  } catch (err) { next(err) }
}

module.exports = { getAll, create, update, remove, resetPassword, reactivate }

const { z } = require('zod');
const db = require('../db');
const logger = require('../lib/logger');

const schema = z.object({
  nombre: z.string().min(1),
  nit: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  contacto: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

// GET /api/proveedores — lista con búsqueda y paginación
async function getAll(req, res, next) {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.tenant.id];
    let where = 'tenant_id = $1 AND activo = true';

    if (search) {
      where += ' AND (nombre ILIKE $2 OR nit ILIKE $2)';
      params.push(`%${search}%`);
    }

    const [data, count] = await Promise.all([
      db.query(
        `SELECT * FROM proveedores WHERE ${where} ORDER BY nombre LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM proveedores WHERE ${where}`, params),
    ]);

    res.json({
      proveedores: data.rows,
      total: parseInt(count.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
}

// GET /api/proveedores/:id
async function getById(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM proveedores WHERE id = $1 AND tenant_id = $2 AND activo = true',
      [req.params.id, req.tenant.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// POST /api/proveedores
async function create(req, res, next) {
  try {
    const data = schema.parse(req.body);

    const { rows } = await db.query(
      `INSERT INTO proveedores (tenant_id, nombre, nit, email, telefono, direccion, ciudad, contacto, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.tenant.id,
        data.nombre,
        data.nit || null,
        data.email || null,
        data.telefono || null,
        data.direccion || null,
        data.ciudad || null,
        data.contacto || null,
        data.notas || null,
      ]
    );

    logger.info('Proveedor creado', { proveedor_id: rows[0].id, tenant_id: req.tenant.id });
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

// PUT /api/proveedores/:id
async function update(req, res, next) {
  try {
    const data = schema.partial().parse(req.body);
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Sin datos para actualizar' });

    const set = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
    const values = fields.map(([, v]) => v);

    const { rows } = await db.query(
      `UPDATE proveedores SET ${set} WHERE id = $1 AND tenant_id = $2 AND activo = true RETURNING *`,
      [req.params.id, req.tenant.id, ...values]
    );

    if (!rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });

    logger.info('Proveedor actualizado', { proveedor_id: req.params.id, tenant_id: req.tenant.id });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// DELETE /api/proveedores/:id — soft delete (activo = false)
async function remove(req, res, next) {
  try {
    const { rows } = await db.query(
      'UPDATE proveedores SET activo = false WHERE id = $1 AND tenant_id = $2 AND activo = true RETURNING id',
      [req.params.id, req.tenant.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Proveedor no encontrado' });

    logger.info('Proveedor desactivado', { proveedor_id: req.params.id, tenant_id: req.tenant.id });
    res.json({ mensaje: 'Proveedor eliminado' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };

const { z } = require('zod');
const db = require('../db');
const logger = require('../lib/logger');

const clienteSchema = z.object({
  tipo_documento: z.enum(['CC', 'NIT', 'CE', 'PASAPORTE']),
  numero_documento: z.string().min(1),
  nombre: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
});

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.tenant.id];
    let where = 'tenant_id = $1';
    if (search) {
      where += ' AND (nombre ILIKE $2 OR numero_documento ILIKE $2)';
      params.push(`%${search}%`);
    }
    const [data, count] = await Promise.all([
      db.query(
        `SELECT * FROM clientes WHERE ${where} ORDER BY nombre LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM clientes WHERE ${where}`, params),
    ]);
    res.json({ clientes: data.rows, total: parseInt(count.rows[0].total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenant.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = clienteSchema.parse(req.body);
    const { rows } = await db.query(
      'INSERT INTO clientes (tenant_id, tipo_documento, numero_documento, nombre, email, telefono, direccion, ciudad) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.tenant.id, data.tipo_documento, data.numero_documento, data.nombre, data.email || null, data.telefono || null, data.direccion || null, data.ciudad || null]
    );
    const cliente = rows[0];

    res.status(201).json(cliente);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = clienteSchema.partial().parse(req.body);
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Sin datos para actualizar' });
    const set = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
    const values = fields.map(([, v]) => v);
    const { rows } = await db.query(
      `UPDATE clientes SET ${set} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenant.id, ...values]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { rows } = await db.query(
      'DELETE FROM clientes WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.tenant.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };

const { z } = require('zod');
const db = require('../db');
const logger = require('../lib/logger');
const { enviarAlertaStock } = require('../lib/email');

const productoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  precio_venta: z.coerce.number().positive(),
  precio_costo: z.coerce.number().min(0).optional(),
  stock_actual: z.coerce.number().int().min(0).optional(),
  stock_minimo: z.coerce.number().int().min(0).optional(),
  bodega: z.string().optional().nullable(),
  impuesto_iva: z.coerce.number().min(0).max(100).optional(),
});

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '', categoria = '', activo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['tenant_id = $1'];
    const params = [req.tenant.id];
    let idx = 2;

    if (search) {
      conditions.push(`(nombre ILIKE $${idx} OR codigo ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (categoria) {
      conditions.push(`categoria = $${idx}`);
      params.push(categoria);
      idx++;
    }
    if (activo !== undefined) {
      conditions.push(`activo = $${idx}`);
      params.push(activo === 'true');
      idx++;
    }

    const where = conditions.join(' AND ');
    const [datos, count] = await Promise.all([
      db.query(`SELECT * FROM productos WHERE ${where} ORDER BY nombre LIMIT $${idx} OFFSET $${idx + 1}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as total FROM productos WHERE ${where}`, params),
    ]);

    res.json({ productos: datos.rows, total: parseInt(count.rows[0].total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM productos WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenant.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = productoSchema.parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO productos (tenant_id, codigo, nombre, descripcion, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, bodega, impuesto_iva)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        req.tenant.id,
        data.codigo || null,
        data.nombre,
        data.descripcion || null,
        data.categoria || null,
        data.precio_venta,
        data.precio_costo ?? 0,
        data.stock_actual ?? 0,
        data.stock_minimo ?? 0,
        data.bodega || 'principal',
        data.impuesto_iva ?? 19,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = productoSchema.partial().parse(req.body);
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Sin datos para actualizar' });
    const set = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
    const values = fields.map(([, v]) => v);
    const { rows } = await db.query(
      `UPDATE productos SET ${set} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenant.id, ...values]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query('UPDATE productos SET activo = false WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenant.id]);
    res.json({ mensaje: 'Producto desactivado' });
  } catch (err) { next(err); }
}

async function ajusteStock(req, res, next) {
  try {
    const { cantidad, tipo = 'ajuste', notas } = z.object({
      cantidad: z.coerce.number().int(),
      tipo: z.enum(['entrada', 'salida', 'ajuste']).default('ajuste'),
      notas: z.string().optional(),
    }).parse(req.body);

    const { rows } = await db.query(
      'SELECT stock_actual FROM productos WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    const stockAnterior = rows[0].stock_actual;
    let stockNuevo;
    if (tipo === 'entrada') stockNuevo = stockAnterior + cantidad;
    else if (tipo === 'salida') stockNuevo = stockAnterior - cantidad;
    else stockNuevo = cantidad;

    if (stockNuevo < 0) return res.status(400).json({ error: 'Stock insuficiente' });

    await db.query('UPDATE productos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3', [stockNuevo, req.params.id, req.tenant.id]);
    await db.query(
      'INSERT INTO movimientos_stock (tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, notas, usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [req.tenant.id, req.params.id, tipo, Math.abs(cantidad), stockAnterior, stockNuevo, notas || null, req.user.id]
    );

    logger.info('Ajuste de stock realizado', { producto_id: req.params.id, tipo, stock_anterior: stockAnterior, stock_nuevo: stockNuevo });

    // Verificar si el stock quedó por debajo del mínimo y enviar alerta (sin bloquear la respuesta)
    try {
      const { rows: prodRows } = await db.query(
        'SELECT * FROM productos WHERE id = $1 AND tenant_id = $2',
        [req.params.id, req.tenant.id]
      );
      if (prodRows.length && prodRows[0].stock_actual <= prodRows[0].stock_minimo) {
        enviarAlertaStock({ tenant: req.tenant, productos: prodRows }).catch(e =>
          logger.error('Error enviando alerta de stock tras ajuste', { error: e.message })
        );
      }
    } catch (alertErr) {
      logger.error('Error verificando stock mínimo tras ajuste', { error: alertErr.message });
    }

    res.json({ stock_anterior: stockAnterior, stock_nuevo: stockNuevo, tipo });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove, ajusteStock };

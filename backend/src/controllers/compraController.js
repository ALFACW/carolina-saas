const { z } = require('zod');
const db = require('../db');
const logger = require('../lib/logger');

const itemSchema = z.object({
  producto_id: z.string().uuid(),
  descripcion: z.string().min(1),
  cantidad: z.coerce.number().int().positive(),
  precio_unitario: z.coerce.number().positive(),
  impuesto: z.coerce.number().min(0).default(0),
});

const compraSchema = z.object({
  proveedor_id: z.string().uuid().optional().nullable(),
  numero_factura: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  fecha_compra: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

// GET /api/compras — lista con filtros y paginación
async function getAll(req, res, next) {
  try {
    const {
      proveedor_id,
      estado,
      fecha_desde,
      fecha_hasta,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.tenant.id];
    const conditions = ['c.tenant_id = $1'];
    let idx = 2;

    if (proveedor_id) {
      conditions.push(`c.proveedor_id = $${idx}`);
      params.push(proveedor_id);
      idx++;
    }
    if (estado) {
      conditions.push(`c.estado = $${idx}`);
      params.push(estado);
      idx++;
    }
    if (fecha_desde) {
      conditions.push(`c.fecha_compra >= $${idx}::date`);
      params.push(fecha_desde);
      idx++;
    }
    if (fecha_hasta) {
      conditions.push(`c.fecha_compra <= $${idx}::date`);
      params.push(fecha_hasta);
      idx++;
    }

    const where = conditions.join(' AND ');

    const [data, count] = await Promise.all([
      db.query(
        `SELECT c.*, p.nombre as proveedor_nombre
         FROM compras c
         LEFT JOIN proveedores p ON p.id = c.proveedor_id
         WHERE ${where}
         ORDER BY c.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(
        `SELECT COUNT(*) as total FROM compras c WHERE ${where}`,
        params
      ),
    ]);

    res.json({
      compras: data.rows,
      total: parseInt(count.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
}

// GET /api/compras/:id — detalle con items y nombre de productos
async function getById(req, res, next) {
  try {
    const { rows: compraRows } = await db.query(
      `SELECT c.*, p.nombre as proveedor_nombre
       FROM compras c
       LEFT JOIN proveedores p ON p.id = c.proveedor_id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [req.params.id, req.tenant.id]
    );

    if (!compraRows.length) return res.status(404).json({ error: 'Compra no encontrada' });

    const { rows: itemRows } = await db.query(
      `SELECT ci.*, pr.nombre as producto_nombre, pr.codigo as producto_codigo
       FROM compra_items ci
       LEFT JOIN productos pr ON pr.id = ci.producto_id
       WHERE ci.compra_id = $1
       ORDER BY ci.id`,
      [req.params.id]
    );

    res.json({ ...compraRows[0], items: itemRows });
  } catch (err) { next(err); }
}

// POST /api/compras — crear compra en estado 'borrador'
async function create(req, res, next) {
  try {
    const data = compraSchema.parse(req.body);

    // Calcular totales
    let subtotal = 0;
    let impuesto_total = 0;
    const itemsCalculados = data.items.map((item) => {
      const subtotalItem = item.cantidad * item.precio_unitario;
      const impuestoItem = item.impuesto ?? 0;
      subtotal += subtotalItem;
      impuesto_total += impuestoItem;
      return { ...item, subtotal: subtotalItem, impuesto: impuestoItem };
    });
    const total = subtotal + impuesto_total;

    const fechaCompra = data.fecha_compra
      ? new Date(data.fecha_compra).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const { rows: compraRows } = await db.query(
      `INSERT INTO compras (tenant_id, proveedor_id, numero_factura, notas, fecha_compra, subtotal, impuesto_total, total, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'borrador') RETURNING *`,
      [
        req.tenant.id,
        data.proveedor_id || null,
        data.numero_factura || null,
        data.notas || null,
        fechaCompra,
        subtotal.toFixed(2),
        impuesto_total.toFixed(2),
        total.toFixed(2),
      ]
    );

    const compra = compraRows[0];

    for (const item of itemsCalculados) {
      await db.query(
        `INSERT INTO compra_items (compra_id, producto_id, descripcion, cantidad, precio_unitario, impuesto, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          compra.id,
          item.producto_id,
          item.descripcion,
          item.cantidad,
          item.precio_unitario,
          item.impuesto,
          item.subtotal,
        ]
      );
    }

    logger.info('Compra creada', { compra_id: compra.id, tenant_id: req.tenant.id, total });
    res.status(201).json({ ...compra, items: itemsCalculados });
  } catch (err) { next(err); }
}

// PUT /api/compras/:id — editar compra (solo si está en 'borrador')
async function update(req, res, next) {
  try {
    const data = compraSchema.parse(req.body);

    // Verificar que existe y está en borrador
    const { rows: check } = await db.query(
      `SELECT id, estado FROM compras WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenant.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Compra no encontrada' });
    if (check[0].estado !== 'borrador') {
      return res.status(400).json({ error: `No se puede editar una compra en estado '${check[0].estado}'` });
    }

    // Calcular totales
    let subtotal = 0;
    let impuesto_total = 0;
    const itemsCalculados = data.items.map((item) => {
      const subtotalItem = item.cantidad * item.precio_unitario;
      const impuestoItem = item.impuesto ?? 0;
      subtotal += subtotalItem;
      impuesto_total += impuestoItem;
      return { ...item, subtotal: subtotalItem, impuesto: impuestoItem };
    });
    const total = subtotal + impuesto_total;

    const fechaCompra = data.fecha_compra
      ? new Date(data.fecha_compra).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const { rows: compraRows } = await db.query(
      `UPDATE compras
       SET proveedor_id = $3,
           numero_factura = $4,
           notas = $5,
           fecha_compra = $6::date,
           subtotal = $7,
           impuesto_total = $8,
           total = $9
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [
        req.params.id,
        req.tenant.id,
        data.proveedor_id || null,
        data.numero_factura || null,
        data.notas || null,
        fechaCompra,
        subtotal.toFixed(2),
        impuesto_total.toFixed(2),
        total.toFixed(2),
      ]
    );

    if (!compraRows.length) return res.status(404).json({ error: 'Compra no encontrada' });

    // Eliminar items anteriores y guardar los nuevos
    await db.query('DELETE FROM compra_items WHERE compra_id = $1', [req.params.id]);

    for (const item of itemsCalculados) {
      await db.query(
        `INSERT INTO compra_items (compra_id, producto_id, descripcion, cantidad, precio_unitario, impuesto, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.params.id,
          item.producto_id,
          item.descripcion,
          item.cantidad,
          item.precio_unitario,
          item.impuesto,
          item.subtotal,
        ]
      );
    }

    logger.info('Compra actualizada', { compra_id: req.params.id, tenant_id: req.tenant.id });
    res.json({ ...compraRows[0], items: itemsCalculados });
  } catch (err) { next(err); }
}

// POST /api/compras/:id/recibir — marcar como recibida y actualizar stock
async function recibir(req, res, next) {
  const { query: dbQuery, release, client } = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Verificar que la compra existe y está en 'borrador'
    const { rows: compraRows } = await client.query(
      `SELECT * FROM compras WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenant.id]
    );
    if (!compraRows.length) {
      await client.query('ROLLBACK');
      release();
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    if (compraRows[0].estado !== 'borrador') {
      await client.query('ROLLBACK');
      release();
      return res.status(400).json({ error: `Solo se pueden recibir compras en estado 'borrador'. Estado actual: '${compraRows[0].estado}'` });
    }

    // Obtener items de la compra
    const { rows: items } = await client.query(
      `SELECT * FROM compra_items WHERE compra_id = $1`,
      [req.params.id]
    );

    // 2. Para cada item: sumar la cantidad al stock_actual del producto
    for (const item of items) {
      const { rows: prodRows } = await client.query(
        `SELECT stock_actual FROM productos WHERE id = $1 AND tenant_id = $2`,
        [item.producto_id, req.tenant.id]
      );
      if (!prodRows.length) {
        await client.query('ROLLBACK');
        release();
        return res.status(400).json({ error: `Producto no encontrado: ${item.producto_id}` });
      }

      const stockAnterior = parseInt(prodRows[0].stock_actual);
      const stockNuevo = stockAnterior + item.cantidad;

      await client.query(
        `UPDATE productos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3`,
        [stockNuevo, item.producto_id, req.tenant.id]
      );

      // 3. Registrar movimiento_stock tipo 'entrada' por cada producto
      await client.query(
        `INSERT INTO movimientos_stock (tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, notas, usuario_id)
         VALUES ($1, $2, 'entrada', $3, $4, $5, $6, $7, $8)`,
        [
          req.tenant.id,
          item.producto_id,
          item.cantidad,
          stockAnterior,
          stockNuevo,
          req.params.id,
          `Recepción compra #${compraRows[0].numero_factura || req.params.id}`,
          req.user.id,
        ]
      );
    }

    // 4. Cambiar estado de la compra a 'recibida'
    // 5. Guardar fecha_recepcion y recibida_por
    const { rows: updated } = await client.query(
      `UPDATE compras
       SET estado = 'recibida',
           fecha_recepcion = NOW(),
           recibida_por = $3
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.id, req.tenant.id, req.user.id]
    );

    await client.query('COMMIT');

    logger.info('Compra recibida y stock actualizado', {
      compra_id: req.params.id,
      tenant_id: req.tenant.id,
      items_count: items.length,
    });

    release();
    res.json({ ...updated[0], items_actualizados: items.length });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    release();
    logger.error('Error al recibir compra - ROLLBACK', { error: err.message, compra_id: req.params.id });
    next(err);
  }
}

// DELETE /api/compras/:id — cancelar (solo borradores)
async function cancelar(req, res, next) {
  try {
    const { rows: check } = await db.query(
      `SELECT id, estado FROM compras WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenant.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Compra no encontrada' });
    if (check[0].estado !== 'borrador') {
      return res.status(400).json({ error: `Solo se pueden cancelar compras en estado 'borrador'. Estado actual: '${check[0].estado}'` });
    }

    const { rows } = await db.query(
      `UPDATE compras SET estado = 'cancelada' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenant.id]
    );

    logger.info('Compra cancelada', { compra_id: req.params.id, tenant_id: req.tenant.id });
    res.json({ mensaje: 'Compra cancelada', compra: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, recibir, cancelar };

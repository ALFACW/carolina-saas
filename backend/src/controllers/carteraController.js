const { z } = require('zod');
const db = require('../db');
const logger = require('../lib/logger');

const pagoSchema = z.object({
  factura_id: z.string().uuid(),
  monto: z.coerce.number().positive(),
  metodo_pago: z.enum(['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia']),
  notas: z.string().optional(),
});

// GET /api/cartera — resumen de cartera del tenant
// Devuelve: lista de facturas a crédito con saldo pendiente > 0
// Incluye: nombre cliente, total factura, monto_pagado, saldo_pendiente, dias_vencida, fecha_vencimiento
async function getResumen(req, res, next) {
  try {
    const { vencidas, cliente_id } = req.query;
    let where = "f.tenant_id = $1 AND f.es_credito = true AND f.saldo_pendiente > 0 AND f.estado != 'anulada'";
    const params = [req.tenant.id];
    let idx = 2;
    if (cliente_id) { where += ` AND f.cliente_id = $${idx++}`; params.push(cliente_id); }
    if (vencidas === 'true') { where += ` AND f.fecha_vencimiento < CURRENT_DATE`; }

    const { rows } = await db.query(`
      SELECT f.id, f.numero_factura, f.total, f.monto_pagado, f.saldo_pendiente,
             f.fecha_emision, f.fecha_vencimiento,
             CASE WHEN f.fecha_vencimiento < CURRENT_DATE
                  THEN CURRENT_DATE - f.fecha_vencimiento::date ELSE 0 END as dias_vencida,
             c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             c.numero_documento as cliente_documento
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      WHERE ${where}
      ORDER BY f.fecha_vencimiento ASC NULLS LAST, f.fecha_emision DESC
    `, params);

    const totales = {
      total_cartera: rows.reduce((s, r) => s + parseFloat(r.saldo_pendiente), 0),
      total_vencida: rows.filter(r => parseInt(r.dias_vencida) > 0).reduce((s, r) => s + parseFloat(r.saldo_pendiente), 0),
      cantidad_facturas: rows.length,
    };

    res.json({ facturas: rows, totales });
  } catch (err) { next(err); }
}

// GET /api/cartera/cliente/:clienteId — historial de cartera de un cliente
async function getByCliente(req, res, next) {
  try {
    const { clienteId } = req.params;

    // Verificar que el cliente pertenece al tenant
    const { rows: clienteRows } = await db.query(
      'SELECT id, nombre, numero_documento, telefono, email FROM clientes WHERE id = $1 AND tenant_id = $2',
      [clienteId, req.tenant.id]
    );
    if (!clienteRows.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    const cliente = clienteRows[0];

    // Facturas a crédito del cliente (incluyendo ya pagadas)
    const { rows: facturas } = await db.query(`
      SELECT f.id, f.numero_factura, f.total, f.monto_pagado, f.saldo_pendiente,
             f.fecha_emision, f.fecha_vencimiento, f.estado,
             CASE WHEN f.fecha_vencimiento < CURRENT_DATE AND f.saldo_pendiente > 0
                  THEN CURRENT_DATE - f.fecha_vencimiento::date ELSE 0 END as dias_vencida
      FROM facturas f
      WHERE f.cliente_id = $1 AND f.tenant_id = $2 AND f.es_credito = true AND f.estado != 'anulada'
      ORDER BY f.fecha_emision DESC
    `, [clienteId, req.tenant.id]);

    // Pagos realizados por este cliente
    const { rows: pagos } = await db.query(`
      SELECT pc.id, pc.factura_id, pc.monto, pc.metodo_pago, pc.fecha_pago, pc.notas,
             f.numero_factura
      FROM pagos_cartera pc
      JOIN facturas f ON pc.factura_id = f.id
      WHERE f.cliente_id = $1 AND f.tenant_id = $2
      ORDER BY pc.fecha_pago DESC
    `, [clienteId, req.tenant.id]);

    const totales = {
      total_deuda: facturas
        .filter(f => f.saldo_pendiente > 0)
        .reduce((s, f) => s + parseFloat(f.saldo_pendiente), 0),
      total_vencida: facturas
        .filter(f => parseInt(f.dias_vencida) > 0)
        .reduce((s, f) => s + parseFloat(f.saldo_pendiente), 0),
      total_pagado: pagos.reduce((s, p) => s + parseFloat(p.monto), 0),
      cantidad_facturas: facturas.length,
    };

    res.json({ cliente, facturas, pagos, totales });
  } catch (err) { next(err); }
}

// POST /api/cartera/pago — registrar un pago parcial o total
async function registrarPago(req, res, next) {
  const { query: dbQuery, release, client } = await db.getClient();
  try {
    const data = pagoSchema.parse(req.body);

    await client.query('BEGIN');

    // 1. Verificar que la factura existe, es de crédito y pertenece al tenant
    const { rows: facturaRows } = await client.query(
      `SELECT id, total, monto_pagado, saldo_pendiente, estado, es_credito
       FROM facturas WHERE id = $1 AND tenant_id = $2`,
      [data.factura_id, req.tenant.id]
    );

    if (!facturaRows.length) {
      await client.query('ROLLBACK');
      release();
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const factura = facturaRows[0];

    if (!factura.es_credito) {
      await client.query('ROLLBACK');
      release();
      return res.status(400).json({ error: 'Esta factura no es de tipo crédito' });
    }

    if (factura.estado === 'anulada') {
      await client.query('ROLLBACK');
      release();
      return res.status(400).json({ error: 'No se puede registrar pago en una factura anulada' });
    }

    const saldoPendiente = parseFloat(factura.saldo_pendiente);
    if (saldoPendiente <= 0) {
      await client.query('ROLLBACK');
      release();
      return res.status(400).json({ error: 'Esta factura ya está pagada completamente' });
    }

    if (data.monto > saldoPendiente) {
      await client.query('ROLLBACK');
      release();
      return res.status(400).json({
        error: `El monto (${data.monto}) supera el saldo pendiente (${saldoPendiente})`,
      });
    }

    // 2. Insertar en pagos_cartera
    const { rows: pagoRows } = await client.query(
      `INSERT INTO pagos_cartera (factura_id, tenant_id, monto, metodo_pago, notas, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.factura_id, req.tenant.id, data.monto, data.metodo_pago, data.notas || null, req.user.id]
    );
    const pago = pagoRows[0];

    // 3. Actualizar monto_pagado en facturas
    const nuevoMontoPagado = parseFloat(factura.monto_pagado || 0) + data.monto;
    // 4. Actualizar saldo_pendiente = total - monto_pagado
    const nuevoSaldo = parseFloat(factura.total) - nuevoMontoPagado;

    // 5. Si saldo_pendiente <= 0: marcar como 'pagada'
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : factura.estado;

    const { rows: facturaActualizada } = await client.query(
      `UPDATE facturas
       SET monto_pagado = $1, saldo_pendiente = $2, estado = $3
       WHERE id = $4 RETURNING id, numero_factura, total, monto_pagado, saldo_pendiente, estado`,
      [nuevoMontoPagado.toFixed(2), Math.max(0, nuevoSaldo).toFixed(2), nuevoEstado, data.factura_id]
    );

    await client.query('COMMIT');
    logger.info('Pago de cartera registrado', {
      factura_id: data.factura_id,
      monto: data.monto,
      tenant_id: req.tenant.id,
      usuario_id: req.user.id,
    });

    release();
    res.status(201).json({
      pago,
      factura: facturaActualizada[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    release();
    logger.error('Error registrando pago de cartera', { error: err.message, tenant_id: req.user?.tenant_id });
    next(err);
  }
}

// GET /api/cartera/pagos/:facturaId — historial de pagos de una factura
async function getPagos(req, res, next) {
  try {
    const { facturaId } = req.params;

    // Verificar que la factura pertenece al tenant
    const { rows: facturaRows } = await db.query(
      `SELECT f.id, f.numero_factura, f.total, f.monto_pagado, f.saldo_pendiente,
              f.fecha_emision, f.fecha_vencimiento, f.estado, f.es_credito,
              c.nombre as cliente_nombre, c.numero_documento as cliente_documento
       FROM facturas f
       LEFT JOIN clientes c ON f.cliente_id = c.id
       WHERE f.id = $1 AND f.tenant_id = $2`,
      [facturaId, req.tenant.id]
    );

    if (!facturaRows.length) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const factura = facturaRows[0];

    // Pagos de la factura
    const { rows: pagos } = await db.query(
      `SELECT pc.id, pc.monto, pc.metodo_pago, pc.fecha_pago, pc.notas,
              u.nombre as registrado_por_nombre
       FROM pagos_cartera pc
       LEFT JOIN usuarios u ON pc.registrado_por = u.id
       WHERE pc.factura_id = $1
       ORDER BY pc.fecha_pago DESC`,
      [facturaId]
    );

    res.json({ factura, pagos });
  } catch (err) { next(err); }
}

module.exports = { getResumen, getByCliente, registrarPago, getPagos };

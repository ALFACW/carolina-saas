const { z } = require('zod');
const db = require('../db');
const { getFactusClient } = require('../lib/factus');
const logger = require('../lib/logger');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, estado, cliente_id, fecha_desde, fecha_hasta } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.tenant.id];
    const conditions = ['f.tenant_id = $1'];
    let idx = 2;

    if (estado)      { conditions.push(`f.estado = $${idx++}`);           params.push(estado); }
    if (cliente_id)  { conditions.push(`f.cliente_id = $${idx++}`);       params.push(cliente_id); }
    if (fecha_desde) { conditions.push(`f.fecha_emision >= $${idx++}`);   params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push(`f.fecha_emision <= $${idx++}`);   params.push(fecha_hasta); }

    const where = conditions.join(' AND ');
    const [data, count] = await Promise.all([
      db.query(
        `SELECT f.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         LEFT JOIN users u ON f.vendedor_id = u.id
         WHERE ${where} ORDER BY f.fecha_emision DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM facturas f WHERE ${where}`, params),
    ]);
    res.json({ facturas: data.rows, total: parseInt(count.rows[0].total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [factura, items] = await Promise.all([
      db.query(
        `SELECT f.*, c.nombre as cliente_nombre, c.numero_documento, c.email as cliente_email,
                u.nombre as vendedor_nombre
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         LEFT JOIN users u ON f.vendedor_id = u.id
         WHERE f.id = $1 AND f.tenant_id = $2`,
        [req.params.id, req.tenant.id]
      ),
      db.query(
        'SELECT fi.*, p.nombre as producto_nombre FROM factura_items fi LEFT JOIN productos p ON fi.producto_id = p.id WHERE fi.factura_id = $1',
        [req.params.id]
      ),
    ]);
    if (!factura.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json({ ...factura.rows[0], items: items.rows });
  } catch (err) { next(err); }
}

async function getPDF(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT alegra_id, pdf_url FROM facturas WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Factura no encontrada' });

    // Si tiene PDF guardado, devolver directamente
    if (rows[0].pdf_url) return res.json({ pdf_url: rows[0].pdf_url });

    // Si tiene número Factus, pedir el PDF
    if (rows[0].alegra_id && process.env.FACTUS_CLIENT_ID) {
      const factus = getFactusClient();
      const result = await factus.obtenerPDF(rows[0].alegra_id);
      const pdfUrl = result?.data?.pdf_base_64_encoded
        ? `data:application/pdf;base64,${result.data.pdf_base_64_encoded}`
        : result?.data?.pdf || null;
      return res.json({ pdf_url: pdfUrl });
    }

    res.json({ pdf_url: null });
  } catch (err) { next(err); }
}

async function anular(req, res, next) {
  try {
    const { rows: facturaRows } = await db.query(
      'SELECT f.*, fi.producto_id, fi.descripcion, fi.cantidad, fi.precio_unitario, fi.subtotal FROM facturas f LEFT JOIN factura_items fi ON f.id = fi.factura_id WHERE f.id = $1 AND f.tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!facturaRows.length) return res.status(404).json({ error: 'Factura no encontrada' });

    const factura = facturaRows[0];
    if (factura.estado === 'anulada') return res.status(400).json({ error: 'Factura ya está anulada' });

    // Si tiene número Factus (fue emitida real), crear nota crédito
    if (factura.alegra_id && process.env.FACTUS_CLIENT_ID) {
      try {
        const factus = getFactusClient();
        const items = facturaRows.map(r => ({
          codigo:          r.producto_id?.substring(0, 10) || 'PRD',
          descripcion:     r.descripcion,
          cantidad:        parseFloat(r.cantidad),
          precio_unitario: parseFloat(r.precio_unitario),
          subtotal:        parseFloat(r.subtotal),
        }));
        await factus.crearNotaCredito({
          numeroBill:    factura.alegra_id,
          referenceCode: `NC-${factura.id.substring(0, 8)}-${Date.now()}`,
          items,
          metodoPago:    factura.metodo_pago,
          numbering_range_id: null,
        });
      } catch (factusErr) {
        logger.warn('No se pudo crear nota crédito en Factus', { error: factusErr.message });
        // Continúa con la anulación local aunque Factus falle
      }
    }

    await db.query("UPDATE facturas SET estado = 'anulada' WHERE id = $1", [factura.id]);
    logger.info('Factura anulada', { factura_id: factura.id, tenant_id: req.tenant.id });
    res.json({ mensaje: 'Factura anulada correctamente' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, getPDF, anular };

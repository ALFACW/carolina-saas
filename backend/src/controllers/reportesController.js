const db = require('../db');

async function ventasDia(req, res, next) {
  try {
    const { fecha } = req.query;
    const hoy = fecha || new Date().toISOString().split('T')[0];
    const { rows } = await db.query(
      `SELECT f.*, c.nombre as cliente_nombre FROM facturas f
       LEFT JOIN clientes c ON f.cliente_id = c.id
       WHERE f.tenant_id=$1 AND f.fecha_emision>=$2::date AND f.fecha_emision<($2::date+INTERVAL '1 day') AND f.estado!='anulada'
       ORDER BY f.fecha_emision DESC`,
      [req.tenant.id, hoy]
    );
    const total = rows.reduce((s, r) => s + parseFloat(r.total), 0);
    res.json({ fecha: hoy, facturas: rows, total_ventas: total, cantidad: rows.length });
  } catch (err) { next(err); }
}

async function ventasMes(req, res, next) {
  try {
    const { mes, anio } = req.query;
    const ahora = new Date();
    const m = mes || (ahora.getMonth() + 1);
    const a = anio || ahora.getFullYear();
    const { rows } = await db.query(
      `SELECT DATE(fecha_emision) as dia, COUNT(*) as cantidad, SUM(total) as total_dia
       FROM facturas
       WHERE tenant_id=$1 AND EXTRACT(MONTH FROM fecha_emision)=$2 AND EXTRACT(YEAR FROM fecha_emision)=$3 AND estado!='anulada'
       GROUP BY dia ORDER BY dia`,
      [req.tenant.id, m, a]
    );
    const totalMes = rows.reduce((s, r) => s + parseFloat(r.total_dia), 0);
    res.json({ mes: m, anio: a, por_dia: rows, total_mes: totalMes });
  } catch (err) { next(err); }
}

async function productosMasVendidos(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const { rows } = await db.query(
      `SELECT p.id, p.nombre, p.codigo, SUM(fi.cantidad) as total_vendido, SUM(fi.subtotal) as ingresos
       FROM factura_items fi
       JOIN productos p ON fi.producto_id = p.id
       JOIN facturas f ON fi.factura_id = f.id
       WHERE f.tenant_id=$1 AND f.estado!='anulada'
       GROUP BY p.id ORDER BY total_vendido DESC LIMIT $2`,
      [req.tenant.id, parseInt(limit)]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function stockBajo(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM productos WHERE tenant_id=$1 AND activo=true AND stock_actual <= stock_minimo ORDER BY (stock_actual - stock_minimo)',
      [req.tenant.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { ventasDia, ventasMes, productosMasVendidos, stockBajo };

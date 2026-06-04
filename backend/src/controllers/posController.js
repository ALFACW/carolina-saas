const { z } = require('zod');
const db = require('../db');
const { getFactusClient } = require('../lib/factus');
const logger = require('../lib/logger');

const ventaSchema = z.object({
  cliente_id: z.string().uuid().optional(),
  items: z.array(z.object({
    producto_id: z.string().uuid(),
    cantidad: z.coerce.number().int().positive(),
    precio_unitario: z.coerce.number().positive().optional(),
    descuento: z.coerce.number().min(0).default(0),
  })).min(1),
  metodo_pago: z.enum(['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'credito']),
  notas: z.string().optional(),
});

async function getDashboard(req, res, next) {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const [ventasHoy, ventasMes, transacciones] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(total),0) as suma FROM facturas
         WHERE tenant_id=$1 AND fecha_emision>=$2::date AND fecha_emision<($2::date+INTERVAL '1 day') AND estado!='anulada'`,
        [req.tenant.id, hoy]
      ),
      db.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(total),0) as suma FROM facturas
         WHERE tenant_id=$1 AND DATE_TRUNC('month',fecha_emision)=DATE_TRUNC('month',NOW()) AND estado!='anulada'`,
        [req.tenant.id]
      ),
      db.query(
        `SELECT * FROM facturas WHERE tenant_id=$1 ORDER BY fecha_emision DESC LIMIT 10`,
        [req.tenant.id]
      ),
    ]);
    res.json({
      ventas_hoy: { cantidad: parseInt(ventasHoy.rows[0].total), total: parseFloat(ventasHoy.rows[0].suma) },
      ventas_mes: { cantidad: parseInt(ventasMes.rows[0].total), total: parseFloat(ventasMes.rows[0].suma) },
      ultimas_facturas: transacciones.rows,
    });
  } catch (err) { next(err); }
}

async function procesarVenta(req, res, next) {
  const { query: dbQuery, release, client } = await db.getClient();
  try {
    const data = ventaSchema.parse(req.body);
    // Modo real si Factus está configurado en el sistema
    const factusConfigurado = !!(process.env.FACTUS_CLIENT_ID && process.env.FACTUS_USERNAME);
    const modoDemo = !factusConfigurado;

    await client.query('BEGIN');

    // Validar stock
    const productosIds = data.items.map(i => i.producto_id);
    const { rows: productos } = await client.query(
      `SELECT * FROM productos WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND activo = true`,
      [productosIds, req.tenant.id]
    );

    const productoMap = {};
    for (const p of productos) productoMap[p.id] = p;

    for (const item of data.items) {
      const prod = productoMap[item.producto_id];
      if (!prod) throw Object.assign(new Error(`Producto no encontrado: ${item.producto_id}`), { status: 400 });
      if (prod.stock_actual < item.cantidad) {
        throw Object.assign(
          new Error(`Stock insuficiente para "${prod.nombre}": disponible ${prod.stock_actual}, solicitado ${item.cantidad}`),
          { status: 400 }
        );
      }
    }

    // Calcular totales
    let subtotal = 0;
    let impuestoTotal = 0;
    const itemsFactura = [];
    const itemsFactus  = [];

    for (const item of data.items) {
      const prod = productoMap[item.producto_id];
      const precioUnit = item.precio_unitario || parseFloat(prod.precio_venta);
      const descuento  = item.descuento || 0;
      const iva        = parseFloat(prod.impuesto_iva) || 0;

      // En Colombia el precio_venta YA INCLUYE IVA
      const precioFinal   = precioUnit * (1 - descuento / 100); // precio con IVA por unidad
      const totalItem     = precioFinal * item.cantidad;         // total que paga el cliente
      const baseItem      = totalItem / (1 + iva / 100);         // base gravable (sin IVA)
      const impItem       = totalItem - baseItem;                 // IVA del item
      const precioBase    = baseItem / item.cantidad;             // precio base por unidad (para Factus)

      subtotal      += baseItem;
      impuestoTotal += impItem;

      itemsFactura.push({
        producto_id:    prod.id,
        descripcion:    prod.nombre,
        codigo:         prod.codigo || '',
        cantidad:       item.cantidad,
        precio_unitario:precioFinal,  // precio con IVA (lo que el cliente ve)
        precio_base:    precioBase,   // precio sin IVA (para reportes)
        descuento,
        impuesto:       impItem,
        subtotal:       baseItem,
        iva_rate:       iva,
      });

      itemsFactus.push({
        codigo:          prod.codigo || prod.id.substring(0, 10),
        descripcion:     prod.nombre,
        cantidad:        item.cantidad,
        precio_unitario: precioBase,  // Factus recibe precio SIN IVA
        descuento,
        iva_rate:        iva,
        impuesto:        impItem,
        subtotal:        subtotalItem,
      });
    }

    const total = subtotal + impuestoTotal;

    // Buscar sesión de caja activa
    const { rows: sesionRows } = await client.query(
      "SELECT id FROM sesiones_caja WHERE cajero_id=$1 AND tenant_id=$2 AND estado='abierta' ORDER BY fecha_apertura DESC LIMIT 1",
      [req.user.id, req.tenant.id]
    );
    const sesionId = sesionRows[0]?.id || null;

    let factusId      = null;
    let numeroFactura = null;
    let cufe          = null;
    let pdfUrl        = null;
    let estadoFactura = 'demo';

    if (!modoDemo) {
      // ── Modo real: emitir via Factus ───────────────────────────────
      let clienteData = null;
      if (data.cliente_id) {
        const { rows: clienteRows } = await client.query(
          'SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2',
          [data.cliente_id, req.tenant.id]
        );
        if (!clienteRows.length) throw Object.assign(new Error('Cliente no encontrado'), { status: 400 });
        clienteData = clienteRows[0];
      }

      const factus = getFactusClient();
      const referenceCode = `${req.tenant.id.substring(0, 8)}-${Date.now()}`;

      const resultado = await factus.crearFactura({
        referenceCode,
        items:      itemsFactus,
        cliente:    clienteData,
        metodoPago: data.metodo_pago,
        numbering_range_id: req.tenant.factus_numbering_range_id || null,
      });

      const bill = resultado?.data || resultado;
      factusId      = bill.number || null;
      numeroFactura = bill.number || null;
      cufe          = bill.cufe   || null;
      pdfUrl        = bill.pdf    || null;
      estadoFactura = 'enviada';
    }

    // Campos de crédito
    const esCredito = data.metodo_pago === 'credito';
    const fechaVencimiento = esCredito
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;
    const saldoPendiente = esCredito ? total.toFixed(2) : '0.00';
    const montoPagado = esCredito ? '0.00' : total.toFixed(2);

    // Guardar factura en base de datos
    const { rows: facturaRows } = await client.query(
      `INSERT INTO facturas (tenant_id, cliente_id, vendedor_id, alegra_id, numero_factura, cufe, subtotal, impuesto_total, total, metodo_pago, estado, pdf_url, sesion_id, es_credito, saldo_pendiente, monto_pagado, fecha_vencimiento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        req.tenant.id,
        data.cliente_id || null,
        req.user.id,
        factusId, // guardamos el número Factus en el campo alegra_id
        numeroFactura,
        cufe,
        subtotal.toFixed(2),
        impuestoTotal.toFixed(2),
        total.toFixed(2),
        data.metodo_pago,
        estadoFactura,
        pdfUrl,
        sesionId,
        esCredito,
        saldoPendiente,
        montoPagado,
        fechaVencimiento,
      ]
    );
    const factura = facturaRows[0];

    // Insertar items
    for (const item of itemsFactura) {
      await client.query(
        'INSERT INTO factura_items (factura_id, producto_id, descripcion, cantidad, precio_unitario, descuento, impuesto, subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [factura.id, item.producto_id, item.descripcion, item.cantidad, item.precio_unitario, item.descuento, item.impuesto, item.subtotal]
      );
    }

    // Descontar stock
    for (const item of data.items) {
      const prod = productoMap[item.producto_id];
      const stockNuevo = prod.stock_actual - item.cantidad;
      await client.query('UPDATE productos SET stock_actual = $1 WHERE id = $2', [stockNuevo, prod.id]);
      await client.query(
        `INSERT INTO movimientos_stock (tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, usuario_id)
         VALUES ($1,$2,'venta',$3,$4,$5,$6,$7)`,
        [req.tenant.id, prod.id, item.cantidad, prod.stock_actual, stockNuevo, factura.id, req.user.id]
      );
    }

    await client.query('COMMIT');
    logger.info(`Venta procesada [${modoDemo ? 'DEMO' : 'REAL'}]`, { factura_id: factura.id, tenant_id: req.tenant.id, total });

    release();
    res.status(201).json({
      factura_id: factura.id,
      numero_factura: numeroFactura,
      cufe,
      total: parseFloat(total.toFixed(2)),
      pdf_url: pdfUrl,
      modo_demo: modoDemo,
      ...(req.planWarning ? { warning: req.planWarning } : {}),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    release();
    logger.error('Error procesando venta - ROLLBACK', { error: err.message, tenant_id: req.user?.tenant_id });
    next(err);
  }
}

async function getProductosRapido(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.nombre, p.codigo, p.precio_venta, p.stock_actual, p.impuesto_iva,
              COALESCE(SUM(fi.cantidad),0) as total_vendido
       FROM productos p
       LEFT JOIN factura_items fi ON p.id = fi.producto_id
       WHERE p.tenant_id = $1 AND p.activo = true
       GROUP BY p.id ORDER BY total_vendido DESC LIMIT 20`,
      [req.tenant.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { getDashboard, procesarVenta, getProductosRapido };

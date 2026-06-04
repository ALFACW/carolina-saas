const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getAll, getById, getPDF, anular } = require('../controllers/facturaController');
const db = require('../db');
const { enviarFactura } = require('../lib/email');
const logger = require('../lib/logger');

router.use(auth, tenant);
router.get('/', getAll);
router.get('/:id', getById);
router.get('/:id/pdf', getPDF);
router.post('/:id/anular', anular);

// POST /api/facturas/:id/enviar-email
router.post('/:id/enviar-email', async (req, res, next) => {
  try {
    // 1. Obtener la factura con sus items
    const [facturaResult, itemsResult] = await Promise.all([
      db.query(
        `SELECT f.*, c.nombre as cliente_nombre, c.numero_documento, c.email as cliente_email,
                c.telefono as cliente_telefono, u.nombre as vendedor_nombre
         FROM facturas f
         LEFT JOIN clientes c ON f.cliente_id = c.id
         LEFT JOIN users u ON f.vendedor_id = u.id
         WHERE f.id = $1 AND f.tenant_id = $2`,
        [req.params.id, req.tenant.id]
      ),
      db.query(
        `SELECT fi.*, p.nombre as producto_nombre
         FROM factura_items fi
         LEFT JOIN productos p ON fi.producto_id = p.id
         WHERE fi.factura_id = $1`,
        [req.params.id]
      ),
    ]);

    if (!facturaResult.rows.length) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const factura = facturaResult.rows[0];
    const items = itemsResult.rows;

    // 2. Construir objeto cliente con datos disponibles
    const cliente = {
      id: factura.cliente_id,
      nombre: factura.cliente_nombre,
      numero_documento: factura.numero_documento,
      email: factura.cliente_email,
      telefono: factura.cliente_telefono,
    };

    // Email destino: body override > email del cliente
    const emailTo = req.body.email_to || cliente.email;
    if (!emailTo) {
      return res.status(400).json({ error: 'El cliente no tiene email registrado. Proporcione email_to en el body.' });
    }

    // 3. Enviar factura por correo
    const resultado = await enviarFactura({
      factura,
      tenant: req.tenant,
      cliente,
      items,
      emailTo,
    });

    if (!resultado.enviado) {
      return res.status(500).json({ error: 'No se pudo enviar el email', detalle: resultado.razon });
    }

    logger.info('Email de factura enviado', { factura_id: factura.id, tenant_id: req.tenant.id, destinatario: resultado.destinatario });

    // 4. Responder OK
    return res.json({
      mensaje: 'Factura enviada por email correctamente',
      destinatario: resultado.destinatario,
      messageId: resultado.messageId,
    });
  } catch (err) { next(err); }
});

module.exports = router;

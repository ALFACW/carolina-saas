const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { ventasDia, ventasMes, productosMasVendidos, stockBajo, alertasStock } = require('../controllers/reportesController');

router.use(auth, tenant);
router.get('/ventas-dia', ventasDia);
router.get('/ventas-mes', ventasMes);
router.get('/productos-mas-vendidos', productosMasVendidos);
router.get('/stock-bajo', stockBajo);
router.get('/alertas-stock', alertasStock);

module.exports = router;

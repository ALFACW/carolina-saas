const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { checkPlanLimit } = require('../middleware/planLimits');
const { getDashboard, procesarVenta, getProductosRapido, getProximaFactura } = require('../controllers/posController');

router.use(auth, tenant);
router.get('/dashboard', getDashboard);
router.post('/venta', checkPlanLimit('ventas_dia'), procesarVenta);
router.get('/productos-rapido', getProductosRapido);
router.get('/proxima-factura', getProximaFactura);

module.exports = router;

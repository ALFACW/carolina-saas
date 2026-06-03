const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { checkPlanLimit } = require('../middleware/planLimits');
const { getDashboard, procesarVenta, getProductosRapido } = require('../controllers/posController');

router.use(auth, tenant);
router.get('/dashboard', getDashboard);
router.post('/venta', checkPlanLimit('ventas_dia'), procesarVenta);
router.get('/productos-rapido', getProductosRapido);

module.exports = router;

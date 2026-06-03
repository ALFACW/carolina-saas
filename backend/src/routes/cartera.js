const router = require('express').Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getResumen, getByCliente, registrarPago, getPagos } = require('../controllers/carteraController');

router.use(auth, tenant);
router.get('/', getResumen);
router.get('/cliente/:clienteId', getByCliente);
router.post('/pago', registrarPago);
router.get('/pagos/:facturaId', getPagos);
module.exports = router;

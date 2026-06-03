const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getEstado, validarAlegra, desconectarAlegra } = require('../controllers/onboardingController');

router.use(auth, tenant);
router.get('/estado', getEstado);
router.post('/alegra/validar', validarAlegra);
router.post('/alegra/desconectar', desconectarAlegra);

module.exports = router;

const express = require('express');
const auth    = require('../middleware/auth');
const tenant  = require('../middleware/tenant');
const { requireRole } = require('../middleware/roleGuard');
const ctrl = require('../controllers/siiController');

const router = express.Router();

router.use(auth, tenant);

router.get('/config', ctrl.getConfiguracion);
router.put('/config', requireRole('admin'), ctrl.updateConfiguracion);

module.exports = router;

const express = require('express');
const multer  = require('multer');
const auth    = require('../middleware/auth');
const tenant  = require('../middleware/tenant');
const requireRole = require('../middleware/roleGuard');
const ctrl = require('../controllers/siiController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth, tenant);

router.get('/config',  ctrl.getConfiguracion);
router.get('/folios',  ctrl.getCAFFolios);
router.put('/config',  requireRole('admin'), ctrl.updateConfiguracion);

router.post('/certificado',
  requireRole('admin'),
  upload.single('cert'),
  ctrl.subirCertificado
);

router.post('/caf',
  requireRole('admin'),
  upload.single('caf'),
  ctrl.subirCAF
);

module.exports = router;

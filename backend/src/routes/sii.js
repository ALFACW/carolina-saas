const express = require('express');
const multer  = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/siiController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/config',      ctrl.getConfiguracion);
router.put('/config',      requireRole('admin'), ctrl.updateConfiguracion);
router.get('/folios',      ctrl.getCAFFolios);

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

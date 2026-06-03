const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getAll, getById, getPDF, anular } = require('../controllers/facturaController');

router.use(auth, tenant);
router.get('/', getAll);
router.get('/:id', getById);
router.get('/:id/pdf', getPDF);
router.post('/:id/anular', anular);

module.exports = router;

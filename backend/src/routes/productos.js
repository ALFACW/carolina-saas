const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getAll, getById, create, update, remove, ajusteStock } = require('../controllers/productoController');

router.use(auth, tenant);
router.get('/', getAll);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/ajuste-stock', ajusteStock);

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getAll, getById, create, update, recibir, cancelar } = require('../controllers/compraController');

router.use(auth, tenant);

router.get('/', getAll);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.post('/:id/recibir', recibir);
router.delete('/:id', cancelar);

module.exports = router;

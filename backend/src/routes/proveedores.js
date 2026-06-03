const router = require('express').Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getAll, getById, create, update, remove } = require('../controllers/proveedorController');

router.use(auth, tenant);

router.get('/', getAll);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;

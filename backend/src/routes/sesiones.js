const router = require('express').Router()
const auth = require('../middleware/auth')
const tenant = require('../middleware/tenant')
const { abrir, getSesionActiva, cerrar, getAll, getById, aprobar } = require('../controllers/sesionController')

router.use(auth, tenant)
router.post('/abrir',       abrir)
router.get('/activa',       getSesionActiva)
router.post('/:id/cerrar',  cerrar)
router.get('/',             getAll)
router.get('/:id',          getById)
router.post('/:id/aprobar', aprobar)

module.exports = router

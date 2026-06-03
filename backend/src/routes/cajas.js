const router = require('express').Router()
const auth = require('../middleware/auth')
const tenant = require('../middleware/tenant')
const { getAll, create, update, remove } = require('../controllers/cajaController')

function soloAdmin(req, res, next) {
  if (!['admin', 'supervisor'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Sin permiso' })
  }
  next()
}

router.use(auth, tenant)
router.get('/', getAll)
router.use(soloAdmin)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const tenant = require('../middleware/tenant')
const { checkPlanLimit } = require('../middleware/planLimits')
const { getAll, create, update, remove, resetPassword, reactivate } = require('../controllers/usuarioController')

// Solo admin puede gestionar usuarios
function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede gestionar usuarios' })
  }
  next()
}

router.use(auth, tenant, soloAdmin)
router.get('/',                        getAll)
router.post('/', checkPlanLimit('usuarios'), create)
router.put('/:id',                     update)
router.delete('/:id',                  remove)
router.put('/:id/reset-password',      resetPassword)
router.put('/:id/reactivar',           reactivate)

module.exports = router

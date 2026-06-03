const router = require('express').Router()
const auth = require('../middleware/auth')
const {
  login,
  requireSuperAdmin,
  getTenants,
  getTenantById,
  updateTenant,
  getEstadisticas,
} = require('../controllers/superAdminController')

// Login público — no necesita JWT previo
router.post('/login', login)

// Todas las rutas siguientes requieren JWT con rol carolina_admin
router.use(auth, requireSuperAdmin)

router.get('/tenants',        getTenants)
router.get('/tenants/:id',    getTenantById)
router.put('/tenants/:id',    updateTenant)
router.get('/estadisticas',   getEstadisticas)

module.exports = router

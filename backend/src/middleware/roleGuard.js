/**
 * Fábrica de middleware de roles.
 * Uso: router.get('/ruta', requireRole('admin', 'supervisor'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Se requiere rol: ${roles.join(' o ')}`,
      })
    }
    next()
  }
}

module.exports = { requireRole }

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const auth = require('../middleware/auth');
const { register, login, refresh, logout, me, actualizarPerfil, cambiarPassword } = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // 20 intentos por ventana por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.' },
  skipSuccessfulRequests: true, // no cuenta los logins exitosos
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta IP. Intenta nuevamente en 1 hora.' },
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.get('/me', auth, me);
router.put('/perfil', auth, actualizarPerfil);
router.put('/password', auth, cambiarPassword);

module.exports = router;

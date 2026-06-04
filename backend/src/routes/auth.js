const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { register, login, refresh, logout, me, actualizarPerfil, cambiarPassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.get('/me', auth, me);
router.put('/perfil', auth, actualizarPerfil);
router.put('/password', auth, cambiarPassword);

module.exports = router;

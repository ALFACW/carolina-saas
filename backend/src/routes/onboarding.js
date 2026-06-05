const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getEstado } = require('../controllers/onboardingController');

router.use(auth, tenant);
router.get('/estado', getEstado);

module.exports = router;

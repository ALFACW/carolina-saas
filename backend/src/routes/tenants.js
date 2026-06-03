const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { getMe, updateMe, changePlan, getUsage } = require('../controllers/tenantController');

router.use(auth, tenant);
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/plan', changePlan);
router.get('/usage', getUsage);

module.exports = router;

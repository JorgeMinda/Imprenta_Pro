// src/routes/stats.routes.js  (reemplaza el existente)
const router = require('express').Router();
const stats  = require('../controllers/statsController');
const auth   = require('../middleware/auth.middleware');

router.get('/dashboard', auth, stats.getDashboardStats);
router.get('/reportes',  auth, stats.getReportes);

module.exports = router;
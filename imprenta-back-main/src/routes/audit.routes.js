// src/routes/audit.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/audit.controller');
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// Rutas de auditoría exclusivas para el Administrador
router.use(auth);
router.use(checkRole('admin'));

router.get('/',      ctrl.listarLogs);
router.get('/stats', ctrl.obtenerStats);

module.exports = router;

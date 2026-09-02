// src/routes/inventario.routes.js
const router  = require('express').Router();
const inv     = require('../controllers/inventario.controller');
const auth    = require('../middleware/auth.middleware');
const check   = require('../middleware/role.middleware');

router.get('/',             auth, inv.listarInventario);
router.get('/alertas',      auth, inv.alertasStock);
router.get('/materiales',   auth, inv.listarMateriales);
router.get('/movimientos',  auth, inv.historialMovimientos);
router.post('/materiales',  auth, check('admin', 'vendedor'), inv.crearMaterial);
router.put('/:id',          auth, check('admin', 'vendedor'), inv.editarMaterial);
router.delete('/:id',       auth, check('admin'),             inv.eliminarMaterial);
router.post('/movimientos', auth, check('admin', 'vendedor'), inv.registrarMovimiento);

module.exports = router;
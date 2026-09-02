// src/routes/facturacion.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/facturacion.controller');
const auth   = require('../middleware/auth.middleware');
const check  = require('../middleware/role.middleware');

router.get('/',           auth,                          ctrl.listar);
router.post('/',          auth, check('admin','vendedor'), ctrl.crear);
router.patch('/:id',      auth, check('admin','vendedor'), ctrl.cambiarEstado);
router.delete('/:id',     auth, check('admin'),            ctrl.eliminar);

module.exports = router;
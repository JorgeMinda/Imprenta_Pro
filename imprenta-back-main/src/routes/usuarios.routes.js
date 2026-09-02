// src/routes/usuarios.routes.js
const router = require('express').Router();
const u      = require('../controllers/usuarios.controller');
const auth   = require('../middleware/auth.middleware');
const check  = require('../middleware/role.middleware');

router.get('/',                    auth, check('admin'), u.listar);
router.post('/',                   auth, check('admin'), u.crear);
router.put('/:id',                 auth, check('admin'), u.editar);
router.patch('/:id/password',      auth,                 u.cambiarPassword);
router.delete('/:id',              auth, check('admin'), u.eliminar);

module.exports = router;
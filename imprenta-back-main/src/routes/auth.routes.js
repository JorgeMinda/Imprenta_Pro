const router = require('express').Router();
const auth = require('../controllers/auth.controller');

// POST /register ELIMINADO — los usuarios se crean desde /api/usuarios (solo admin)
router.post('/login', auth.login);

module.exports = router;
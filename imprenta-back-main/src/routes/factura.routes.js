const router = require('express').Router();
const factura = require('../controllers/factura.controller');
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

router.get('/orden/:ordenId', auth, checkRole('admin', 'vendedor'), factura.generarFactura);

module.exports = router;
const router = require('express').Router();
const order = require('../controllers/order.controller');
const auth = require('../middleware/auth.middleware');

router.post('/', auth, order.createOrder);
router.get('/', auth, order.listarOrdenes);
router.patch('/:id', auth, order.actualizarEstado);
module.exports = router;
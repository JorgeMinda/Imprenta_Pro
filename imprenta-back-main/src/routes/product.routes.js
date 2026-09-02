const router = require('express').Router();

// Importa el middleware (sin destructuring, porque es module.exports = fn)
const checkRole = require('../middleware/role.middleware');

const {
  listarProductos,
  getProductoById,
  crearProducto,
  actualizarProducto,
  eliminarProducto
} = require('../controllers/product.controller');

const auth = require('../middleware/auth.middleware');

// Rutas públicas o con auth simple
router.get('/', auth, listarProductos);
router.get('/:id', auth, getProductoById);

// Rutas que requieren rol específico (usa checkRole con argumentos)
router.post('/', auth, checkRole('admin'), crearProducto);
router.put('/:id', auth, checkRole('admin'), actualizarProducto);
router.delete('/:id', auth, checkRole('admin'), eliminarProducto);

module.exports = router;
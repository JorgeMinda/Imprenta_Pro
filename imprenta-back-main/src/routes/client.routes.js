const router = require('express').Router();

const {
  listarClientes,
  getClienteById,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} = require('../controllers/client.controller');

const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');  // ← import directo

router.get('/', auth, listarClientes);
router.get('/:id', auth, getClienteById);
router.post('/', auth, checkRole('admin', 'vendedor', 'secretaria'), crearCliente);
router.put('/:id', auth, checkRole('admin', 'vendedor', 'secretaria'), actualizarCliente);
router.delete('/:id', auth, checkRole('admin'), eliminarCliente);

module.exports = router;
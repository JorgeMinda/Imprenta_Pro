const router = require('express').Router();

const { 
  crearCotizacion, 
  listarCotizaciones,
  aprobarCotizacion,
  rechazarCotizacion,
  eliminarCotizacion // <-- 1. Cámbialo aquí
} = require('../controllers/cotizacion.controller');

const verifyToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// Listar cotizaciones (GET)
router.get('/', verifyToken, checkRole('admin', 'vendedor', 'empleado'), listarCotizaciones);

// Crear cotización (POST)
router.post('/', verifyToken, checkRole('admin', 'vendedor'), crearCotizacion);

// Aprobar cotización (POST)
router.post('/:id/aprobar', verifyToken, checkRole('admin', 'vendedor'), aprobarCotizacion);

// Rechazar cotización (PATCH)
router.patch('/:id', verifyToken, checkRole('admin', 'vendedor'), rechazarCotizacion);

// Eliminar cotización (DELETE)
router.delete('/:id', verifyToken, checkRole('admin'), eliminarCotizacion); // <-- 2. Y cámbialo aquí

module.exports = router;
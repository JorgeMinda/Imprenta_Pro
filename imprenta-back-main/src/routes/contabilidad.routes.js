// src/routes/contabilidad.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/contabilidad.controller');
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// Todas las rutas contables requieren autenticación y rol de admin o secretaria
router.use(auth);
router.use(checkRole('admin', 'secretaria'));

// Plan de cuentas
router.get('/cuentas',                       ctrl.listarCuentas);
router.post('/cuentas',                      ctrl.crearCuenta);

// Asientos contables / Libro diario
router.get('/asientos',                      ctrl.listarAsientos);
router.get('/asientos/:id',                  ctrl.obtenerAsiento);
router.post('/asientos',                     ctrl.crearAsiento);
router.patch('/asientos/:id/anular',         ctrl.anularAsiento);

// Libro mayor
router.get('/libro-mayor/:cuentaId',         ctrl.obtenerLibroMayor);

// Reportes financieros
router.get('/balance-general',               ctrl.obtenerBalanceGeneral);
router.get('/balance-general/pdf',           ctrl.generarBalancePDF);
router.get('/estado-resultados',             ctrl.obtenerEstadoResultados);
router.get('/estado-resultados/pdf',         ctrl.generarEstadoResultadosPDF);

// Estado de cuenta de clientes (Débito y Crédito)
router.get('/estado-cuenta-cliente/:clienteId', ctrl.obtenerEstadoCuentaCliente);

module.exports = router;

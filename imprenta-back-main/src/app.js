// src/app.js — versión completa con todas las rutas
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

const authRoutes       = require('./routes/auth.routes');
const productRoutes    = require('./routes/product.routes');
const orderRoutes      = require('./routes/order.routes');
const clientRoutes     = require('./routes/client.routes');
const cotizacionRoutes = require('./routes/cotizacion.routes');
const facturaRoutes    = require('./routes/factura.routes');
const statsRoutes      = require('./routes/stats.routes');
const inventarioRoutes = require('./routes/inventario.routes');   // NUEVO
const usuariosRoutes   = require('./routes/usuarios.routes');      // NUEVO
const facturacionRoutes = require('./routes/facturacion.routes');
const contabilidadRoutes = require('./routes/contabilidad.routes');
const app = express();

// ── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet());

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: { msg: 'Demasiadas peticiones, intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting más estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { msg: 'Demasiados intentos de autenticación, espera 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    process.env.FRONTEND_URL,
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));

app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',           authLimiter, authRoutes);
app.use('/api/productos',      productRoutes);
app.use('/api/ordenes_trabajo',orderRoutes);
app.use('/api/clientes',       clientRoutes);
app.use('/api/cotizaciones',   cotizacionRoutes);
app.use('/api/facturas',       facturaRoutes);
app.use('/api/stats',          statsRoutes);
app.use('/api/inventario',     inventarioRoutes);   // NUEVO
app.use('/api/usuarios',       usuariosRoutes);      // NUEVO
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/contabilidad', contabilidadRoutes);

// Ruta de salud
app.get('/', (_req, res) => res.json({ ok: true, msg: 'Imprenta PRO API v2' }));

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('Error en servidor:', err.stack);
  res.status(500).json({
    msg: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

module.exports = app;
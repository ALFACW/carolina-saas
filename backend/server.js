require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./src/lib/logger');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Intenta en un momento.' },
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Rutas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/tenants', require('./src/routes/tenants'));
app.use('/api/onboarding', require('./src/routes/onboarding'));
app.use('/api/productos', require('./src/routes/productos'));
app.use('/api/clientes', require('./src/routes/clientes'));
app.use('/api/facturas', require('./src/routes/facturas'));
app.use('/api/pos', require('./src/routes/pos'));
app.use('/api/reportes', require('./src/routes/reportes'));
app.use('/api/importar', require('./src/routes/importar'));
app.use('/api/usuarios',    require('./src/routes/usuarios'));
app.use('/api/cajas',      require('./src/routes/cajas'));
app.use('/api/sesiones',   require('./src/routes/sesiones'));
app.use('/api/super-admin', require('./src/routes/superAdmin'));
app.use('/api/proveedores', require('./src/routes/proveedores'));
app.use('/api/compras', require('./src/routes/compras'));
app.use('/api/cartera', require('./src/routes/cartera'));
app.use('/api/qz',     require('./src/routes/qz'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Carolina Backend corriendo en puerto ${PORT}`, { env: process.env.NODE_ENV });
});

module.exports = app;

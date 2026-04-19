require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const { error } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware bảo mật & utility (theo NFR) ===
app.use(helmet());                                    // NFR: bảo vệ HTTP headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limit theo NFR: 100 req/phút/IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
});
app.use('/api/', limiter);

// === Routes ===
app.get('/', (req, res) => {
  res.json({
    name: 'Mioto Clone API',
    version: '1.0.0',
    status: 'running',
    docs: '/api',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

// === 404 handler ===
app.use((req, res) => {
  error(res, `Endpoint ${req.method} ${req.path} không tồn tại`, 404);
});

// === Error handler chung ===
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  error(res, err.message || 'Lỗi server không xác định', 500);
});

app.listen(PORT, () => {
  console.log(`Mioto API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

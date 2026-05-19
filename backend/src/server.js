require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const bookingRoutes = require('./routes/booking.routes');
const kycRoutes = require('./routes/kyc.routes');
const cardRoutes = require('./routes/card.routes');
const reviewRoutes = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const favoriteRoutes = require('./routes/favorite.routes');
const addressRoutes = require('./routes/address.routes');
const chatRoutes = require('./routes/chat.routes');
const pointsRoutes = require('./routes/points.routes');
const conversationRoutes = require('./routes/conversation.routes');
const voucherRoutes = require('./routes/voucher.routes');
const hostRoutes = require('./routes/host.routes');
const { error } = require('./utils/response');

const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware bao mat & utility (theo NFR) ===
app.use(helmet());                                    // NFR: bao ve HTTP headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limit theo NFR: 100 req/phut/IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Qua nhieu request, vui long thu lai sau' },
});
app.use('/api/', limiter);

// === Routes ===
app.get('/', (req, res) => {
  res.json({
    name: 'Mioto Clone API',
    version: '2.0.0',
    status: 'running',
    docs: '/api',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/host', hostRoutes);

// === 404 handler ===
app.use((req, res) => {
  error(res, `Endpoint ${req.method} ${req.path} khong ton tai`, 404);
});

// === Error handler chung (buoi 5: ho tro err.status tu service) ===
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  const code = err.code || null;
  if (!res.headersSent) {
    error(res, err.message || 'Lỗi server không xác định', status, code);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mioto API server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

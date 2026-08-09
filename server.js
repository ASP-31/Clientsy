const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { connectDB, checkConnection } = require('./config/db');
const { getJwtSecret, toErrorPayload } = require('./Middleware/security');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

getJwtSecret();

// Trust first proxy when running behind a reverse proxy (e.g. Render/Railway/Nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"]
        }
      }
    : false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isProduction ? 500 : 2000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 20 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.length === 0)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cache static assets in production (fingerprinted assets can be cached aggressively;
// index.html is excluded below to keep updates fresh)
const STATIC_MAX_AGE = isProduction ? '7d' : '1h';
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), { maxAge: STATIC_MAX_AGE, etag: true }));
app.use('/js', express.static(path.join(__dirname, 'public', 'js'), { maxAge: STATIC_MAX_AGE, etag: true }));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), { maxAge: STATIC_MAX_AGE, etag: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const { protect, restrictTo } = require('./Middleware/auth');
app.use('/api', checkConnection);
app.use('/api/auth', require('./Routes/authRoutes'));
app.use('/api/clients', protect, restrictTo('developer', 'admin'), require('./Routes/clientRoutes'));
app.use('/api/documents', protect, restrictTo('developer', 'admin'), require('./Routes/documentRoutes'));
app.use('/api/projects', protect, restrictTo('developer', 'admin'), require('./Routes/projectRoutes'));
app.use('/api/invoices', protect, restrictTo('developer', 'admin'), require('./Routes/invoiceRoutes'));
app.use('/api/proposals', protect, restrictTo('developer', 'admin'), require('./Routes/proposalRoutes'));
app.use('/api/intakes', protect, restrictTo('developer', 'admin'), require('./Routes/intakeRoutes'));
app.use('/api/meetings', protect, restrictTo('developer', 'admin'), require('./Routes/meetingRoutes'));
app.use('/api/reviews', protect, restrictTo('developer', 'admin'), require('./Routes/reviewRoutes'));
app.use('/api/team', protect, restrictTo('developer', 'admin'), require('./Routes/teamRoutes'));
app.use('/api/portal', protect, restrictTo('client', 'admin'), require('./Routes/portalRoutes'));
app.use('/api/public', require('./Routes/publicRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    uptime: process.uptime(),
    db: dbLabel,
    timestamp: new Date().toISOString()
  });
});

// JSON parse error handler (must come after routes for body-parser errors)
app.use('/api', (err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body' });
  }
  next(err);
});

// Fallback to SPA index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API route not found' });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  if (!isProduction) {
    console.error(`[${new Date().toISOString()}] ${error.stack}`);
  }
  if (res.headersSent) {
    return next(error);
  }
  const { statusCode, message } = toErrorPayload(error);
  res.status(statusCode).json({ success: false, message });
});

// Connect to MongoDB and start the server
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  if (server) server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
  mongoose.connection.close();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB, checkConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const { protect } = require('./Middleware/auth');
app.use('/api', checkConnection);
app.use('/api/auth', require('./Routes/authRoutes'));
app.use('/api/clients', protect, require('./Routes/clientRoutes'));
app.use('/api/documents', protect, require('./Routes/documentRoutes'));
app.use('/api/projects', protect, require('./Routes/projectRoutes'));
app.use('/api/invoices', protect, require('./Routes/invoiceRoutes'));
app.use('/api/proposals', protect, require('./Routes/proposalRoutes'));
app.use('/api/intakes', protect, require('./Routes/intakeRoutes'));
app.use('/api/meetings', protect, require('./Routes/meetingRoutes'));
app.use('/api/reviews', protect, require('./Routes/reviewRoutes'));
app.use('/api/team', protect, require('./Routes/teamRoutes'));
app.use('/api/portal', protect, require('./Routes/portalRoutes'));
app.use('/api/public', require('./Routes/publicRoutes'));

// Fallback to SPA index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API route not found' });
  }
});

// Connect to MongoDB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

module.exports = app;
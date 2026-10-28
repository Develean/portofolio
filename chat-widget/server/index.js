const express = require('express');
const cors = require('cors');
const config = require('./config');
const { validateChatInput } = require('./middleware/validator');
const { rateLimiter } = require('./middleware/rateLimiter');
const { securityShield } = require('./middleware/securityShield');
const { generateAiReply } = require('./services/aiService');

const app = express();

// Keamanan header dasar
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser dengan batasan payload ketat (10KB)
app.use(express.json({ limit: '10kb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Develean Portfolio AI Chat Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Chat Endpoint
app.post('/api/chat', rateLimiter, validateChatInput, securityShield, async (req, res, next) => {
  try {
    const userMessage = req.cleanedMessage;
    const result = await generateAiReply(userMessage);

    return res.status(200).json({
      success: true,
      reply: result.reply,
      engine: result.engine
    });
  } catch (err) {
    next(err);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint tidak ditemukan.'
  });
});

// Global Error Handler (tidak pernah membocorkan stack trace ke client)
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    success: false,
    error: 'Terjadi kesalahan sistem internal. Silakan coba kembali sesaat lagi.'
  });
});

// Menjalankan server jika dipanggil langsung
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`[ChatWidget Server] Berjalan pada http://localhost:${config.port}`);
    console.log(`[ChatWidget Server] Health check: http://localhost:${config.port}/api/health`);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('[ChatWidget Server] Ditutup dengan aman.');
    });
  });
}

module.exports = app;

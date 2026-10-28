require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:1.5b',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 8000
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 15
  }
};

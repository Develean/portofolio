/**
 * Rate Limiter Middleware
 * Memory sliding window per client IP untuk mencegah spam / abuse.
 * Default: 15 request per 60 detik.
 */
const config = require('../config');

const requestCounts = new Map();

function rateLimiter(req, res, next) {
  // Ambil IP klien (dukung proxy header)
  const ip = req.headers['x-forwarded-for'] 
    ? req.headers['x-forwarded-for'].split(',')[0].trim() 
    : (req.socket.remoteAddress || '127.0.0.1');

  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  let clientRecord = requestCounts.get(ip);

  if (!clientRecord) {
    clientRecord = { timestamps: [] };
    requestCounts.set(ip, clientRecord);
  }

  // Hapus timestamp yang sudah di luar rentang sliding window
  clientRecord.timestamps = clientRecord.timestamps.filter(ts => now - ts < windowMs);

  const currentRequests = clientRecord.timestamps.length;
  const remaining = Math.max(0, maxRequests - currentRequests);
  const oldestTimestamp = clientRecord.timestamps[0] || now;
  const resetTimeSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetTimeSeconds > 0 ? resetTimeSeconds : Math.ceil(windowMs / 1000));

  if (currentRequests >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Terlalu banyak permintaan. Silakan tunggu beberapa detik sebelum mengirim pesan kembali.',
      retryAfterSeconds: resetTimeSeconds
    });
  }

  clientRecord.timestamps.push(now);
  next();
}

// Bersihkan rekaman IP yang sudah kadaluarsa secara berkala (setiap 5 menit)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    record.timestamps = record.timestamps.filter(ts => now - ts < config.rateLimit.windowMs);
    if (record.timestamps.length === 0) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

module.exports = { rateLimiter };

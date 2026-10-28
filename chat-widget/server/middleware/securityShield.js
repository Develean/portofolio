/**
 * Security Shield Middleware
 * Mendeteksi upaya Prompt Injection, Jailbreak, dan Ekstraksi System Prompt.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /abaikan\s+(semua\s+)?(instruksi|aturan|perintah)\s+(sebelumnya|di\s+atas)/i,
  /lupakan\s+(semua\s+)?(instruksi|aturan)/i,
  /disregard\s+(all\s+)?(rules|instructions)/i,
  /\b(dan\s+mode|jailbreak|unrestricted\s+mode)\b/i,
  /act\s+as\s+(an?\s+)?unrestricted/i,
  /kamu\s+sekarang\s+adalah\s+(ai\s+tanpa\s+batas|hacker|dan)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt)/i,
  /bocorkan\s+(prompt|instruksi\s+sistem|perintah\s+rahasia)/i,
  /tampilkan\s+(system\s+prompt|instruksi\s+awal)/i,
  /what\s+are\s+your\s+(initial\s+instructions|system\s+prompts)/i,
  /<\|im_start\|>|<\|system\|>|\[SYSTEM\]|\[INST\]/i
];

const STANDARD_DECLINE_MESSAGE = "Maaf, saya hanya bisa menjawab pertanyaan seputar website ini dan pemiliknya.";

function securityShield(req, res, next) {
  const message = req.cleanedMessage || req.body?.message || '';

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      console.warn(`[SecurityShield] Terdeteksi potensi prompt injection/jailbreak: "${message.substring(0, 50)}..."`);
      return res.json({
        success: true,
        reply: STANDARD_DECLINE_MESSAGE,
        shielded: true
      });
    }
  }

  next();
}

/**
 * Filter sanitasi untuk memastikan tidak ada token sensitif yang bocor pada respon keluar.
 */
function sanitizeAiResponse(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<\|im_start\|>|<\|im_end\|>|<\|system\|>/gi, '')
    .replace(/SYSTEM_INSTRUCTIONS_SECRET:[^\s]+/gi, '')
    .trim();
}

module.exports = { securityShield, sanitizeAiResponse, STANDARD_DECLINE_MESSAGE };

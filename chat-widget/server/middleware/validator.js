/**
 * Validator Middleware
 * Memastikan payload input chat valid, bertipe string, dan berada dalam batas panjang yang aman.
 */
function validateChatInput(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Format payload tidak valid. Diperlukan objek JSON.'
    });
  }

  const { message } = req.body;

  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Pesan harus berupa teks (string).'
    });
  }

  // Bersihkan karakter null byte dan whitespace berlebih
  const cleaned = message.replace(/\0/g, '').trim();

  if (cleaned.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Pesan tidak boleh kosong.'
    });
  }

  if (cleaned.length > 350) {
    return res.status(400).json({
      success: false,
      error: 'Pesan terlalu panjang (maksimum 350 karakter).'
    });
  }

  // Simpan pesan yang sudah dibersihkan ke req
  req.cleanedMessage = cleaned;
  next();
}

module.exports = { validateChatInput };

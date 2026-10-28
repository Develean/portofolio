# Portfolio Website & AI Chat Widget — Muhammad Akmal Faishal (Develean)

Sebuah website portofolio interaktif bertema **Dark Cosmic Cyberpunk** yang dilengkapi dengan **AI Chat Widget** khusus untuk menjawab pertanyaan seputar website portofolio dan profil terverifikasi dari pemilik (Muhammad Akmal Faishal / Develean).

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur Sistem](#-arsitektur-sistem)
3. [Struktur Folder](#-struktur-folder)
4. [Prasyarat Sistem](#-prasyarat-sistem)
5. [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
6. [Konfigurasi Model AI (Ollama & Fallback)](#-konfigurasi-model-ai-ollama--fallback)
7. [Kebijakan Keamanan & Pembatasan Scope](#-kebijakan-keamanan--pembatasan-scope)
8. [Pengujian Otomatis (Test Suite)](#-pengujian-otomatis-test-suite)
9. [Rencana Pengembangan Masa Depan](#-rencana-pengembangan-masa-depan)

---

## 🌟 Fitur Utama

### 1. Website Portofolio Interaktif
- **Hero Section Sinematik**: Efek typewriter santai dengan background 100% hitam pekat pada intro awal, lalu latar belakang konstelasi 3D aktif permanen begitu kursor diarahkan ke teks atau halaman di-scroll.
- **Holographic Glint**: Animasi mengkilat dua detik sekali pada kata *"world"* di headline utama.
- **Lanyard ID Card 3D Fisika**: Kartu identitas interaktif yang dapat diayun dan dibalik menggunakan simulasi tali Verlet dengan foto asli pemilik, grafis orbital kosmik, dan QR Code dinamis yang langsung menuju profil LinkedIn resmi.
- **Otak Prosedural 3D (Procedural Brain)**: Visualisasi ribuan partikel saraf WebGL Three.js untuk merepresentasikan pilar keahlian teknis (Laravel, Nuxt.js, Tailwind, Database, AI, DevOps).
- **Selected Works**: Pratinjau interaktif kartu melayang yang memamerkan proyek unggulan, termasuk tautan langsung ke **Sistem Kasir** (`https://sistem-kasir-eight.vercel.app/`), **Presensi Digital**, dan **Spec-First Architect**.

### 2. AI Chat Widget Khusus
- **Tombol Melayang (Floating Trigger)**: Terletak di pojok kanan bawah layar dengan efek glassmorphism kosmik dan animasi hover.
- **Strict Scope Boundaries**: AI hanya merespon pertanyaan tentang:
  1. Website ini (tujuan, teknologi, section, fitur).
  2. Pemilik website (Muhammad Akmal Faishal / Develean) berdasarkan profil terverifikasi.
- **Penolakan Sopan**: Menolak topik umum (resep makanan, cuaca, politik, pembuatan kode acak) dengan pesan standar:
  > *"Maaf, saya hanya bisa menjawab pertanyaan seputar website ini dan pemiliknya."*
- **Perlindungan Data Privat**: Menolak memberikan data pribadi yang tidak dicantumkan (nomor WhatsApp, alamat rumah, tanggal lahir) demi menjaga privasi.
- **Prompt Injection Defense**: Mendeteksi dan memblokir upaya jailbreak, mode DAN, atau instruksi pembocoran system prompt secara otomatis.
- **Dual Engine (Zero Cost & Offline Resilient)**:
  - Berkomunikasi langsung dengan **Ollama** lokal (`qwen2.5:1.5b` atau `llama3.2:1b/3b`) tanpa biaya API cloud.
  - Jika Ollama offline atau belum terpasang, backend secara transparan beralih ke **Grounded Knowledge Matching Engine** sehingga widget tetap berfungsi optimal tanpa error.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (Frontend)                   │
│                                                             │
│  [ index.html ] ── [ Three.js 3D Engine ]                   │
│         │                                                   │
│         └── [ chat-widget.js & chat-widget.css ]            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP POST /api/chat (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Express.js Server (Backend)                  │
│                                                             │
│  1. Rate Limiter (Memory sliding window: 15 req/menit)      │
│  2. Payload Validator (1-350 karakter, sanitasi null-byte)  │
│  3. Security Shield (Deteksi Jailbreak & Prompt Injection)  │
│  4. Knowledge Service (website.json & owner.json)           │
│  5. AI Service Orchestrator:                                │
│       ├── Primary: Local Ollama HTTP (qwen2.5:1.5b)         │
│       └── Fallback: Grounded Knowledge Matcher              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Folder

```
/home/develean/Documents/myProject/portofolio/
├── index.html                      # Halaman utama portofolio (ringkas & semantik)
├── README.md                       # Dokumentasi lengkap proyek
├── assets/
│   ├── css/
│   │   └── style.css               # Styling utama website (Dark Cosmic Cyberpunk)
│   ├── js/
│   │   ├── main.js                 # Engine interaktif Three.js 3D, Lanyard, & WebGL
│   │   └── skills-data.js          # Basis data keahlian & proyek (SK array)
│   └── images/
│       ├── foto_profil.jpg         # Foto asli pemilik untuk ID Card Lanyard
│       ├── head.png                # Siluet hologram titik 3D (marble head)
│       └── sistem_kasir.jpg        # Pratinjau tangkapan layar proyek sistem kasir
└── chat-widget/
    ├── client/
    │   ├── chat-widget.css         # Styling antarmuka widget glassmorphism
    │   └── chat-widget.js          # Logika frontend widget & auto-injector
    ├── server/
    │   ├── .env                    # Variabel konfigurasi lingkungan
    │   ├── .env.example            # Contoh template konfigurasi
    │   ├── config.js               # Parser konfigurasi runtime
    │   ├── index.js                # Server utama Express.js
    │   ├── package.json            # Daftar dependensi backend
    │   ├── knowledge/
    │   │   ├── owner.json          # Basis pengetahuan terverifikasi pemilik
    │   │   └── website.json        # Basis pengetahuan terverifikasi website
    │   ├── middleware/
    │   │   ├── rateLimiter.js      # Pengaman laju request (anti-spam)
    │   │   ├── securityShield.js   # Filter prompt injection & bypass
    │   │   └── validator.js        # Validasi tipe data & batasan panjang
    │   └── services/
    │       ├── aiService.js        # Koneksi Ollama & Fallback Engine
    │       └── knowledgeService.js # Loader basis data JSON
    └── tests/
        └── scenarioTest.js         # Pengujian otomatis skenario A - G
```

---

## ⚙️ Prasyarat Sistem

- **Node.js**: Versi 18+ (direkomendasikan v20 / v22)
- **Web Browser**: Chrome, Firefox, Edge, atau browser berbasis Chromium modern dengan dukungan WebGL.
- **Ollama** (Opsional untuk LLM lokal): [Download Ollama](https://ollama.com/)

---

## 🚀 Panduan Instalasi & Menjalankan

### Langkah 1: Masuk ke Direktori Proyek
```bash
cd /home/develean/Documents/myProject/portofolio/chat-widget/server
```

### Langkah 2: Install Dependensi
```bash
npm install
```

### Langkah 3: Jalankan Backend AI Chat
```bash
npm start
```
Server akan berjalan di `http://localhost:3001` dengan pesan:
```
[ChatWidget Server] Berjalan pada http://localhost:3001
[ChatWidget Server] Health check: http://localhost:3001/api/health
```

### Langkah 4: Buka Website Portofolio
Anda dapat membuka file `index.html` langsung di browser, atau menggunakan live server lokal:
```bash
# Dari root folder portofolio:
cd /home/develean/Documents/myProject/portofolio
npx serve .
# Atau buka langsung di browser: file:///home/develean/Documents/myProject/portofolio/index.html
```

---

## 🤖 Konfigurasi Model AI (Ollama & Fallback)

Secara default, file `.env` diatur untuk model ringan `qwen2.5:1.5b`:
```ini
PORT=3001
CORS_ORIGIN=*
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
OLLAMA_TIMEOUT_MS=8000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=15
```

Jika Anda ingin mengaktifkan Ollama secara lokal di mesin Anda:
```bash
# 1. Jalankan service ollama
ollama serve

# 2. Tarik model qwen2.5 (atau llama3.2:1b)
ollama pull qwen2.5:1.5b
```

> **Catatan Resiliensi**: Jika Ollama belum diaktifkan, backend secara otomatis dan mulus beralih ke **Grounded Fallback Engine**. Seluruh pertanyaan valid tentang website dan pemilik tetap terjawab secara akurat tanpa kendala.

---

## 🛡️ Kebijakan Keamanan & Pembatasan Scope

1. **Strict Input Sanitization**:
   - Membatasi input pesan antara 1 hingga 350 karakter.
   - Menghapus karakter berbahaya (*null bytes*, control sequences).
2. **Rate Limiting**:
   - Maksimum 15 request per menit per alamat IP untuk mencegah DoS/spamming.
3. **Prompt Injection & Jailbreak Shield**:
   - Menginspeksi kalimat terhadap pola jailbreak seperti `ignore previous instructions`, `DAN mode`, `kamu sekarang adalah...`, atau upaya pembocoran system prompt.
   - Mengembalikan penolakan santun tanpa memaparkan trace error server.
4. **No Stack Trace Leaks**:
   - Error handler global mengabstraksi seluruh galat internal menjadi respon JSON ramah pengguna.
5. **No Hallucination for Private Data**:
   - Informasi pribadi seperti nomor HP, alamat rumah lengkap, dan umur/tanggal lahir tidak akan pernah dikarang oleh sistem.

---

## 🧪 Pengujian Otomatis (Test Suite)

Untuk memvalidasi integritas seluruh skenario fungsionalitas dan keamanan, jalankan:
```bash
cd /home/develean/Documents/myProject/portofolio/chat-widget/server
npm test
```

### Hasil Pengujian Terverifikasi:
```
====================================================
🚀 MENJALANKAN PENGUJIAN OTOMATIS AI CHAT WIDGET
====================================================

✅ [PASS] Skenario G: Health Check Endpoint
✅ [PASS] Skenario A: Informasi Relevan Website
✅ [PASS] Skenario B: Informasi Relevan Pemilik
✅ [PASS] Skenario C: Penolakan Sopan Topik di Luar Cakupan
✅ [PASS] Skenario D: Penolakan Permintaan Coding Umum
✅ [PASS] Skenario E: Penanganan Aman Informasi Privat
✅ [PASS] Skenario F: Pertahanan Prompt Injection & System Leak

====================================================
HASIL: 7 / 7 Skenario Berhasil Terlewati (100%)
====================================================
```

---

## 🔮 Rencana Pengembangan Masa Depan

- [ ] Dukungan streaming respon token (Server-Sent Events) untuk efek mengetik langsung dari Ollama.
- [ ] Pengayaan visual 3D pada avatar widget (miniatur orbital sphere yang merespons status typing).
- [ ] Integrasi webhook notifikasi email/Telegram ketika pengunjung mengajukan pertanyaan proyek kerja sama.

# Portfolio — Muhammad Akmal Faishal (Develean)

Website portofolio interaktif berbasis 3D WebGL (Three.js) yang dilengkapi asisten virtual AI Chat Widget.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Three.js, GSAP, Lenis
- **Backend (AI Chat)**: Node.js, Express.js, Ollama (Local LLM) / Grounded Knowledge Engine

---

## 📁 Struktur Direktori

```text
portofolio/
├── index.html              # Halaman utama portofolio
├── assets/
│   ├── css/style.css       # Styling website
│   ├── js/
│   │   ├── main.js         # Logika 3D Three.js & interaksi
│   │   └── skills-data.js  # Data keahlian & proyek
│   └── images/             # Asset gambar & foto profil
└── chat-widget/
    ├── client/             # Frontend widget chat
    ├── server/             # Backend API & knowledge service
    └── tests/              # Pengujian otomatis
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Backend AI Chat
```bash
cd chat-widget/server
npm install
npm start
```
*Backend berjalan pada `http://localhost:3001`.*

### 2. Buka Website Portofolio
Buka file `index.html` langsung di browser, atau jalankan melalui server lokal:
```bash
# Dari root folder:
npx serve .
```

---

## 🧪 Pengujian Otomatis
Untuk menjalankan suite pengujian otomatis AI Chat:
```bash
cd chat-widget
node tests/scenarioTest.js
```

---

## 📬 Kontak
- **Email**: [faishalakmal857@gmail.com](mailto:faishalakmal857@gmail.com)
- **LinkedIn**: [Muhammad Akmal Faishal](https://www.linkedin.com/in/muhammad-akmal-faishal-46689237b/)
- **GitHub**: [@Develean](https://github.com/Develean)

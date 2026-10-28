const fs = require('fs');
const path = require('path');

const websitePath = path.join(__dirname, '../knowledge/website.json');
const ownerPath = path.join(__dirname, '../knowledge/owner.json');

let cachedWebsite = null;
let cachedOwner = null;

function loadKnowledge() {
  try {
    if (!cachedWebsite && fs.existsSync(websitePath)) {
      cachedWebsite = JSON.parse(fs.readFileSync(websitePath, 'utf8'));
    }
    if (!cachedOwner && fs.existsSync(ownerPath)) {
      cachedOwner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    }
  } catch (err) {
    console.error('[KnowledgeService] Gagal memuat file pengetahuan:', err.message);
  }
}

// Inisialisasi awal
loadKnowledge();

function getWebsiteKnowledge() {
  if (!cachedWebsite) loadKnowledge();
  return cachedWebsite?.website_info || {};
}

function getOwnerKnowledge() {
  if (!cachedOwner) loadKnowledge();
  return cachedOwner?.owner_info || {};
}

function getKnowledgeContext() {
  const w = getWebsiteKnowledge();
  const o = getOwnerKnowledge();

  let context = `=== INFORMASI PEMILIK WEBSITE ===\n`;
  context += `Nama: ${o.name || 'Muhammad Akmal Faishal'} (${o.nickname || 'Develean'})\n`;
  context += `Profesi: ${o.title || 'Full-Stack Web Developer'}\n`;
  context += `Ringkasan: ${o.summary || ''}\n`;
  context += `Keahlian Utama:\n`;
  if (Array.isArray(o.core_skills)) {
    o.core_skills.forEach(s => {
      context += `- ${s.category}: ${s.technologies.join(', ')}\n`;
    });
  }
  context += `Proyek Terverifikasi:\n`;
  if (Array.isArray(o.verified_projects)) {
    o.verified_projects.forEach(p => {
      context += `- ${p.name} (${p.status}): ${p.description} ${p.live_url ? '[Live: ' + p.live_url + ']' : ''}\n`;
    });
  }
  context += `Kontak Resmi:\n`;
  if (o.official_contacts) {
    context += `- Email: ${o.official_contacts.email}\n`;
    context += `- LinkedIn: ${o.official_contacts.linkedin}\n`;
    context += `- GitHub: ${o.official_contacts.github}\n`;
  }
  context += `Catatan Penting: Informasi nomor telepon pribadi, alamat rumah spesifik, tanggal lahir/usia, dan data finansial TIDAK TERSEDIA dan tidak boleh dikarang.\n\n`;

  context += `=== INFORMASI WEBSITE PORTOFOLIO ===\n`;
  context += `Judul: ${w.title || 'Muhammad Akmal Faishal Portfolio'}\n`;
  context += `Tujuan: ${w.purpose || ''}\n`;
  context += `Tema & Gaya Visual: ${w.theme || ''}\n`;
  context += `Bagian/Section:\n`;
  if (Array.isArray(w.sections)) {
    w.sections.forEach(sec => {
      context += `- ${sec.name} (#${sec.id}): ${sec.description}\n`;
    });
  }
  context += `Fitur Utama:\n`;
  if (Array.isArray(w.features)) {
    w.features.forEach(f => {
      context += `- ${f}\n`;
    });
  }

  return context;
}

module.exports = {
  loadKnowledge,
  getWebsiteKnowledge,
  getOwnerKnowledge,
  getKnowledgeContext
};

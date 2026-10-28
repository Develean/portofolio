/**
 * Develean Portfolio AI Chat Widget
 * Vanilla JavaScript Implementation
 */
(function () {
  'use strict';

  const CONFIG = {
    apiUrl: window.location.protocol === 'file:' ? 'http://localhost:3001/api/chat' : '/api/chat',
    storageKey: 'develean_chat_history_v3',
    initialGreeting: 'Halo! Saya asisten virtual portofolio Muhammad Akmal Faishal. Silakan tanyakan keahlian, proyek, atau informasi website ini.',
    suggestions: [
      'Tentang Akmal',
      'Keahlian',
      'Proyek'
    ]
  };

  // Helper untuk escape HTML agar aman dari XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Format teks dengan link otomatis dan baris baru
  function formatReply(text) {
    const escaped = escapeHtml(text);
    const withLinks = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return withLinks.replace(/\n/g, '<br>');
  }

  class ChatWidget {
    constructor() {
      this.isOpen = false;
      this.messages = [];
      this.isGenerating = false;
      this.lastUserQuery = '';
      this.init();
    }

    init() {
      this.renderWidgetStructure();
      this.bindElements();
      this.attachEvents();
      this.renderSuggestions();
      this.loadHistory();
    }

    renderWidgetStructure() {
      if (document.getElementById('develean-chat-container')) return;

      const container = document.createElement('div');
      container.id = 'develean-chat-container';
      container.innerHTML = `
        <button id="chat-trigger" aria-label="Buka Chat Asisten AI">
          <span class="chat-badge" id="chat-badge"></span>
          <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

        <div id="chat-panel" role="dialog" aria-modal="true" aria-label="Jendela Chat Asisten AI">
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-avatar">AI</div>
              <div class="chat-title-group">
                <h3>Develean Assistant</h3>
                <span class="chat-status">
                  <svg class="status-check-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                  Portofolio &amp; Profil
                </span>
              </div>
            </div>
            <div class="chat-header-actions">
              <button class="chat-header-btn" id="chat-clear-btn" title="Hapus Riwayat Chat" aria-label="Hapus Riwayat Chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
              <button class="chat-header-btn" id="chat-close-btn" title="Tutup Jendela Chat" aria-label="Tutup Jendela Chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="chat-body" id="chat-messages"></div>

          <div class="chat-footer">
            <div class="chat-suggestions-section" id="chat-suggestions-section">
              <div class="chat-suggestions-label">PERTANYAAN YANG BISA DITANYAKAN</div>
              <div class="chat-chips-group" id="chat-suggestions-chips"></div>
            </div>

            <form class="chat-form" id="chat-form">
              <input 
                type="text" 
                id="chat-input" 
                class="chat-input" 
                placeholder="Tanyakan sesuatu..." 
                maxlength="350" 
                autocomplete="off"
              />
              <button type="submit" id="chat-send-btn" class="chat-send-btn" aria-label="Kirim Pesan" title="Kirim Pesan">
                <svg viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>

            <div class="chat-footer-note">AI khusus informasi website dan profil pemilik</div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    bindElements() {
      this.trigger = document.getElementById('chat-trigger');
      this.panel = document.getElementById('chat-panel');
      this.closeBtn = document.getElementById('chat-close-btn');
      this.clearBtn = document.getElementById('chat-clear-btn');
      this.messagesContainer = document.getElementById('chat-messages');
      this.chipsContainer = document.getElementById('chat-suggestions-chips');
      this.form = document.getElementById('chat-form');
      this.input = document.getElementById('chat-input');
      this.sendBtn = document.getElementById('chat-send-btn');
      this.badge = document.getElementById('chat-badge');
    }

    attachEvents() {
      this.trigger.addEventListener('click', () => this.togglePanel());
      this.closeBtn.addEventListener('click', () => this.closePanel());
      this.clearBtn.addEventListener('click', () => this.clearHistory());

      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSend();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.closePanel();
        }
      });
    }

    renderSuggestions() {
      if (!this.chipsContainer) return;
      this.chipsContainer.innerHTML = '';
      CONFIG.suggestions.forEach(s => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chat-chip';
        chip.textContent = s;
        chip.addEventListener('click', () => {
          this.input.value = s;
          this.handleSend();
        });
        this.chipsContainer.appendChild(chip);
      });
    }

    togglePanel() {
      if (this.isOpen) {
        this.closePanel();
      } else {
        this.openPanel();
      }
    }

    openPanel() {
      this.isOpen = true;
      this.panel.classList.add('chat-panel-open');
      if (this.badge) this.badge.style.display = 'none';
      setTimeout(() => this.input.focus(), 150);
      setTimeout(() => this.scrollToBottom(), 250);
      this.scrollToBottom();
    }

    closePanel() {
      this.isOpen = false;
      this.panel.classList.remove('chat-panel-open');
    }

    loadHistory() {
      try {
        const saved = sessionStorage.getItem(CONFIG.storageKey);
        if (saved) {
          this.messages = JSON.parse(saved);
        } else {
          this.messages = [
            { sender: 'bot', text: CONFIG.initialGreeting }
          ];
        }
      } catch (e) {
        this.messages = [
          { sender: 'bot', text: CONFIG.initialGreeting }
        ];
      }

      this.renderMessages();
    }

    saveHistory() {
      try {
        sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(this.messages));
      } catch (e) {
        // storage quota exceeded or disabled
      }
    }

    clearHistory() {
      if (!confirm('Hapus seluruh riwayat obrolan ini?')) return;
      this.messages = [
        { sender: 'bot', text: CONFIG.initialGreeting }
      ];
      this.saveHistory();
      this.renderMessages();
    }

    renderMessages() {
      this.messagesContainer.innerHTML = '';
      this.messages.forEach(msg => {
        this.appendMessageElement(msg.sender, msg.text);
      });
      this.scrollToBottom();
    }

    appendMessageElement(sender, text) {
      if (sender === 'error') {
        const errCard = document.createElement('div');
        errCard.className = 'chat-error-card';
        errCard.innerHTML = `
          <div class="chat-error-header">
            <svg class="chat-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span class="chat-error-title">Koneksi AI terputus</span>
          </div>
          <div class="chat-error-body">${escapeHtml(text || 'Asisten belum bisa terhubung ke server. Silakan coba lagi.')}</div>
          <div class="chat-error-footer">
            <button type="button" class="chat-retry-btn" id="chat-retry-btn">Coba lagi</button>
          </div>
        `;

        const retryBtn = errCard.querySelector('#chat-retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.retryLastMessage());
        }

        this.messagesContainer.appendChild(errCard);
      } else if (sender === 'user') {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg chat-msg-user';
        msgDiv.innerHTML = `<div class="chat-msg-content">${escapeHtml(text)}</div>`;
        this.messagesContainer.appendChild(msgDiv);
      } else {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg chat-msg-bot';
        msgDiv.innerHTML = `
          <div class="chat-msg-content">${formatReply(text)}</div>
          <span class="chat-msg-author">Develean Assistant</span>
        `;
        this.messagesContainer.appendChild(msgDiv);
      }
    }

    showTyping() {
      if (document.getElementById('chat-typing-indicator')) return;
      const typingDiv = document.createElement('div');
      typingDiv.id = 'chat-typing-indicator';
      typingDiv.className = 'chat-typing';
      typingDiv.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      `;
      this.messagesContainer.appendChild(typingDiv);
      this.scrollToBottom();
    }

    hideTyping() {
      const typingDiv = document.getElementById('chat-typing-indicator');
      if (typingDiv) typingDiv.remove();
    }

    scrollToBottom() {
      requestAnimationFrame(() => {
        if (this.messagesContainer) {
          this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
      });
    }

    retryLastMessage() {
      if (!this.lastUserQuery || this.isGenerating) return;
      // Remove last error message if present
      if (this.messages.length > 0 && this.messages[this.messages.length - 1].sender === 'error') {
        this.messages.pop();
        this.saveHistory();
        this.renderMessages();
      }
      this.sendQuery(this.lastUserQuery);
    }

    async handleSend() {
      const text = this.input.value.trim();
      if (!text || this.isGenerating) return;

      this.lastUserQuery = text;
      this.messages.push({ sender: 'user', text });
      this.appendMessageElement('user', text);
      this.saveHistory();

      this.input.value = '';
      this.sendQuery(text);
    }

    async sendQuery(text) {
      this.isGenerating = true;
      this.sendBtn.disabled = true;
      this.showTyping();

      try {
        const response = await fetch(CONFIG.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        this.hideTyping();

        let replyText = '';
        if (response.ok && data.success) {
          replyText = data.reply;
          this.messages.push({ sender: 'bot', text: replyText });
          this.appendMessageElement('bot', replyText);
        } else {
          replyText = data.error || 'Asisten belum bisa terhubung ke server. Silakan coba lagi.';
          this.messages.push({ sender: 'error', text: replyText });
          this.appendMessageElement('error', replyText);
        }
        this.saveHistory();

      } catch (err) {
        this.hideTyping();
        const errMsg = 'Asisten belum bisa terhubung ke server. Silakan coba lagi.';
        this.messages.push({ sender: 'error', text: errMsg });
        this.appendMessageElement('error', errMsg);
        this.saveHistory();
      } finally {
        this.isGenerating = false;
        this.sendBtn.disabled = false;
        this.scrollToBottom();
      }
    }
  }

  // Inisialisasi otomatis setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChatWidget());
  } else {
    new ChatWidget();
  }
})();

// frontend/js/help.js
const HelpPage = {
  user: null,

  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initContactModal();
    await this.loadPreviousMessages();
  },

  renderUser() {
    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
    const nameEl = document.getElementById('userFirstName');
    if (nameEl) nameEl.textContent = this.user.first_name || 'Citizen';
  },

  initMenu() {
    const toggle = document.getElementById('menuToggle');
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const close = document.getElementById('drawerClose');

    const open = () => {
      drawer?.classList.remove('-translate-x-full');
      drawer.style.transform = 'translateX(0)';
      backdrop?.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    };
    const closeFn = () => {
      drawer?.classList.add('-translate-x-full');
      drawer.style.transform = 'translateX(100%)';
      backdrop?.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };

    toggle?.addEventListener('click', open);
    close?.addEventListener('click', closeFn);
    backdrop?.addEventListener('click', closeFn);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFn(); });
  },

  initLogout() {
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await API.post('/auth/logout'); } catch (e) {}
        API.clearToken();
        window.location.href = '/login.html';
      });
    });
  },

  initBackButton() {
    document.getElementById('backBtn')?.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  },

  // ═══ CONTACT MODAL ═══
  initContactModal() {
    const modal = document.getElementById('contactModal');
    const backdrop = document.getElementById('modalBackdrop');
    const closeBtn = document.getElementById('modalClose');
    const openBtns = document.querySelectorAll('[data-open-contact]');
    const form = document.getElementById('contactForm');
    const msgInput = document.getElementById('supportMessage');
    const counter = document.getElementById('msgCounter');
    const subjectInput = document.getElementById('supportSubject');

    const open = () => {
      modal?.classList.remove('hidden');
      modal?.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      setTimeout(() => subjectInput?.focus(), 100);
    };
    const close = () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    openBtns.forEach(btn => btn.addEventListener('click', open));
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) close();
    });

    // Char counter
    msgInput?.addEventListener('input', () => {
      const len = msgInput.value.length;
      if (counter) counter.textContent = `${len}/2000`;
      if (len > 2000) msgInput.value = msgInput.value.slice(0, 2000);
      this.clearError('supportMessage');
    });
    subjectInput?.addEventListener('input', () => this.clearError('supportSubject'));

    // Submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subject = subjectInput.value.trim();
      const message = msgInput.value.trim();

      let hasError = false;
      if (subject.length < 3) { this.showError('supportSubject', 'Subject must be at least 3 characters'); hasError = true; }
      if (message.length < 10) { this.showError('supportMessage', 'Message must be at least 10 characters'); hasError = true; }
      if (hasError) return;

      const submitBtn = document.getElementById('submitSupportBtn');
      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-90', 'cursor-not-allowed');
      submitBtn.innerHTML = `<span class="spinner"></span><span>Sending...</span>`;

      try {
        const res = await API.post('/support', { subject, message });
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-90', 'cursor-not-allowed');
        submitBtn.innerHTML = original;
        if (window.lucide) lucide.createIcons();

        // Reset form
        subjectInput.value = '';
        msgInput.value = '';
        if (counter) counter.textContent = '0/2000';

        close();
        this.showSuccessToast();
        await this.loadPreviousMessages();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-90', 'cursor-not-allowed');
        submitBtn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Could not send message', 'error');
      }
    });
  },

  showError(fieldId, msg) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    document.getElementById(fieldId)?.classList.add('border-red-500');
  },
  clearError(fieldId) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
    document.getElementById(fieldId)?.classList.remove('border-red-500');
  },

  showSuccessToast() {
    const toast = document.getElementById('successToast');
    if (!toast) return;
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('flex');
    }, 4000);
  },

  // ═══ LOAD PREVIOUS MESSAGES ═══
  async loadPreviousMessages() {
    const wrap = document.getElementById('previousMessagesWrap');
    const list = document.getElementById('previousMessagesList');
    if (!wrap || !list) return;

    try {
      const res = await API.get('/support/my');
      const messages = res.data || [];

      if (messages.length === 0) {
        wrap.classList.add('hidden');
        return;
      }

      wrap.classList.remove('hidden');
      list.innerHTML = messages.slice(0, 5).map(m => this.renderMessage(m)).join('');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  },

  renderMessage(m) {
    const statusMeta = {
      open:        { label: 'Open',        cls: 'bg-red-50 text-red-600',       icon: 'circle-alert' },
      in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600',     icon: 'loader' },
      resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-600',   icon: 'check-circle-2' }
    };
    const st = statusMeta[m.status] || statusMeta.open;

    const dt = new Date(m.created_at);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const replyBlock = m.admin_reply ? `
      <div class="mt-3 pl-4 border-l-2 border-[#E21B2D] bg-[#fff5f6] rounded-r-lg p-3">
        <div class="flex items-center gap-1.5 text-[11px] font-semibold text-[#E21B2D] uppercase tracking-wide">
          <i data-lucide="shield-check" class="w-3 h-3"></i>
          Support Team Reply
        </div>
        <p class="text-[12.5px] text-[#4a5057] mt-1 leading-relaxed">${this.escape(m.admin_reply)}</p>
      </div>
    ` : '';

    return `
      <div class="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between gap-3 mb-2">
          <h4 class="font-semibold text-[14px] text-[#1a1d21] truncate">${this.escape(m.subject)}</h4>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${st.cls} whitespace-nowrap flex-shrink-0">
            <i data-lucide="${st.icon}" class="w-3 h-3"></i>
            ${st.label}
          </span>
        </div>
        <p class="text-[12.5px] text-[#6b7280] leading-relaxed">${this.escape(m.message)}</p>
        ${replyBlock}
        <div class="flex items-center gap-2 mt-2.5 text-[11px] text-[#9ca3af]">
          <i data-lucide="clock" class="w-3 h-3"></i>
          <span>${dateStr} • ${timeStr}</span>
        </div>
      </div>
    `;
  },

  escape(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },

  toast(msg, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };
    const el = document.createElement('div');
    el.className = `fixed top-6 right-6 z-[200] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transform translate-x-full transition-transform duration-300`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-x-full'));
    setTimeout(() => {
      el.classList.add('translate-x-full');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => HelpPage.init());
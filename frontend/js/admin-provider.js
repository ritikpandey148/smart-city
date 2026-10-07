// frontend/js/admin-provider.js
// Admin — Service Provider (MyBMC) page with Live Chat

const AdminProvider = {
  user: null,
  provider: null,
  stats: {},
  complaints: [],

  // Chat state
  chatOpen: false,
  chatMessages: [],
  lastMessageId: 0,
  pollInterval: null,
  unreadInterval: null,
  pendingDeleteId: null,

  async init() {
    this.user = await Guard.protect('admin');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderAdminUser();
    this.initMenu();
    this.initLogout();
    this.initNotificationBell();
    this.initModals();
    this.initChatEvents();
    this.initChatForm();

    await this.loadProvider();
    await this.loadStats();
    await this.loadComplaints();
    await this.loadChatPreview();
    await this.updateUnreadBadge();

    this.startUnreadPolling();
  },

  renderAdminUser() {
    const initial = (this.user.first_name || 'A').charAt(0).toUpperCase();
    const av = document.getElementById('adminAvatar');
    if (av) av.textContent = initial;
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
      drawer.style.transform = 'translateX(-100%)';
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
        window.location.href = '../login.html';
      });
    });
  },

  async initNotificationBell() {
    try {
      const res = await API.get('/notifications/unread-count');
      const count = res.data.unread_count || 0;
      const badge = document.getElementById('bellBadge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.toggle('hidden', count === 0);
      }
    } catch (e) {}
  },

  // ═══ LOAD PROVIDER ═══
  async loadProvider() {
    try {
      const res = await API.get('/admin/providers');
      const list = res.data || [];
      this.provider = list[0] || null;
      if (this.provider) this.renderProviderStatus();
    } catch (e) {
      console.error(e);
    }
  },

  renderProviderStatus() {
    const p = this.provider;
    if (!p) return;
    const isOnline = p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < 2 * 60 * 1000;

    const statusEl = document.getElementById('providerOnlineStatus');
    const statusText = document.getElementById('providerStatusText');
    const statusDesc = document.getElementById('providerStatusDesc');

    if (isOnline) {
      statusEl.className = 'w-14 h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0';
      statusEl.innerHTML = '<i data-lucide="wifi" class="w-7 h-7 text-green-600"></i>';
      statusText.textContent = 'Online';
      statusText.className = 'text-[20px] font-bold text-green-600';
      statusDesc.textContent = 'MyBMC is currently active and handling assigned complaints.';
    } else {
      statusEl.className = 'w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0';
      statusEl.innerHTML = '<i data-lucide="wifi-off" class="w-7 h-7 text-gray-400"></i>';
      statusText.textContent = 'Offline';
      statusText.className = 'text-[20px] font-bold text-gray-500';
      statusDesc.textContent = 'MyBMC is currently offline. Messages will be notified.';
    }
    if (window.lucide) lucide.createIcons();

      // Update chat panel status too
  const panelStatus = document.getElementById('chatPanelStatus');
  if (panelStatus) {
    if (isOnline) {
      panelStatus.className = 'inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-green-600';
      panelStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online';
    } else {
      panelStatus.className = 'inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400';
      panelStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Offline';
    }
  }
  },

  // ═══ STATS ═══
  async loadStats() {
    try {
      const res = await API.get('/admin/stats');
      const s = res.data || {};
      this.stats = s;

      const assigned = s.total_complaints || 0;
      const resolved = s.resolved || 0;
      const inProgress = s.in_progress || 0;
      const inReview = s.in_review || 0;
      const submitted = s.submitted || 0;

      document.getElementById('statTotalAssigned').textContent = assigned;
      document.getElementById('statResolved').textContent = resolved;
      document.getElementById('statInProgress').textContent = inProgress;
      document.getElementById('statInReview').textContent = inReview;
      document.getElementById('statSubmitted').textContent = submitted;
      document.getElementById('chartCenterTotal').textContent = assigned;

      this.renderChart(assigned, resolved, inProgress, inReview, submitted);
    } catch (e) {}
  },

  renderChart(assigned, resolved, inProgress, inReview, submitted) {
    const ctx = document.getElementById('complaintChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this._chart) this._chart.destroy();

    this._chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Resolved', 'In Progress', 'In Review', 'Submitted'],
        datasets: [{
          data: [resolved, inProgress, inReview, submitted],
          backgroundColor: ['#22c55e', '#fb923c', '#fbbf24', '#9ca3af'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d21',
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, family: 'Poppins' },
            bodyFont: { size: 12, family: 'Poppins' }
          }
        }
      }
    });
  },

  // ═══ RECENT COMPLAINTS ═══
  async loadComplaints() {
    const tbody = document.getElementById('complaintsBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8">
      <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span></td></tr>`;

    try {
      const res = await API.get('/admin/complaints');
      const all = res.data || [];
      this.complaints = all.filter(c => c.assigned_provider_id).slice(0, 5);
      this.renderComplaintsTable();
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 text-[12.5px]">Failed to load</td></tr>`;
    }
  },

  renderComplaintsTable() {
    const tbody = document.getElementById('complaintsBody');
    if (!tbody) return;

    if (this.complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-[12.5px] text-[#9ca3af]">
        No assigned complaints yet</td></tr>`;
      return;
    }

    tbody.innerHTML = this.complaints.map((c, i) => {
      const catMeta = {
        garbage: { label: 'Garbage', cls: 'text-[#E21B2D]', icon: 'trash-2' },
        pothole: { label: 'Pothole', cls: 'text-[#343A40]', icon: 'construction' },
        others:  { label: 'Others',  cls: 'text-purple-600', icon: 'layout-grid' }
      };
      const cat = catMeta[c.category] || catMeta.others;

      const statusMeta = {
        submitted:   { label: 'Submitted',   cls: 'bg-gray-100 text-gray-700' },
        in_review:   { label: 'In Review',   cls: 'bg-amber-50 text-amber-700' },
        in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600' },
        resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-700' }
      };
      const st = statusMeta[c.status] || statusMeta.submitted;

      const assignedOn = new Date(c.updated_at || c.submitted_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      return `
        <tr class="border-b border-gray-50 hover:bg-[#fafbfc] transition-colors">
          <td class="py-3 px-3 text-[12px] text-[#6b7280]">${i + 1}</td>
          <td class="py-3 px-3 text-[12px] font-mono font-semibold text-[#1a1d21] whitespace-nowrap">${this.esc(c.complaint_id)}</td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center gap-1.5 text-[12px] font-semibold ${cat.cls}">
              <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
              ${cat.label}
            </span>
          </td>
          <td class="py-3 px-3 text-[12px] text-[#343A40] whitespace-nowrap">${this.esc(c.locality || '—')}</td>
          <td class="py-3 px-3 text-[12px] text-[#6b7280] whitespace-nowrap">${assignedOn}</td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold ${st.cls}">${st.label}</span>
          </td>
          <td class="py-3 px-3">
            <button data-view="${c.id}" class="inline-flex items-center gap-1.5 bg-white hover:bg-[#E21B2D] border border-[#E21B2D] text-[#E21B2D] hover:text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
              <i data-lucide="eye" class="w-3 h-3"></i>
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    tbody.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.view, 10);
        window.location.href = `complaints.html?view=${id}`;
      });
    });
  },

  // ═══ CHAT PREVIEW (small panel on right) ═══
  async loadChatPreview() {
    if (!this.provider) return;
    try {
      const res = await API.get(`/chat/last/provider/${this.provider.id}`);
      const last = res.data;
      const preview = document.getElementById('chatPreviewText');
      if (!preview) return;
      if (last) {
        preview.textContent = (last.sender_role === 'admin' ? 'You: ' : 'MyBMC: ') + (last.is_deleted_for_everyone ? 'This message was deleted' : last.message);
        const time = new Date(last.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        document.getElementById('chatPreviewTime').textContent = time;
      } else {
        preview.textContent = 'No messages yet. Start the conversation.';
      }
    } catch (e) {}
  },

  // ═══ CHAT MODAL ═══
  initChatEvents() {
    document.getElementById('openChatBtn')?.addEventListener('click', () => this.openChat());
    document.getElementById('closeChatBtn')?.addEventListener('click', () => this.closeChat());
    document.getElementById('chatModalBackdrop')?.addEventListener('click', () => this.closeChat());
    document.getElementById('openChatSmall')?.addEventListener('click', () => this.openChat());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.chatOpen) this.closeChat();
    });
  },

  async openChat() {
    if (!this.provider) {
      this.toast('Provider not available', 'error');
      return;
    }

    const modal = document.getElementById('chatModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    this.chatOpen = true;
    this.chatMessages = [];
    this.lastMessageId = 0;

    document.getElementById('chatMessages').innerHTML = `
      <div class="flex flex-col items-center justify-center py-10">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
        <p class="text-[12px] text-[#6b7280] mt-2">Loading conversation...</p>
      </div>`;

    await this.loadChatMessages();
    if (window.lucide) lucide.createIcons();

    // Start polling every 3 sec while chat is open
    this.pollInterval = setInterval(() => this.pollNewMessages(), 3000);
  },

  closeChat() {
    const modal = document.getElementById('chatModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
    this.chatOpen = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.loadChatPreview();
    this.updateUnreadBadge();
  },

  async loadChatMessages() {
    if (!this.provider) return;
    try {
      const res = await API.get(`/chat/conversation/provider/${this.provider.id}`);
      this.chatMessages = res.data.messages || [];
      const otherOnline = res.data.other_online;

      document.getElementById('chatHeaderStatus').innerHTML = otherOnline
        ? '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600"><span class="w-2 h-2 rounded-full bg-green-500"></span> Online</span>'
        : '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400"><span class="w-2 h-2 rounded-full bg-gray-400"></span> Offline</span>';

      if (this.chatMessages.length > 0) {
        this.lastMessageId = this.chatMessages[this.chatMessages.length - 1].id;
      }

      this.renderMessages();
    } catch (e) {
      this.toast('Failed to load chat', 'error');
    }
  },

  async pollNewMessages() {
    if (!this.chatOpen || !this.provider) return;
    try {
      const res = await API.get(`/chat/poll/provider/${this.provider.id}?since=${this.lastMessageId}`);
      const newMsgs = res.data.messages || [];
      const otherOnline = res.data.other_online;

      document.getElementById('chatHeaderStatus').innerHTML = otherOnline
        ? '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600"><span class="w-2 h-2 rounded-full bg-green-500"></span> Online</span>'
        : '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400"><span class="w-2 h-2 rounded-full bg-gray-400"></span> Offline</span>';

      if (newMsgs.length > 0) {
        this.chatMessages = this.chatMessages.concat(newMsgs);
        this.lastMessageId = newMsgs[newMsgs.length - 1].id;
        this.renderMessages();
        this.scrollChatToBottom();
      }
    } catch (e) {}
  },

  renderMessages() {
    const wrap = document.getElementById('chatMessages');
    if (!wrap) return;

    if (this.chatMessages.length === 0) {
      wrap.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="w-14 h-14 rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
          <i data-lucide="message-circle" class="w-6 h-6 text-[#E21B2D]"></i>
        </div>
        <p class="text-[13px] font-semibold text-[#343A40]">No messages yet</p>
        <p class="text-[11.5px] text-[#6b7280] mt-0.5">Start a conversation with MyBMC team</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    wrap.innerHTML = this.chatMessages.map(m => this.renderMessageBubble(m)).join('');
    if (window.lucide) lucide.createIcons();

    // Attach menu handlers
    wrap.querySelectorAll('[data-msg-menu]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.msgMenu, 10);
        this.openMessageMenu(id, btn);
      });
    });

    this.scrollChatToBottom();
  },

  renderMessageBubble(m) {
    const isMine = m.sender_role === 'admin';
    const deleted = m.is_deleted_for_everyone;

    const time = new Date(m.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const bubbleCls = isMine
      ? 'bg-[#E21B2D] text-white rounded-br-md'
      : 'bg-white text-[#1a1d21] border border-gray-100 rounded-bl-md';

    const wrapCls = isMine ? 'justify-end' : 'justify-start';
    const timeCls = isMine ? 'text-white/70' : 'text-[#9ca3af]';

    return `
      <div class="flex ${wrapCls} mb-3 group" data-msg-wrap="${m.id}">
        <div class="max-w-[75%] relative">
          <div class="${bubbleCls} px-3.5 py-2.5 rounded-2xl shadow-sm relative">
            ${deleted 
              ? '<p class="text-[12.5px] italic opacity-70">This message was deleted</p>'
              : `<p class="text-[13px] leading-relaxed whitespace-pre-wrap break-words">${this.esc(m.message)}</p>`
            }
            <div class="flex items-center justify-between gap-3 mt-1">
              <span class="text-[10px] ${timeCls}">${time}</span>
              ${isMine && !deleted ? '<i data-lucide="check-check" class="w-3 h-3 opacity-70"></i>' : ''}
            </div>
          </div>
          ${!deleted ? `
            <button data-msg-menu="${m.id}"
                    class="absolute top-1 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center transition-opacity">
              <i data-lucide="more-vertical" class="w-3.5 h-3.5 text-[#343A40]"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  scrollChatToBottom() {
    const wrap = document.getElementById('chatMessages');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  },

  openMessageMenu(messageId, anchorEl) {
    this.pendingDeleteId = messageId;

    // Find message to check if mine
    const msg = this.chatMessages.find(m => m.id === messageId);
    if (!msg) return;
    const isMine = msg.sender_role === 'admin';

    // Position menu near the button
    const menu = document.getElementById('msgMenu');
    const rect = anchorEl.getBoundingClientRect();

    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = Math.max(8, rect.left - 140) + 'px';

    // Show/hide "Delete for everyone" only if mine
    document.getElementById('menuDeleteAll').classList.toggle('hidden', !isMine);

    menu.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

    // Close on outside click
    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 100);
  },

  initChatForm() {
    document.getElementById('menuDeleteMe')?.addEventListener('click', () => this.deleteMessage('me'));
    document.getElementById('menuDeleteAll')?.addEventListener('click', () => this.deleteMessage('everyone'));

    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');

    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      if (!this.provider) return;

      input.value = '';
      input.style.height = 'auto';

      try {
        const res = await API.post('/chat/send', {
          receiver_id: this.provider.id,
          receiver_role: 'provider',
          message: text
        });

        // Append immediately
        if (res.data.message) {
          this.chatMessages.push(res.data.message);
          this.lastMessageId = res.data.message.id;
          this.renderMessages();
        }

        // If notification was sent (receiver offline), show toast
        if (res.data.notification_sent) {
          this.toast('Message sent (recipient offline, notification sent)', 'info');
        }
      } catch (err) {
        this.toast(err.message || 'Failed to send', 'error');
        input.value = text;
      }
    });
  },

  async deleteMessage(scope) {
    const id = this.pendingDeleteId;
    if (!id) return;

    document.getElementById('msgMenu').classList.add('hidden');

    try {
      await API.del(`/chat/${id}?scope=${scope}`);
      if (scope === 'everyone') {
        // Mark locally as deleted
        const idx = this.chatMessages.findIndex(m => m.id === id);
        if (idx >= 0) {
          this.chatMessages[idx].is_deleted_for_everyone = 1;
          this.chatMessages[idx].message = 'This message was deleted';
        }
      } else {
        // Remove from local
        this.chatMessages = this.chatMessages.filter(m => m.id !== id);
      }
      this.renderMessages();
      this.toast('Message deleted', 'success');
    } catch (err) {
      this.toast(err.message || 'Failed to delete', 'error');
    }
  },

  async updateUnreadBadge() {
    try {
      const res = await API.get('/chat/unread-count');
      const count = res.data.unread_count || 0;
      const badge = document.getElementById('chatUnreadBadge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.toggle('hidden', count === 0);
      }
    } catch (e) {}
  },

  startUnreadPolling() {
    this.unreadInterval = setInterval(() => {
      if (!this.chatOpen) {
        this.updateUnreadBadge();
        this.loadChatPreview();
      }
    }, 10000);
  },

  // ═══ MODALS (generic) ═══
  initModals() {
    // placeholder
  },

  // ═══ HELPERS ═══
  esc(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },

  toast(msg, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };
    const el = document.createElement('div');
    el.className = `fixed top-6 right-6 z-[400] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transform translate-x-full transition-transform duration-300`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-x-full'));
    setTimeout(() => {
      el.classList.add('translate-x-full');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => AdminProvider.init());
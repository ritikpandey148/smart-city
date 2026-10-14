// frontend/js/provider-admin.js
// myBMC Provider — Admin page + Live Chat

const ProviderAdmin = {
  user: null,
  admin: null,
  activity: [],

  chatOpen: false,
  chatMessages: [],
  lastMessageId: 0,
  pollInterval: null,
  unreadInterval: null,
  pendingDeleteId: null,

  async init() {
    this.user = await Guard.protect('provider');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderProviderInfo();
    this.initMenu();
    this.initLogout();
    this.initChatEvents();
    this.initChatForm();

    await this.loadAdmin();
    await this.loadActivity();
    await this.loadChatPreview();
    await this.updateUnreadBadge();

    this.startUnreadPolling();
  },

  renderProviderInfo() {
    const u = this.user;
    document.getElementById('providerName').textContent = u.name || 'myBMC';
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

  // ═══ LOAD ADMIN ═══
  async loadAdmin() {
    try {
      const res = await API.get('/provider/admin-info');
      this.admin = res.data;
      if (this.admin) {
        const initial = (this.admin.first_name || 'A').charAt(0).toUpperCase();
        const fullName = `${this.admin.first_name || ''} ${this.admin.last_name || ''}`.trim() || 'Admin';
        document.getElementById('adminName').textContent = fullName;
        document.getElementById('adminUsername').textContent = '@' + (this.admin.username || '—');
        document.getElementById('adminAvatar').textContent = initial;
        document.getElementById('adminMobile').textContent = this.admin.mobile || '—';

        // Online status
        const isOnline = this.admin.last_seen && (Date.now() - new Date(this.admin.last_seen).getTime()) < 2 * 60 * 1000;
        const statusEl = document.getElementById('adminOnlineStatus');
        if (isOnline) {
          statusEl.innerHTML = '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600"><span class="w-2 h-2 rounded-full bg-green-500"></span> Online</span>';
        } else {
          statusEl.innerHTML = '<span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400"><span class="w-2 h-2 rounded-full bg-gray-400"></span> Offline</span>';
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ═══ ADMIN ACTIVITY ═══
  async loadActivity() {
    const wrap = document.getElementById('activityList');
    if (wrap) {
      wrap.innerHTML = `<div class="flex justify-center py-8">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
      </div>`;
    }

    try {
      const res = await API.get('/provider/admin-activity');
      this.activity = res.data || [];
      this.renderActivity();
    } catch (e) {
      if (wrap) wrap.innerHTML = `<div class="text-center py-6 text-[12.5px] text-[#9ca3af]">Failed to load activity</div>`;
    }
  },

  renderActivity() {
    const wrap = document.getElementById('activityList');
    if (!wrap) return;

    const countEl = document.getElementById('activityCount');
    if (countEl) countEl.textContent = this.activity.length;

    if (this.activity.length === 0) {
      wrap.innerHTML = `
        <div class="text-center py-10">
          <div class="w-14 h-14 mx-auto rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
            <i data-lucide="activity" class="w-6 h-6 text-[#E21B2D]"></i>
          </div>
          <p class="text-[13px] font-semibold text-[#343A40]">No activity yet</p>
          <p class="text-[11.5px] text-[#6b7280] mt-0.5">Admin's status changes will appear here</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    wrap.innerHTML = this.activity.map(a => this.renderActivityItem(a)).join('');
    if (window.lucide) lucide.createIcons();

    // Attach complaint link
    wrap.querySelectorAll('[data-complaint-id]').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.complaintId;
        if (cid) window.location.href = `reports.html?view=${cid}`;
      });
    });
  },

  renderActivityItem(a) {
    const statusMeta = {
      submitted:   { label: 'Submitted',   cls: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
      in_review:   { label: 'In Review',   cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
      in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' },
      resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' }
    };
    const st = statusMeta[a.status] || statusMeta.submitted;

    const catMeta = {
      garbage: { label: 'Garbage', icon: 'trash-2', cls: 'text-[#E21B2D]' },
      pothole: { label: 'Pothole', icon: 'construction', cls: 'text-[#343A40]' },
      others:  { label: 'Others',  icon: 'layout-grid', cls: 'text-purple-600' }
    };
    const cat = catMeta[a.complaint_category] || catMeta.garbage;

    const dt = new Date(a.created_at);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const adminName = `${a.admin_first || ''} ${a.admin_last || ''}`.trim() || 'Admin';
    const adminInitial = adminName.charAt(0).toUpperCase();

    return `
      <div class="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-[#fafbfc] transition-colors">
        <div class="w-10 h-10 rounded-full bg-[#E21B2D] text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">
          ${this.esc(adminInitial)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <div class="text-[12.5px] text-[#343A40] leading-snug">
              <span class="font-semibold">${this.esc(adminName)}</span>
              <span class="text-[#6b7280]">changed status to</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${st.cls} mx-0.5">
                ${st.label}
              </span>
            </div>
            <span class="text-[10.5px] text-[#9ca3af] whitespace-nowrap">${dateStr} • ${timeStr}</span>
          </div>

          <button data-complaint-id="${a.complaint_id_db}" class="flex items-center gap-2 mt-1.5 group cursor-pointer">
            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${cat.cls}"></i>
            <span class="text-[11.5px] font-mono font-bold text-[#1a1d21] group-hover:text-[#E21B2D] transition-colors">${this.esc(a.complaint_ref || '—')}</span>
            <span class="text-[11.5px] text-[#6b7280] truncate max-w-[240px]">${this.esc(a.complaint_title || '')}</span>
          </button>

          ${a.remarks ? `<div class="text-[11px] text-[#9ca3af] mt-1 italic">"${this.esc(a.remarks)}"</div>` : ''}
        </div>
      </div>
    `;
  },

  // ═══ CHAT PREVIEW ═══
  async loadChatPreview() {
    if (!this.admin) return;
    try {
      const res = await API.get(`/chat/last/admin/${this.admin.id}`);
      const last = res.data;
      const preview = document.getElementById('chatPreviewText');
      if (!preview) return;
      if (last) {
        preview.textContent = (last.sender_role === 'provider' ? 'You: ' : 'Admin: ') + (last.is_deleted_for_everyone ? 'This message was deleted' : last.message);
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
    document.getElementById('openChatSmallBtn')?.addEventListener('click', () => this.openChat());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.chatOpen) this.closeChat();
    });
  },

  async openChat() {
    if (!this.admin) {
      this.toast('Admin not available', 'error');
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
    if (!this.admin) return;
    try {
      const res = await API.get(`/chat/conversation/admin/${this.admin.id}`);
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
    if (!this.chatOpen || !this.admin) return;
    try {
      const res = await API.get(`/chat/poll/admin/${this.admin.id}?since=${this.lastMessageId}`);
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
        <p class="text-[11.5px] text-[#6b7280] mt-0.5">Start a conversation with BMC Admin</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    wrap.innerHTML = this.chatMessages.map(m => this.renderMessageBubble(m)).join('');
    if (window.lucide) lucide.createIcons();

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
    // For provider — "mine" means sender_role === 'provider'
    const isMine = m.sender_role === 'provider';
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

    const msg = this.chatMessages.find(m => m.id === messageId);
    if (!msg) return;
    const isMine = msg.sender_role === 'provider';

    const menu = document.getElementById('msgMenu');
    const rect = anchorEl.getBoundingClientRect();

    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = Math.max(8, rect.left - 140) + 'px';

    document.getElementById('menuDeleteAll').classList.toggle('hidden', !isMine);

    menu.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

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
      if (!this.admin) return;

      input.value = '';
      input.style.height = 'auto';

      try {
        const res = await API.post('/chat/send', {
          receiver_id: this.admin.id,
          receiver_role: 'admin',
          message: text
        });

        if (res.data.message) {
          this.chatMessages.push(res.data.message);
          this.lastMessageId = res.data.message.id;
          this.renderMessages();
        }

        if (res.data.notification_sent) {
          this.toast('Message sent (Admin offline, notification sent)', 'info');
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
        const idx = this.chatMessages.findIndex(m => m.id === id);
        if (idx >= 0) {
          this.chatMessages[idx].is_deleted_for_everyone = 1;
          this.chatMessages[idx].message = 'This message was deleted';
        }
      } else {
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

document.addEventListener('DOMContentLoaded', () => ProviderAdmin.init());
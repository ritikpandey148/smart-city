// frontend/js/admin-notifications.js
// Admin — Notifications page

const AdminNotifications = {
  user: null,
  all: [],
  filtered: [],
  currentTab: 'all', // all | requests | mybmc | chats
  sortOrder: 'latest',
  searchQuery: '',
  currentPage: 1,
  perPage: 8,

  async init() {
    this.user = await Guard.protect('admin');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderAdminUser();
    this.initMenu();
    this.initLogout();
    this.initTabs();
    this.initSearch();
    this.initSort();
    this.initMarkAllBtn();
    this.initPagination();
    this.initModals();
    this.initMessageForm();

    await this.loadNotifications();
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

  // ═══ LOAD ═══
  async loadNotifications() {
    const wrap = document.getElementById('notificationsList');
    if (wrap) {
      wrap.innerHTML = `<div class="flex justify-center py-16">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
      </div>`;
    }

    try {
      const res = await API.get('/notifications/my');
      this.all = res.data.notifications || [];
      this.computeTabCounts();
      this.applyFilters();
    } catch (err) {
      console.error(err);
      if (wrap) wrap.innerHTML = `<div class="text-center py-10 text-red-500 text-[13px]">Failed to load notifications</div>`;
    }
  },

  // ═══ CATEGORIZE ═══
  categorize(n) {
    if (n.category === 'support') return 'requests';
    if (n.category === 'chat') return 'chats';
    if (n.sender_role === 'provider') return 'mybmc';
    if (['garbage', 'pothole', 'others'].includes(n.category) && n.sender_role === 'system') return 'mybmc';
    if (['general', 'urgent'].includes(n.category)) return 'mybmc';
    return 'other';
  },

  computeTabCounts() {
    let requests = 0, mybmc = 0, chats = 0;
    this.all.forEach(n => {
      const c = this.categorize(n);
      if (c === 'requests') requests++;
      else if (c === 'mybmc') mybmc++;
      else if (c === 'chats') chats++;
    });

    document.getElementById('tabAllCount').textContent = this.all.length;
    document.getElementById('tabRequestsCount').textContent = requests;
    document.getElementById('tabMybmcCount').textContent = mybmc;
    document.getElementById('tabChatsCount').textContent = chats;
  },

  // ═══ TABS ═══
  initTabs() {
    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        this.currentPage = 1;

        document.querySelectorAll('[data-tab]').forEach(t => {
          t.classList.remove('bg-[#E21B2D]', 'text-white');
          t.classList.add('bg-white', 'text-[#343A40]', 'border', 'border-gray-200');
        });
        tab.classList.add('bg-[#E21B2D]', 'text-white');
        tab.classList.remove('bg-white', 'text-[#343A40]', 'border', 'border-gray-200');

        this.applyFilters();
      });
    });
  },

  initSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        this.searchQuery = input.value.trim().toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
      }, 250);
    });
  },

  initSort() {
    const sel = document.getElementById('sortSelect');
    sel?.addEventListener('change', () => {
      this.sortOrder = sel.value;
      this.applyFilters();
    });
  },

  // ═══ MARK ALL ═══
  initMarkAllBtn() {
    document.getElementById('markAllBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('markAllBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm" style="border-color:#fdd;border-top-color:#E21B2D"></span><span>Marking...</span>`;

      try {
        await API.put('/notifications/mark-all-read');
        this.all = this.all.map(n => ({ ...n, is_read: 1 }));
        this.applyFilters();
        this.toast('All notifications marked as read', 'success');
      } catch (err) {
        this.toast(err.message || 'Failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
      }
    });
  },

  // ═══ FILTER ═══
  applyFilters() {
    let list = [...this.all];

    if (this.currentTab !== 'all') {
      list = list.filter(n => this.categorize(n) === this.currentTab);
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return this.sortOrder === 'latest' ? tb - ta : ta - tb;
    });

    this.filtered = list;
    this.renderList();
    this.renderPagination();
  },

  // ═══ RENDER LIST ═══
  renderList() {
    const wrap = document.getElementById('notificationsList');
    const titleEl = document.getElementById('listTitle');
    if (!wrap) return;

    const tabLabels = {
      all: 'All Notifications',
      requests: 'User Requests',
      mybmc: 'MyBMC Notifications',
      chats: 'Chat Notifications'
    };
    if (titleEl) titleEl.textContent = `${tabLabels[this.currentTab]} (${this.filtered.length})`;

    const start = (this.currentPage - 1) * this.perPage;
    const items = this.filtered.slice(start, start + this.perPage);

    if (items.length === 0) {
      wrap.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
        <div class="w-14 h-14 rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
          <i data-lucide="bell-off" class="w-6 h-6 text-[#E21B2D]"></i>
        </div>
        <p class="text-[13.5px] font-semibold text-[#343A40]">No notifications found</p>
        <p class="text-[12px] text-[#6b7280] mt-0.5">Try changing filters or search</p>
      </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    wrap.innerHTML = items.map(n => this.renderItem(n)).join('');
    if (window.lucide) lucide.createIcons();

    wrap.querySelectorAll('[data-view-notif]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.viewNotif, 10);
        const notif = this.all.find(x => x.id === id);
        if (notif) this.openDetail(notif);
      });
    });
  },

  renderItem(n) {
    const isUnread = !n.is_read;
    const cat = this.categorize(n);

    // Icon based on type
    let icon = 'bell';
    let iconBg = 'bg-[#ffe5e8]';
    let iconColor = 'text-[#E21B2D]';

    if (cat === 'requests') {
      icon = 'user';
      iconBg = 'bg-blue-100';
      iconColor = 'text-blue-600';
    } else if (cat === 'chats') {
      icon = 'message-circle';
      iconBg = 'bg-[#ffe5e8]';
      iconColor = 'text-[#E21B2D]';
    } else if (n.sender_role === 'provider') {
      icon = 'building-2';
      iconBg = 'bg-purple-100';
      iconColor = 'text-purple-600';
    } else if (['garbage', 'pothole', 'others'].includes(n.category)) {
      icon = n.category === 'garbage' ? 'trash-2' : n.category === 'pothole' ? 'construction' : 'layout-grid';
      iconBg = 'bg-gray-100';
      iconColor = 'text-[#343A40]';
    }

    // Tag
    let tagLabel, tagCls;
    if (cat === 'requests') { tagLabel = 'User Request'; tagCls = 'bg-blue-50 text-blue-600'; }
    else if (cat === 'chats') { tagLabel = 'Chats'; tagCls = 'bg-[#ffe5e8] text-[#E21B2D]'; }
    else if (n.sender_role === 'provider') { tagLabel = 'MyBMC'; tagCls = 'bg-purple-50 text-purple-600'; }
    else { tagLabel = 'MyBMC'; tagCls = 'bg-purple-50 text-purple-600'; }

    const timeAgo = this.timeAgo(n.created_at);

    return `
      <div class="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl transition-all ${isUnread ? 'bg-[#fafbfc] hover:bg-[#fff5f6]' : 'bg-white hover:bg-gray-50'} border ${isUnread ? 'border-[#fdd]' : 'border-gray-100'}">
        <div class="flex-shrink-0 pt-2">
          <div class="w-2 h-2 rounded-full ${isUnread ? 'bg-[#E21B2D]' : 'bg-transparent'}"></div>
        </div>
        <div class="w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <h4 class="text-[13.5px] font-semibold text-[#1a1d21] leading-snug">${this.esc(n.title)}</h4>
              ${isUnread ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#E21B2D] text-white">New</span>' : ''}
            </div>
          </div>
          <p class="text-[12.5px] text-[#6b7280] mt-1 leading-snug line-clamp-2">${this.esc(n.message)}</p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tagCls}">${tagLabel}</span>
            <span class="text-[10.5px] text-[#9ca3af]">${timeAgo}</span>
          </div>
        </div>
        <div class="flex-shrink-0">
          <button data-view-notif="${n.id}"
                  class="inline-flex items-center gap-1.5 bg-white hover:bg-[#E21B2D] border border-[#E21B2D] text-[#E21B2D] hover:text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            View
          </button>
        </div>
      </div>
    `;
  },

  // ═══ PAGINATION ═══
  initPagination() {
    document.getElementById('pagePrev')?.addEventListener('click', () => {
      if (this.currentPage > 1) { this.currentPage--; this.renderList(); this.renderPagination(); }
    });
    document.getElementById('pageNext')?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.perPage));
      if (this.currentPage < totalPages) { this.currentPage++; this.renderList(); this.renderPagination(); }
    });
  },

  renderPagination() {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.perPage));
    const start = (this.currentPage - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage * this.perPage, this.filtered.length);

    const showEl = document.getElementById('paginationInfo');
    if (showEl) showEl.textContent = this.filtered.length === 0
      ? 'Showing 0 notifications'
      : `Showing ${start} to ${end} of ${this.filtered.length} notifications`;

    const wrap = document.getElementById('pageNumbers');
    if (!wrap) return;

    let html = '';
    const maxShown = 5;
    let s = Math.max(1, this.currentPage - 2);
    let e = Math.min(totalPages, s + maxShown - 1);
    if (e - s < maxShown - 1) s = Math.max(1, e - maxShown + 1);

    for (let i = s; i <= e; i++) {
      const active = i === this.currentPage;
      html += `<button data-page="${i}" class="${active ? 'bg-[#E21B2D] text-white' : 'bg-white text-[#343A40] hover:bg-gray-50'} w-8 h-8 rounded-lg text-[12.5px] font-semibold border border-gray-200 transition-colors">${i}</button>`;
    }
    if (e < totalPages) html += `<span class="text-[#9ca3af] px-1">...</span><button data-page="${totalPages}" class="w-8 h-8 rounded-lg text-[12.5px] font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-[#343A40]">${totalPages}</button>`;

    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        this.currentPage = parseInt(b.dataset.page, 10);
        this.renderList();
        this.renderPagination();
      });
    });

    const prev = document.getElementById('pagePrev');
    const next = document.getElementById('pageNext');
    if (prev) prev.disabled = this.currentPage === 1;
    if (next) next.disabled = this.currentPage >= totalPages;
  },

  // ═══ MODALS ═══
  initModals() {
    ['detailModal', 'messageModal'].forEach(id => {
      const modal = document.getElementById(id);
      const backdrop = modal?.querySelector('[data-backdrop]');
      const close = modal?.querySelector('[data-close]');
      if (backdrop) backdrop.addEventListener('click', () => this.closeModal(id));
      if (close) close.addEventListener('click', () => this.closeModal(id));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['messageModal', 'detailModal'].forEach(id => {
          const m = document.getElementById(id);
          if (m && !m.classList.contains('hidden')) this.closeModal(id);
        });
      }
    });
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    const anyOpen = ['detailModal', 'messageModal'].some(mid => {
      const m = document.getElementById(mid);
      return m && !m.classList.contains('hidden');
    });
    if (!anyOpen) document.body.classList.remove('overflow-hidden');
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    if (window.lucide) lucide.createIcons();
  },

  // ═══ DETAIL MODAL ═══
  async openDetail(n) {
    // Mark read
    if (!n.is_read) {
      try {
        await API.put(`/notifications/${n.id}/read`);
        n.is_read = 1;
        this.renderList();
      } catch (e) {}
    }

    const cat = this.categorize(n);
    const body = document.getElementById('dmBody');

    // Base HTML
    let html = `
      <div class="flex items-start gap-4 pb-4 border-b border-gray-100">
        <div class="w-12 h-12 rounded-xl bg-[#ffe5e8] flex items-center justify-center flex-shrink-0">
          <i data-lucide="bell" class="w-6 h-6 text-[#E21B2D]"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            ${this.categoryChip(cat, n)}
          </div>
          <h2 class="text-[17px] font-bold text-[#1a1d21] leading-snug">${this.esc(n.title)}</h2>
          <div class="text-[11.5px] text-[#9ca3af] mt-1.5">${this.formatFullDate(n.created_at)}</div>
        </div>
      </div>

      <div class="py-4">
        <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-1">Message</div>
        <p class="text-[13px] text-[#343A40] leading-relaxed whitespace-pre-wrap">${this.esc(n.message)}</p>
      </div>
    `;

    // Action section based on category
    if (cat === 'requests') {
      // User Request → show user info + "Send Direct Message" button
      html += `
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="user" class="w-4 h-4 text-blue-600"></i>
            <span class="text-[12.5px] font-bold text-[#1a1d21]">User Request</span>
          </div>
          <p class="text-[11.5px] text-[#6b7280] leading-snug mb-3">
            A citizen has sent a help request. You can reply directly with a personal message.
          </p>
          <button id="dmSendMsgBtn" class="w-full flex items-center justify-center gap-2 bg-[#E21B2D] hover:bg-[#c41525] text-white font-semibold text-[13px] py-3 rounded-lg shadow-md transition-all">
            <i data-lucide="mail" class="w-4 h-4"></i>
            Send Direct Message
          </button>
        </div>
      `;
    } else if (cat === 'chats') {
      // Chat → "Open Chat" button
      html += `
        <div class="p-4 bg-[#fff5f6] rounded-xl border border-[#fdd] mb-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="message-circle" class="w-4 h-4 text-[#E21B2D]"></i>
            <span class="text-[12.5px] font-bold text-[#1a1d21]">Chat Notification</span>
          </div>
          <p class="text-[11.5px] text-[#6b7280] leading-snug mb-3">
            This is a chat message from MyBMC. Open the chat to view and reply.
          </p>
          <button id="dmOpenChatBtn" class="w-full flex items-center justify-center gap-2 bg-[#E21B2D] hover:bg-[#c41525] text-white font-semibold text-[13px] py-3 rounded-lg shadow-md transition-all">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
            Open Chat with MyBMC
          </button>
        </div>
      `;
    } else if (n.complaint_id && (n.sender_role === 'provider' || n.sender_role === 'system')) {
      // Complaint-related — show complaint info
      html += `
        <div class="p-4 bg-purple-50 rounded-xl border border-purple-100 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="clipboard-list" class="w-4 h-4 text-purple-600"></i>
            <span class="text-[12.5px] font-bold text-[#1a1d21]">Complaint Update</span>
          </div>
          <p class="text-[11.5px] text-[#6b7280] leading-snug mb-3">
            This notification is related to a complaint. View it for full details.
          </p>
          <button id="dmViewComplaintBtn" class="w-full flex items-center justify-center gap-2 bg-[#E21B2D] hover:bg-[#c41525] text-white font-semibold text-[13px] py-3 rounded-lg shadow-md transition-all">
            <i data-lucide="eye" class="w-4 h-4"></i>
            View Complaint
          </button>
        </div>
      `;
    } else if (n.sender_role === 'provider') {
      // Provider general — info only, no reply option
      html += `
        <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
          <div class="flex items-center gap-2 mb-1.5">
            <i data-lucide="info" class="w-4 h-4 text-[#6b7280]"></i>
            <span class="text-[12.5px] font-bold text-[#1a1d21]">General Notification</span>
          </div>
          <p class="text-[11.5px] text-[#6b7280] leading-snug">
            This is a general update from MyBMC. No reply is required.
          </p>
        </div>
      `;
    }

    // Close button
    html += `
      <button data-close class="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-[#343A40] font-semibold text-[13px] py-2.5 rounded-lg transition-all">
        Close
      </button>
    `;

    body.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Attach action handlers
    document.getElementById('dmSendMsgBtn')?.addEventListener('click', () => {
      this.closeModal('detailModal');
      this.openMessageModal(n.sender_id, 'User');
    });

    document.getElementById('dmOpenChatBtn')?.addEventListener('click', () => {
      window.location.href = 'providers.html?openchat=1';
    });

    document.getElementById('dmViewComplaintBtn')?.addEventListener('click', () => {
      window.location.href = `complaints.html`;
    });

    // Re-attach close button
    document.querySelectorAll('#detailModal [data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal('detailModal'));
    });

    this.openModal('detailModal');
  },

  categoryChip(cat, n) {
    if (cat === 'requests') {
      return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600"><i data-lucide="user" class="w-3 h-3"></i> User Request</span>';
    }
    if (cat === 'chats') {
      return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#ffe5e8] text-[#E21B2D]"><i data-lucide="message-circle" class="w-3 h-3"></i> Chat</span>';
    }
    if (n.sender_role === 'provider') {
      return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-600"><i data-lucide="building-2" class="w-3 h-3"></i> MyBMC</span>';
    }
    return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-gray-100 text-[#343A40]"><i data-lucide="bell" class="w-3 h-3"></i> System</span>';
  },

  // ═══ MESSAGE MODAL ═══
  openMessageModal(userId, userName) {
    this._messageUserId = userId;
    document.getElementById('msgUserName').textContent = userName;
    document.getElementById('msgTitle').value = '';
    document.getElementById('msgBody').value = '';
    document.getElementById('msgCharCount').textContent = '0/500';
    this.openModal('messageModal');
    setTimeout(() => document.getElementById('msgTitle')?.focus(), 100);
  },

  initMessageForm() {
    const form = document.getElementById('sendMessageForm');
    const bodyEl = document.getElementById('msgBody');
    const counter = document.getElementById('msgCharCount');

    bodyEl?.addEventListener('input', () => {
      const len = bodyEl.value.length;
      if (counter) counter.textContent = `${len}/500`;
      if (len > 500) bodyEl.value = bodyEl.value.slice(0, 500);
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('msgTitle').value.trim();
      const message = bodyEl.value.trim();

      if (!title || title.length < 3) { this.toast('Title must be at least 3 characters', 'error'); return; }
      if (!message || message.length < 5) { this.toast('Message must be at least 5 characters', 'error'); return; }

      const btn = document.getElementById('msgSendBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Sending...</span>`;

      try {
        await API.post('/admin/send-user-message', {
          user_id: this._messageUserId,
          title: title,
          message: message
        });
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast('Message sent successfully!', 'success');
        this.closeModal('messageModal');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Failed to send', 'error');
      }
    });
  },

  // ═══ HELPERS ═══
  timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatFullDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  },

  esc(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },

  toast(msg, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };
    const el = document.createElement('div');
    el.className = `fixed top-6 right-6 z-[300] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transform translate-x-full transition-transform duration-300`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-x-full'));
    setTimeout(() => {
      el.classList.add('translate-x-full');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => AdminNotifications.init());
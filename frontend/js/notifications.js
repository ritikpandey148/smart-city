// frontend/js/notifications.js
// Citizen Notifications page

const NotificationsPage = {
  user: null,
  all: [],
  filter: 'all', // 'all' | 'mybmc' | 'admin'
  sort: 'latest', // 'latest' | 'oldest'
  search: '',
  unreadCount: 0,

  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
      // Initialize side menu (avatar-triggered)
  SideMenu.init(this.user);
    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initFilters();
    this.initSortSearch();
    this.initMarkAllBtn();
    this.initNotificationModal();
    await this.loadData();
  },

  renderUser() {
    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
    const n = document.getElementById('userFirstName');
    if (n) n.textContent = this.user.first_name || 'Citizen';
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

  // ═══ FILTERS ═══
  initFilters() {
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.filter = tab.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(t => {
          t.classList.remove('bg-[#E21B2D]', 'text-white', 'shadow-md');
          t.classList.add('bg-white', 'text-[#343A40]');
        });
        tab.classList.add('bg-[#E21B2D]', 'text-white', 'shadow-md');
        tab.classList.remove('bg-white', 'text-[#343A40]');
        this.renderList();
      });
    });
  },

  // ═══ SORT + SEARCH ═══
  initSortSearch() {
    const sortSel = document.getElementById('sortSelect');
    sortSel?.addEventListener('change', () => {
      this.sort = sortSel.value;
      this.renderList();
    });

    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', () => {
      this.search = searchInput.value.trim().toLowerCase();
      this.renderList();
    });
  },

  // ═══ MARK ALL READ ═══
  initMarkAllBtn() {
    document.getElementById('markAllBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('markAllBtn');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Marking...</span>`;
      try {
        await API.put('/notifications/mark-all-read');
        this.all = this.all.map(n => ({ ...n, is_read: 1 }));
        this.unreadCount = 0;
        this.updateCounts();
        this.renderList();
        this.toast('All notifications marked as read', 'success');
      } catch (err) {
        this.toast(err.message || 'Failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
      }
    });
  },

  // ═══ LOAD DATA ═══
  async loadData() {
    const listWrap = document.getElementById('notificationsList');
    if (listWrap) {
      listWrap.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16">
          <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
          <p class="text-[13px] text-[#6b7280] mt-3">Loading notifications...</p>
        </div>`;
    }

    try {
      const res = await API.get('/notifications/my');
      this.all = res.data.notifications || [];
      this.unreadCount = res.data.unread_count || 0;
      this.updateCounts();
      this.renderList();
      this.updateHeaderBadge();
    } catch (err) {
      console.error(err);
      this.toast('Could not load notifications', 'error');
      if (listWrap) listWrap.innerHTML = this.emptyStateHtml('Could not load notifications');
    }
  },

  updateCounts() {
    const total = this.all.length;
    const mybmc = this.all.filter(n => n.sender_role === 'provider').length;
    const admin = this.all.filter(n => n.sender_role === 'admin').length;

    document.getElementById('tabAllCount').textContent = total;
    document.getElementById('tabMybmcCount').textContent = mybmc;
    document.getElementById('tabAdminCount').textContent = admin;
    document.getElementById('sideNotifCount').textContent = this.unreadCount;

    // Sidebar badge visibility
    const sideBadge = document.getElementById('sideNotifBadge');
    if (sideBadge) sideBadge.classList.toggle('hidden', this.unreadCount === 0);

    // Header bell badge
    const bell = document.getElementById('headerBellBadge');
    if (bell) {
      bell.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      bell.classList.toggle('hidden', this.unreadCount === 0);
    }
  },

  updateHeaderBadge() {
    // already handled in updateCounts
  },

  // ═══ RENDER LIST ═══
  renderList() {
    const wrap = document.getElementById('notificationsList');
    if (!wrap) return;

    let list = [...this.all];

    // Filter
    if (this.filter === 'mybmc') list = list.filter(n => n.sender_role === 'provider');
    else if (this.filter === 'admin') list = list.filter(n => n.sender_role === 'admin');

    // Search
    if (this.search) {
      list = list.filter(n =>
        (n.title || '').toLowerCase().includes(this.search) ||
        (n.message || '').toLowerCase().includes(this.search)
      );
    }

    // Sort
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return this.sort === 'latest' ? tb - ta : ta - tb;
    });

    // Sub-header title
    const filterName = this.filter === 'all' ? 'All Notifications' : this.filter === 'mybmc' ? 'MyBMC Notifications' : 'Admin Notifications';
    document.getElementById('listTitle').textContent = `${filterName} (${list.length})`;

    if (list.length === 0) {
      wrap.innerHTML = this.emptyStateHtml(this.search ? 'No matching notifications' : 'No notifications yet');
      if (window.lucide) lucide.createIcons();
      return;
    }

    wrap.innerHTML = list.map(n => this.renderItem(n)).join('');
    if (window.lucide) lucide.createIcons();

    // Attach click
    wrap.querySelectorAll('[data-notif-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.notifId, 10);
        const notif = this.all.find(n => n.id === id);
        if (notif) this.openDetail(notif);
      });
    });
  },

  renderItem(n) {
    const isUnread = !n.is_read;

    // Icon + color by category/sender
    let icon = 'bell', iconBg = 'bg-[#ffe5e8]', iconColor = 'text-[#E21B2D]';
    if (n.sender_role === 'provider') { icon = 'message-circle'; iconBg = 'bg-purple-100'; iconColor = 'text-purple-600'; }
    else if (n.sender_role === 'admin') { icon = 'shield-check'; iconBg = 'bg-red-100'; iconColor = 'text-[#E21B2D]'; }
    if (n.category === 'support') { icon = 'headphones'; iconBg = 'bg-purple-100'; iconColor = 'text-purple-600'; }
    if (n.title && n.title.toLowerCase().includes('resolved')) { icon = 'check-circle-2'; iconBg = 'bg-green-100'; iconColor = 'text-green-600'; }

    // Source badge
    const sourceMeta = {
      provider: { label: 'MyBMC', cls: 'bg-purple-50 text-purple-600 border border-purple-100' },
      admin:    { label: 'Admin', cls: 'bg-red-50 text-[#E21B2D] border border-red-100' },
      system:   { label: 'System', cls: 'bg-gray-100 text-[#343A40] border border-gray-200' }
    };
    const src = sourceMeta[n.sender_role] || sourceMeta.system;

    const timeAgo = this.timeAgo(n.created_at);

    return `
      <div data-notif-id="${n.id}"
           class="group flex items-start gap-3 sm:gap-4 p-4 rounded-2xl transition-all cursor-pointer
                  ${isUnread ? 'bg-white hover:bg-[#fff8f9] border border-[#fdd]' : 'bg-white hover:bg-gray-50 border border-gray-100'}">

        <!-- Unread dot -->
        <div class="flex-shrink-0 pt-2">
          <div class="w-2 h-2 rounded-full ${isUnread ? 'bg-[#E21B2D]' : 'bg-transparent'}"></div>
        </div>

        <!-- Icon -->
        <div class="w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <h4 class="text-[14.5px] font-semibold text-[#1a1d21] leading-snug">${this.escape(n.title)}</h4>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap ${src.cls}">
              ${src.label}
            </span>
          </div>
          <p class="text-[12.5px] text-[#6b7280] mt-1 leading-snug line-clamp-2">${this.escape(n.message)}</p>
          <div class="flex items-center gap-1.5 mt-2 text-[11px] text-[#9ca3af]">
            <i data-lucide="clock" class="w-3 h-3"></i>
            <span>${timeAgo}</span>
          </div>
        </div>

        <!-- Chevron -->
        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-[#E21B2D] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-3"></i>
      </div>
    `;
  },

  emptyStateHtml(msg) {
    return `
      <div class="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
        <div class="w-16 h-16 rounded-full bg-[#ffe5e8] flex items-center justify-center mb-3">
          <i data-lucide="bell-off" class="w-7 h-7 text-[#E21B2D]"></i>
        </div>
        <p class="text-[15px] font-semibold text-[#343A40]">${msg}</p>
        <p class="text-[12.5px] text-[#6b7280] mt-1">Updates from MyBMC and Admin will appear here.</p>
      </div>
    `;
  },

  timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;

    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  // ═══ DETAIL MODAL ═══
  initNotificationModal() {
    const modal = document.getElementById('notifModal');
    const backdrop = document.getElementById('notifModalBackdrop');
    const closeBtn = document.getElementById('notifModalClose');

    const close = () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    backdrop?.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) close();
    });
  },

  async openDetail(n) {
    // Mark as read in background if unread
    if (!n.is_read) {
      try {
        await API.put(`/notifications/${n.id}/read`);
        n.is_read = 1;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateCounts();
        this.renderList();
      } catch (e) {}
    }

    // Fill modal
    document.getElementById('modalNotifTitle').textContent = n.title || 'Notification';
    document.getElementById('modalNotifMessage').textContent = n.message || '';
    document.getElementById('modalNotifTime').textContent = this.formatFullDate(n.created_at);

    const sourceMeta = {
      provider: { label: 'MyBMC Support', cls: 'bg-purple-50 text-purple-600' },
      admin: { label: 'Admin', cls: 'bg-red-50 text-[#E21B2D]' },
      system: { label: 'System', cls: 'bg-gray-100 text-[#343A40]' }
    };
    const src = sourceMeta[n.sender_role] || sourceMeta.system;
    const srcEl = document.getElementById('modalNotifSource');
    srcEl.textContent = src.label;
    srcEl.className = `inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${src.cls}`;

    // Reference complaint button
    const refBtn = document.getElementById('modalRefBtn');
    if (n.complaint_id && n.ref_complaint_id) {
      refBtn.classList.remove('hidden');
      refBtn.onclick = () => {
        window.location.href = `track-status.html?id=${n.complaint_id}`;
      };
      document.getElementById('modalRefId').textContent = n.ref_complaint_id;
    } else {
      refBtn.classList.add('hidden');
    }

    const modal = document.getElementById('notifModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    if (window.lucide) lucide.createIcons();
  },

  formatFullDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
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
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => NotificationsPage.init());
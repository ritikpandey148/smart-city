// frontend/js/admin-users.js
// Admin — Users page

const AdminUsers = {
  user: null,
  all: [],
  filtered: [],
  stats: { total: 0, live: 0, newUsers: 0, active: 0 },
  currentTab: 'all',
  searchQuery: '',
  locationFilter: '',
  currentPage: 1,
  perPage: 8,

  async init() {
    this.user = await Guard.protect('admin');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderAdminUser();
    this.initMenu();
    this.initLogout();
    this.initNotificationBell();
    this.initTabs();
    this.initSearch();
    this.initLocationFilter();
    this.initPagination();
    this.initModals();
    this.initSendMessageForm();

    await this.loadUsers();
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

  // ═══ LOAD USERS ═══
  async loadUsers() {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
      </td></tr>`;
    }

    try {
      const res = await API.get('/admin/users');
      this.all = res.data || [];
      this.computeStats();
      this.renderStats();
      this.applyFilters();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-red-500 text-[13px]">Failed to load users</td></tr>`;
    }
  },

  computeStats() {
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    let live = 0, newUsers = 0, active = 0;
    this.all.forEach(u => {
      if (u.last_seen) {
        const ls = new Date(u.last_seen).getTime();
        if (now - ls < FIVE_MIN) live++;
      }
      if (u.created_at) {
        const cd = new Date(u.created_at).getTime();
        if (now - cd < SEVEN_DAYS) newUsers++;
      }
      if ((u.complaint_count || 0) > 0) active++;
    });

    this.stats = {
      total: this.all.length,
      live,
      newUsers,
      active
    };
  },

  renderStats() {
    const s = this.stats;
    document.getElementById('statTotalUsers').textContent = s.total.toLocaleString('en-IN');
    document.getElementById('statLiveUsers').textContent = s.live.toLocaleString('en-IN');
    document.getElementById('statNewUsers').textContent = s.newUsers.toLocaleString('en-IN');
    document.getElementById('statActiveUsers').textContent = s.active.toLocaleString('en-IN');

    // Tab counts
    document.getElementById('tabAllCount').textContent = s.total;
    document.getElementById('tabLiveCount').textContent = s.live;
    document.getElementById('tabNewCount').textContent = s.newUsers;
    document.getElementById('tabActiveCount').textContent = s.active;
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

  // ═══ SEARCH ═══
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

  // ═══ LOCATION FILTER ═══
  initLocationFilter() {
    const sel = document.getElementById('locationFilter');
    sel?.addEventListener('change', () => {
      this.locationFilter = sel.value;
      this.currentPage = 1;
      this.applyFilters();
    });
  },

  populateLocationFilter() {
    const sel = document.getElementById('locationFilter');
    if (!sel) return;

    const locations = [...new Set(this.all.map(u => u.locality).filter(Boolean))].sort();

    const current = sel.value;
    sel.innerHTML = '<option value="">All Locations</option>' +
      locations.map(l => `<option value="${this.esc(l)}">${this.esc(l)}</option>`).join('');

    if (locations.includes(current)) sel.value = current;
  },

  // ═══ FILTERS ═══
  applyFilters() {
    if (this.all.length && document.getElementById('locationFilter').options.length <= 1) {
      this.populateLocationFilter();
    }

    let list = [...this.all];
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    // Tab filter
    if (this.currentTab === 'live') {
      list = list.filter(u => u.last_seen && (now - new Date(u.last_seen).getTime()) < FIVE_MIN);
    } else if (this.currentTab === 'new') {
      list = list.filter(u => u.created_at && (now - new Date(u.created_at).getTime()) < SEVEN_DAYS);
    } else if (this.currentTab === 'active') {
      list = list.filter(u => (u.complaint_count || 0) > 0);
    }

    // Location
    if (this.locationFilter) {
      list = list.filter(u => u.locality === this.locationFilter);
    }

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(u =>
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q) ||
        (`${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()).includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.mobile || '').toLowerCase().includes(q) ||
        (u.locality || '').toLowerCase().includes(q) ||
        (u.pincode || '').toLowerCase().includes(q)
      );
    }

    this.filtered = list;
    this.renderTable();
    this.renderPagination();
  },

  // ═══ TABLE ═══
  renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.perPage;
    const items = this.filtered.slice(start, start + this.perPage);

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-14">
        <div class="w-14 h-14 mx-auto rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
          <i data-lucide="users" class="w-6 h-6 text-[#E21B2D]"></i>
        </div>
        <p class="text-[13.5px] font-semibold text-[#343A40]">No users found</p>
        <p class="text-[12px] text-[#6b7280] mt-0.5">Try changing filters or search</p>
      </td></tr>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = items.map((u, i) => this.renderRow(u, start + i + 1)).join('');
    if (window.lucide) lucide.createIcons();

    tbody.querySelectorAll('[data-view-user]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.viewUser, 10);
        this.openUserModal(id);
      });
    });

    tbody.querySelectorAll('[data-row-user]').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = parseInt(tr.dataset.rowUser, 10);
        this.openUserModal(id);
      });
    });
  },

  renderRow(u, sl) {
    const initial = ((u.first_name || 'U').charAt(0) + (u.last_name || '').charAt(0)).toUpperCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User';

    // Active status (based on last_seen < 5 min OR account_status)
    const isLive = u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 5 * 60 * 1000;
    const isActive = (u.account_status || 'active') === 'active';

    const statusMeta = isActive
      ? { label: 'Active', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' }
      : { label: 'Inactive', cls: 'bg-red-50 text-red-600', dot: 'bg-red-500' };

    // Joined
    const joined = u.created_at
      ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    // Last active
    let lastActive = '—';
    if (u.last_seen) {
      const diff = Math.floor((Date.now() - new Date(u.last_seen).getTime()) / 60000);
      if (diff < 5) lastActive = '<span class="text-green-600 font-semibold">Online now</span>';
      else if (diff < 60) lastActive = `${diff} min ago`;
      else if (diff < 1440) lastActive = `${Math.floor(diff / 60)} hr ago`;
      else lastActive = `${Math.floor(diff / 1440)} days ago`;
    }

    const complaintCount = u.complaint_count || 0;
    const location = u.locality ? `${u.locality}, Mumbai` : '—';

    return `
      <tr data-row-user="${u.id}" class="border-b border-gray-50 hover:bg-[#fafbfc] transition-colors cursor-pointer">
        <td class="py-3 px-3 text-[12px] text-[#6b7280] font-medium">${sl}</td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#E21B2D] text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">
              ${this.esc(initial)}
            </div>
            <div class="min-w-0">
              <div class="text-[13px] font-semibold text-[#1a1d21] truncate">${this.esc(fullName)}</div>
              <div class="text-[11px] text-[#6b7280] truncate">@${this.esc(u.username || '—')}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1.5 text-[12px] text-[#343A40]">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-[#E21B2D] flex-shrink-0"></i>
            <span class="truncate">${this.esc(location)}</span>
          </div>
          <div class="text-[10.5px] text-[#9ca3af] mt-0.5 ml-5">PIN: ${this.esc(u.pincode || '—')}</div>
        </td>
        <td class="py-3 px-3 text-[12px] text-[#343A40] whitespace-nowrap">${joined}</td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f5f6f7] text-[11.5px] font-bold text-[#343A40]">
            ${complaintCount}
          </span>
        </td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusMeta.cls}">
            <span class="w-1.5 h-1.5 rounded-full ${statusMeta.dot}"></span>
            ${statusMeta.label}
          </span>
        </td>
        <td class="py-3 px-3 text-[11.5px] text-[#6b7280] whitespace-nowrap">${lastActive}</td>
        <td class="py-3 px-3">
          <button data-view-user="${u.id}"
                  class="inline-flex items-center gap-1.5 bg-white hover:bg-[#E21B2D] border border-[#E21B2D] text-[#E21B2D] hover:text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            View Details
          </button>
        </td>
      </tr>
    `;
  },

  // ═══ PAGINATION ═══
  initPagination() {
    document.getElementById('pagePrev')?.addEventListener('click', () => {
      if (this.currentPage > 1) { this.currentPage--; this.renderTable(); this.renderPagination(); }
    });
    document.getElementById('pageNext')?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.perPage));
      if (this.currentPage < totalPages) { this.currentPage++; this.renderTable(); this.renderPagination(); }
    });
  },

  renderPagination() {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.perPage));
    const start = (this.currentPage - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage * this.perPage, this.filtered.length);

    const showEl = document.getElementById('paginationInfo');
    if (showEl) showEl.textContent = this.filtered.length === 0
      ? 'Showing 0 users'
      : `Showing ${start} to ${end} of ${this.filtered.length} users`;

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
        this.renderTable();
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
    ['userModal', 'messageModal'].forEach(id => {
      const modal = document.getElementById(id);
      const backdrop = modal?.querySelector('[data-backdrop]');
      const close = modal?.querySelector('[data-close]');
      if (backdrop) backdrop.addEventListener('click', () => this.closeModal(id));
      if (close) close.addEventListener('click', () => this.closeModal(id));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['messageModal', 'userModal'].forEach(id => {
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
    const anyOpen = ['userModal', 'messageModal'].some(mid => {
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

  // ═══ USER DETAIL MODAL ═══
  async openUserModal(userId) {
    this.openModal('userModal');

    const body = document.getElementById('umBody');
    body.innerHTML = `<div class="flex justify-center py-10">
      <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
    </div>`;

    try {
      const res = await API.get(`/admin/users/${userId}`);
      const { user, summary, complaints } = res.data;
      this.renderUserModal(user, summary, complaints);
    } catch (err) {
      body.innerHTML = `<div class="text-center py-10 text-red-500 text-[13px]">${err.message || 'Failed to load'}</div>`;
    }
  },

  renderUserModal(user, summary, complaints) {
    const initial = ((user.first_name || 'U').charAt(0) + (user.last_name || '').charAt(0)).toUpperCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    const joined = new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let lastSeenStr = '—';
    if (user.last_seen) {
      const d = new Date(user.last_seen);
      const diff = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diff < 5) lastSeenStr = '<span class="text-green-600 font-semibold">Online now</span>';
      else if (diff < 60) lastSeenStr = `${diff} min ago`;
      else if (diff < 1440) lastSeenStr = `${Math.floor(diff / 60)} hr ago`;
      else lastSeenStr = `${Math.floor(diff / 1440)} days ago`;
    }

    const html = `
      <!-- User Header -->
      <div class="flex items-center gap-4 pb-4 border-b border-gray-100">
        <div class="w-16 h-16 rounded-full bg-[#E21B2D] flex items-center justify-center text-white font-bold text-[22px] flex-shrink-0 shadow-md">
          ${this.esc(initial)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[18px] font-bold text-[#1a1d21] truncate">${this.esc(fullName)}</div>
          <div class="text-[12px] text-[#6b7280] mt-0.5">@${this.esc(user.username || '—')}</div>
          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10.5px] font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              ${this.esc(user.account_status || 'active')}
            </span>
            <span class="text-[11px] text-[#9ca3af]">•</span>
            <span class="text-[11px] text-[#6b7280]">${lastSeenStr}</span>
          </div>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-3 py-4 border-b border-gray-100">
        <div>
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">First Name</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${this.esc(user.first_name || '—')}</div>
        </div>
        <div>
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">Last Name</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${this.esc(user.last_name || '—')}</div>
        </div>
        <div>
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">Mobile</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${this.esc(user.mobile || '—')}</div>
        </div>
        <div>
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">Gender</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${this.esc(user.gender || '—')}</div>
        </div>
        <div>
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">Locality</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${this.esc(user.locality || '—')}</div>
        </div>
        <div>
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">Pincode</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${this.esc(user.pincode || '—')}</div>
        </div>
        <div class="col-span-2">
          <div class="text-[10.5px] uppercase tracking-wide font-semibold text-[#9ca3af] mb-0.5">Member Since</div>
          <div class="text-[12.5px] text-[#343A40] font-medium">${joined}</div>
        </div>
      </div>

      <!-- Complaint Summary -->
      <div class="pt-4 pb-3 border-b border-gray-100">
        <div class="text-[12.5px] font-bold text-[#1a1d21] mb-2.5">Complaint Summary</div>
        <div class="grid grid-cols-4 gap-2">
          <div class="bg-[#f9fafb] rounded-lg p-2.5 text-center">
            <div class="text-[18px] font-bold text-[#1a1d21] leading-none">${summary.total}</div>
            <div class="text-[10px] text-[#6b7280] mt-1">Total</div>
          </div>
          <div class="bg-[#fff5f6] rounded-lg p-2.5 text-center">
            <div class="text-[18px] font-bold text-[#E21B2D] leading-none">${summary.garbage}</div>
            <div class="text-[10px] text-[#6b7280] mt-1">Garbage</div>
          </div>
          <div class="bg-[#f5f6f7] rounded-lg p-2.5 text-center">
            <div class="text-[18px] font-bold text-[#343A40] leading-none">${summary.pothole}</div>
            <div class="text-[10px] text-[#6b7280] mt-1">Pothole</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-2.5 text-center">
            <div class="text-[18px] font-bold text-purple-600 leading-none">${summary.others}</div>
            <div class="text-[10px] text-[#6b7280] mt-1">Others</div>
          </div>
        </div>
        <div class="grid grid-cols-4 gap-2 mt-2">
          <div class="bg-gray-50 rounded-lg p-2 text-center">
            <div class="text-[14px] font-bold text-gray-700 leading-none">${summary.submitted}</div>
            <div class="text-[9.5px] text-[#6b7280] mt-0.5">Submitted</div>
          </div>
          <div class="bg-amber-50 rounded-lg p-2 text-center">
            <div class="text-[14px] font-bold text-amber-700 leading-none">${summary.in_review}</div>
            <div class="text-[9.5px] text-[#6b7280] mt-0.5">Review</div>
          </div>
          <div class="bg-orange-50 rounded-lg p-2 text-center">
            <div class="text-[14px] font-bold text-orange-600 leading-none">${summary.in_progress}</div>
            <div class="text-[9.5px] text-[#6b7280] mt-0.5">Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-2 text-center">
            <div class="text-[14px] font-bold text-green-700 leading-none">${summary.resolved}</div>
            <div class="text-[9.5px] text-[#6b7280] mt-0.5">Resolved</div>
          </div>
        </div>
      </div>

      <!-- Complaint History -->
      <div class="pt-4">
        <div class="flex items-center justify-between mb-2.5">
          <div class="text-[12.5px] font-bold text-[#1a1d21]">Complaint History</div>
          <span class="text-[11px] text-[#6b7280]">${complaints.length} total</span>
        </div>
        ${complaints.length === 0 ? `
          <div class="text-center py-6 text-[12px] text-[#9ca3af]">No complaints yet</div>
        ` : `
          <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            ${complaints.slice(0, 10).map(c => this.renderUserComplaintRow(c)).join('')}
          </div>
        `}
      </div>

      <!-- Message Button -->
      <button id="umMessageBtn"
              class="mt-5 w-full flex items-center justify-center gap-2 bg-[#E21B2D] hover:bg-[#c41525] text-white font-semibold text-[13px] py-3 rounded-lg shadow-md transition-all">
        <i data-lucide="mail" class="w-4 h-4"></i>
        <span>Send Message to ${this.esc(user.first_name || 'User')}</span>
      </button>
    `;

    document.getElementById('umBody').innerHTML = html;
    if (window.lucide) lucide.createIcons();

    document.getElementById('umMessageBtn').onclick = () => {
      this.closeModal('userModal');
      this.openMessageModal(user.id, fullName);
    };
  },

  renderUserComplaintRow(c) {
    const statusMeta = {
      submitted:   { label: 'Submitted',   cls: 'bg-gray-100 text-gray-700' },
      in_review:   { label: 'In Review',   cls: 'bg-amber-50 text-amber-700' },
      in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600' },
      resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-700' }
    };
    const st = statusMeta[c.status] || statusMeta.submitted;
    const catLabel = { garbage: 'Garbage', pothole: 'Pothole', others: 'Others' }[c.category] || c.category;
    const ds = new Date(c.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <div class="border border-gray-100 rounded-lg p-2.5 hover:bg-[#fafbfc] transition-colors">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-[11px] font-mono font-semibold text-[#1a1d21]">${this.esc(c.complaint_id)}</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${st.cls}">${st.label}</span>
        </div>
        <div class="text-[11.5px] font-medium text-[#343A40] truncate">${this.esc(c.title)}</div>
        <div class="flex items-center gap-2 mt-1 text-[10px] text-[#9ca3af]">
          <span>${catLabel}</span>
          <span>•</span>
          <span>${ds}</span>
        </div>
      </div>
    `;
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

  initSendMessageForm() {
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

document.addEventListener('DOMContentLoaded', () => AdminUsers.init());
// frontend/js/admin-complaints.js
// Admin — All Complaints (with category filter via ?cat=)

const AdminComplaints = {
  user: null,
  all: [],
  filtered: [],
  stats: {},
  providersList: [],
  currentFilter: 'all',
  currentStatus: 'all',
  searchQuery: '',
  currentPage: 1,
  perPage: 10,
  lockedCategory: null, // set when ?cat= present

  async init() {
    this.user = await Guard.protect('admin');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderAdminUser();
    this.initMenu();
    this.initLogout();
    this.initNotificationBell();
    this.initFilters();
    this.initStatusFilter();
    this.initSearch();
    this.initPagination();
    this.initModals();
    this.initSendMessageForm();
    this.initExport();

    // Check URL param ?cat=
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    if (cat && ['garbage', 'pothole', 'others'].includes(cat)) {
      this.lockedCategory = cat;
      this.currentFilter = cat;
      this.updatePageTitle(cat);
      // Lock filter tabs — hide them
      const filterWrap = document.getElementById('filterTabsWrap');
      if (filterWrap) filterWrap.classList.add('hidden');
    }

    await this.loadProviders();
    await this.loadStats();
    await this.loadComplaints();
  },

  updatePageTitle(cat) {
    const titles = {
      garbage: { title: 'Garbage Reports', sub: 'All garbage-related complaints from citizens' },
      pothole: { title: 'Pothole Reports', sub: 'All pothole and road-related complaints' },
      others: { title: 'Other Reports', sub: 'All other civic complaints' }
    };
    const t = titles[cat];
    if (t) {
      document.getElementById('pageTitle').textContent = t.title;
      document.getElementById('pageSubtitle').textContent = t.sub;
    }
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

  async loadStats() {
    try {
      const res = await API.get('/admin/stats');
      this.stats = res.data || {};
      document.getElementById('statTotalCount').textContent = this.stats.total_complaints || 0;
      document.getElementById('statGarbageCount').textContent = this.stats.garbage || 0;
      document.getElementById('statPotholeCount').textContent = this.stats.pothole || 0;
      document.getElementById('statOthersCount').textContent = this.stats.others || 0;
    } catch (e) {}
  },

  async loadProviders() {
    try {
      const res = await API.get('/admin/providers');
      this.providersList = res.data || [];
    } catch (e) {
      this.providersList = [];
    }
  },

  async loadComplaints() {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-12">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
      </td></tr>`;
    }

    try {
      const res = await API.get('/admin/complaints');
      this.all = res.data || [];
      this.applyFilters();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-12 text-red-500 text-[13px]">Failed to load</td></tr>`;
    }
  },

  // ═══ FILTERS ═══
  initFilters() {
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentFilter = tab.dataset.filter;
        this.currentPage = 1;
        document.querySelectorAll('[data-filter]').forEach(t => {
          t.classList.remove('bg-[#E21B2D]', 'text-white');
          t.classList.add('bg-gray-100', 'text-[#343A40]');
        });
        tab.classList.add('bg-[#E21B2D]', 'text-white');
        tab.classList.remove('bg-gray-100', 'text-[#343A40]');
        this.applyFilters();
      });
    });
  },

  initStatusFilter() {
    const sel = document.getElementById('statusFilter');
    sel?.addEventListener('change', () => {
      this.currentStatus = sel.value;
      this.currentPage = 1;
      this.applyFilters();
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

  applyFilters() {
    let list = [...this.all];

    // Locked category override
    if (this.lockedCategory) {
      list = list.filter(c => c.category === this.lockedCategory);
    } else if (['garbage', 'pothole', 'others'].includes(this.currentFilter)) {
      list = list.filter(c => c.category === this.currentFilter);
    }

    // Status filter
    if (this.currentStatus !== 'all') {
      list = list.filter(c => c.status === this.currentStatus);
    }

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(c =>
        (c.complaint_id || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.locality || '').toLowerCase().includes(q) ||
        (`${c.first_name || ''} ${c.last_name || ''}`).toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q)
      );
    }

    this.filtered = list;
    this.updateResultCount();
    this.renderTable();
    this.renderPagination();
  },

  updateResultCount() {
    const el = document.getElementById('resultCount');
    if (el) el.textContent = this.filtered.length;
  },

  // ═══ TABLE ═══
  renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.perPage;
    const items = this.filtered.slice(start, start + this.perPage);

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-14">
        <div class="w-14 h-14 mx-auto rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
          <i data-lucide="inbox" class="w-6 h-6 text-[#E21B2D]"></i>
        </div>
        <p class="text-[13.5px] font-semibold text-[#343A40]">No complaints found</p>
        <p class="text-[12px] text-[#6b7280] mt-0.5">Try changing filters or search</p>
      </td></tr>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = items.map((c, i) => this.renderRow(c, start + i + 1)).join('');
    if (window.lucide) lucide.createIcons();

    // Attach handlers
    tbody.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.view, 10);
        const c = this.all.find(x => x.id === id);
        if (c) this.openComplaintModal(c);
      });
    });

    tbody.querySelectorAll('[data-user-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(el.dataset.userId, 10);
        this.openUserModal(id);
      });
    });
  },

  renderRow(c, sl) {
    const catMeta = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]', icon: 'trash-2' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]', icon: 'construction' },
      others:  { label: 'Others',  cls: 'bg-purple-50 text-purple-600', icon: 'layout-grid' }
    };
    const cat = catMeta[c.category] || catMeta.others;

    const statusMeta = {
      submitted:   { label: 'Submitted',   cls: 'bg-gray-100 text-gray-700' },
      in_review:   { label: 'In Review',   cls: 'bg-amber-50 text-amber-700' },
      in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600' },
      resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-700' }
    };
    const st = statusMeta[c.status] || statusMeta.submitted;

    const img = c.image_path
      ? `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`
      : '../assets/images/sidebar-city.png';

    const dt = new Date(c.submitted_at);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const userName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'N/A';
    const userInitial = userName !== 'N/A' ? userName.charAt(0).toUpperCase() : '?';

    const providerName = c.provider_name || '<span class="text-[#9ca3af]">Unassigned</span>';

    return `
      <tr class="border-b border-gray-50 hover:bg-[#fafbfc] transition-colors">
        <td class="py-3 px-3 text-[12px] text-[#6b7280] font-medium">${sl}</td>
        <td class="py-3 px-3">
          <img src="${img}" alt="" class="w-12 h-12 rounded-lg object-cover bg-gray-100" />
        </td>
        <td class="py-3 px-3">
          <div class="text-[12px] font-mono font-semibold text-[#1a1d21] whitespace-nowrap">${this.esc(c.complaint_id)}</div>
          <div class="mt-1">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.cls}">
              <i data-lucide="${cat.icon}" class="w-2.5 h-2.5"></i>
              ${cat.label}
            </span>
          </div>
        </td>
        <td class="py-3 px-3 max-w-[240px]">
          <div class="text-[12.5px] font-semibold text-[#1a1d21] truncate">${this.esc(c.title)}</div>
          <div class="text-[11px] text-[#9ca3af] truncate mt-0.5">${this.esc((c.description || '').substring(0, 60))}${(c.description || '').length > 60 ? '...' : ''}</div>
        </td>
        <td class="py-3 px-3">
          <button data-user-id="${c.user_id}" class="flex items-center gap-2 group">
            <div class="w-8 h-8 rounded-full bg-[#1a1d21] text-white flex items-center justify-center text-[11.5px] font-bold flex-shrink-0">
              ${userInitial}
            </div>
            <div class="text-left">
              <div class="text-[12px] font-semibold text-[#1a1d21] group-hover:text-[#E21B2D] transition-colors">${this.esc(userName)}</div>
              <div class="text-[10.5px] text-[#9ca3af]">@${this.esc(c.username || '—')}</div>
            </div>
          </button>
        </td>
        <td class="py-3 px-3 text-[11.5px] text-[#6b7280] whitespace-nowrap">
          <div>${this.esc(c.locality || 'N/A')}</div>
          <div class="text-[10.5px] text-[#9ca3af]">${this.esc(c.pincode || '—')}</div>
        </td>
        <td class="py-3 px-3 text-[11px] text-[#6b7280] whitespace-nowrap">
          <div>${dateStr}</div>
          <div class="text-[10.5px]">${timeStr}</div>
        </td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold ${st.cls} whitespace-nowrap">${st.label}</span>
        </td>
        <td class="py-3 px-3 text-[11px] text-[#343A40] whitespace-nowrap">${providerName}</td>
        <td class="py-3 px-3">
          <button data-view="${c.id}"
                  class="inline-flex items-center gap-1.5 bg-[#E21B2D] hover:bg-[#c41525] text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            View
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
      ? 'Showing 0 reports'
      : `Showing ${start} to ${end} of ${this.filtered.length} reports`;

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
    ['complaintModal', 'userModal', 'messageModal'].forEach(id => {
      const modal = document.getElementById(id);
      const backdrop = modal?.querySelector('[data-backdrop]');
      const close = modal?.querySelector('[data-close]');
      if (backdrop) backdrop.addEventListener('click', () => this.closeModal(id));
      if (close) close.addEventListener('click', () => this.closeModal(id));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['messageModal', 'userModal', 'complaintModal'].forEach(id => {
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
    // Only remove overflow hidden if all modals closed
    const anyOpen = ['complaintModal', 'userModal', 'messageModal'].some(mid => {
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

  // ═══ COMPLAINT DETAIL MODAL ═══
  async openComplaintModal(c) {
    // Image
    const imgWrap = document.getElementById('cmImageWrap');
    const img = document.getElementById('cmImage');
    if (c.image_path) {
      img.src = `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`;
      imgWrap.classList.remove('hidden');
    } else {
      imgWrap.classList.add('hidden');
    }

    // Category chip
    const catMeta = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]' },
      others:  { label: 'Others',  cls: 'bg-purple-50 text-purple-600' }
    };
    const cat = catMeta[c.category] || catMeta.others;
    const catEl = document.getElementById('cmCategory');
    catEl.textContent = cat.label;
    catEl.className = `inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${cat.cls}`;

    document.getElementById('cmComplaintId').textContent = c.complaint_id;
    document.getElementById('cmTitle').textContent = c.title;
    document.getElementById('cmDescription').textContent = c.description || 'No description provided.';
    document.getElementById('cmLocality').textContent = c.locality || '—';
    document.getElementById('cmPincode').textContent = c.pincode || '—';
    document.getElementById('cmNearby').textContent = c.nearby_address || '—';

    const dt = new Date(c.submitted_at);
    document.getElementById('cmDate').textContent = dt.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    // User section
    const userName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'N/A';
    const initial = userName !== 'N/A' ? userName.charAt(0).toUpperCase() : '?';
    document.getElementById('cmUserName').textContent = userName;
    document.getElementById('cmUserHandle').textContent = '@' + (c.username || '—');
    document.getElementById('cmUserAvatar').textContent = initial;
    document.getElementById('cmUserMobile').textContent = c.mobile || '—';

    // Buttons
    document.getElementById('cmViewUserBtn').onclick = () => this.openUserModal(c.user_id);
    document.getElementById('cmMessageUserBtn').onclick = () => {
      this.closeModal('complaintModal');
      this.openMessageModal(c.user_id, userName);
    };

    // Status + provider
    document.getElementById('cmStatus').value = c.status;
    const provSel = document.getElementById('cmProvider');
    provSel.innerHTML = '<option value="">— Select Provider —</option>' +
      this.providersList.map(p => `<option value="${p.id}" ${c.assigned_provider_id === p.id ? 'selected' : ''}>${this.esc(p.name)} (${this.esc(p.category)})</option>`).join('');

    // Update button
    document.getElementById('cmUpdateBtn').onclick = async () => {
      const newStatus = document.getElementById('cmStatus').value;
      const newProv = provSel.value;
      const btn = document.getElementById('cmUpdateBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Updating...</span>`;

      try {
        if (newStatus !== c.status) {
          await API.put(`/admin/complaints/${c.id}/status`, {
            status: newStatus,
            remarks: 'Updated by admin'
          });
        }
        if (newProv && parseInt(newProv, 10) !== c.assigned_provider_id) {
          await API.put(`/admin/complaints/${c.id}/assign`, {
            provider_id: parseInt(newProv, 10)
          });
        }
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast('Complaint updated', 'success');
        this.closeModal('complaintModal');
        await this.loadStats();
        await this.loadComplaints();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Update failed', 'error');
      }
    };

    // Track button
    document.getElementById('cmTrackBtn').onclick = () => {
      window.open(`../citizen/track-status.html?id=${c.id}`, '_blank');
    };

    this.openModal('complaintModal');
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
    const initial = (user.first_name || 'U').charAt(0).toUpperCase();
    const joined = new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let lastSeenStr = '—';
    if (user.last_seen) {
      const d = new Date(user.last_seen);
      const diff = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diff < 5) lastSeenStr = 'Active now';
      else if (diff < 60) lastSeenStr = `${diff} min ago`;
      else if (diff < 1440) lastSeenStr = `${Math.floor(diff / 60)} hr ago`;
      else lastSeenStr = `${Math.floor(diff / 1440)} days ago`;
    }

    const html = `
      <!-- User Header -->
      <div class="flex items-center gap-4 pb-4 border-b border-gray-100">
        <div class="w-16 h-16 rounded-full bg-[#1a1d21] flex items-center justify-center text-white font-bold text-[22px] flex-shrink-0 shadow-md">
          ${initial}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[18px] font-bold text-[#1a1d21] truncate">${this.esc(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User')}</div>
          <div class="text-[12px] text-[#6b7280] mt-0.5">@${this.esc(user.username)}</div>
          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10.5px] font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              ${this.esc(user.account_status)}
            </span>
            <span class="text-[11px] text-[#9ca3af]">•</span>
            <span class="text-[11px] text-[#6b7280]">${lastSeenStr}</span>
          </div>
        </div>
      </div>

      <!-- User Info Grid -->
      <div class="grid grid-cols-2 gap-3 py-4 border-b border-gray-100">
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

    // Message button handler
    document.getElementById('umMessageBtn').onclick = () => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
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

    const dt = new Date(c.submitted_at);
    const ds = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <div class="border border-gray-100 rounded-lg p-2.5 hover:bg-[#fafbfc] transition-colors cursor-pointer" onclick="AdminComplaints.openComplaintById(${c.id})">
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

  openComplaintById(id) {
    const c = this.all.find(x => x.id === id);
    if (c) {
      this.closeModal('userModal');
      setTimeout(() => this.openComplaintModal(c), 100);
    }
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

  // ═══ EXPORT CSV ═══
  initExport() {
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      if (this.filtered.length === 0) {
        this.toast('No complaints to export', 'error');
        return;
      }
      const headers = ['#', 'Complaint ID', 'Category', 'Title', 'Description', 'Locality', 'Pincode', 'User', 'Username', 'Mobile', 'Status', 'Assigned To', 'Submitted At'];
      const rows = this.filtered.map((c, i) => [
        i + 1,
        c.complaint_id,
        c.category,
        this.cleanCSV(c.title),
        this.cleanCSV(c.description || ''),
        c.locality || '',
        c.pincode || '',
        this.cleanCSV(`${c.first_name || ''} ${c.last_name || ''}`.trim()),
        c.username || '',
        c.mobile || '',
        c.status,
        this.cleanCSV(c.provider_name || ''),
        new Date(c.submitted_at).toLocaleString('en-GB')
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach(r => { csv += r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n'; });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-city-complaints-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast('CSV downloaded', 'success');
    });
  },

  cleanCSV(s) {
    return String(s || '').replace(/[\r\n]+/g, ' ').trim();
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

document.addEventListener('DOMContentLoaded', () => AdminComplaints.init());
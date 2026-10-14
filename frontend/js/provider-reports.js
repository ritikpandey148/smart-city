// frontend/js/provider-reports.js
// myBMC Provider — Assigned Reports (all complaints visible)

const ProviderReports = {
  user: null,
  all: [],
  filtered: [],
  stats: {},
  currentFilter: 'all',
  currentStatus: 'all',
  searchQuery: '',
  currentPage: 1,
  perPage: 10,
  lockedCategory: null,

  async init() {
    this.user = await Guard.protect('provider');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderProviderInfo();
    this.initMenu();
    this.initLogout();
    this.initFilters();
    this.initStatusFilter();
    this.initSearch();
    this.initPagination();
    this.initModals();
    this.initBackButton();

    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    if (cat && ['garbage', 'pothole', 'others'].includes(cat)) {
      this.lockedCategory = cat;
      this.currentFilter = cat;
      this.updatePageTitle(cat);
      document.getElementById('filterTabsWrap')?.classList.add('hidden');
    }

    const viewId = urlParams.get('view');
    await this.loadStats();
    await this.loadComplaints();

    if (viewId) {
      setTimeout(() => this.openComplaint(parseInt(viewId, 10)), 400);
    }
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

  initBackButton() {
    document.getElementById('backBtn')?.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  },

  // ═══ STATS ═══
  async loadStats() {
  try {
    const res = await API.get('/provider/stats');
    this.stats = res.data || {};
    this.updateStatsDisplay();
  } catch (e) {}
},

updateStatsDisplay() {
  // Filter complaints by locked category
  let list = this.all || [];
  if (this.lockedCategory) {
    list = list.filter(c => c.category === this.lockedCategory);
  }

  const total = list.length;
  const inReview = list.filter(c => c.status === 'in_review').length;
  const inProgress = list.filter(c => c.status === 'in_progress').length;
  const resolved = list.filter(c => c.status === 'resolved').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statReview').textContent = inReview;
  document.getElementById('statProgress').textContent = inProgress;
  document.getElementById('statResolved').textContent = resolved;
},

  // ═══ COMPLAINTS ═══
  async loadComplaints() {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-12">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
      </td></tr>`;
    }

    try {
      const res = await API.get('/provider/complaints');
      this.all = res.data || [];
      this.updateStatsDisplay();
      this.applyFilters();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center py-12 text-red-500 text-[13px]">Failed to load</td></tr>`;
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

    if (this.lockedCategory) {
      list = list.filter(c => c.category === this.lockedCategory);
    } else if (['garbage', 'pothole', 'others'].includes(this.currentFilter)) {
      list = list.filter(c => c.category === this.currentFilter);
    } else if (['submitted', 'in_review', 'in_progress', 'resolved'].includes(this.currentFilter)) {
      list = list.filter(c => c.status === this.currentFilter);
    }

    if (this.currentStatus !== 'all') {
      list = list.filter(c => c.status === this.currentStatus);
    }

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
    this.renderTable();
    this.renderPagination();
  },

  renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.perPage;
    const items = this.filtered.slice(start, start + this.perPage);

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-14">
        <div class="w-14 h-14 mx-auto rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
          <i data-lucide="inbox" class="w-6 h-6 text-[#E21B2D]"></i>
        </div>
        <p class="text-[13.5px] font-semibold text-[#343A40]">No reports found</p>
        <p class="text-[12px] text-[#6b7280] mt-0.5">Try changing filters or search</p>
      </td></tr>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = items.map((c, i) => this.renderRow(c, start + i + 1)).join('');
    if (window.lucide) lucide.createIcons();

    tbody.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.view, 10);
        this.openComplaint(id);
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

    const provider = c.provider_name || '<span class="text-[#9ca3af]">Unassigned</span>';

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
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#1a1d21] text-white flex items-center justify-center text-[11.5px] font-bold flex-shrink-0">
              ${userInitial}
            </div>
            <div class="text-left min-w-0">
              <div class="text-[12px] font-semibold text-[#1a1d21] truncate">${this.esc(userName)}</div>
              <div class="text-[10.5px] text-[#9ca3af]">@${this.esc(c.username || '—')}</div>
            </div>
          </div>
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
        <td class="py-3 px-3">
          <button data-view="${c.id}"
                  class="inline-flex items-center gap-1.5 bg-[#E21B2D] hover:bg-[#c41525] text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
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

  // ═══ MODAL ═══
  initModals() {
    const modal = document.getElementById('complaintModal');
    const backdrop = modal?.querySelector('[data-backdrop]');
    const close = modal?.querySelector('[data-close]');
    if (backdrop) backdrop.addEventListener('click', () => this.closeModal());
    if (close) close.addEventListener('click', () => this.closeModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) this.closeModal();
    });
  },

  closeModal() {
    const modal = document.getElementById('complaintModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  },

  openModal() {
    const modal = document.getElementById('complaintModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    if (window.lucide) lucide.createIcons();
  },

  async openComplaint(id) {
    const c = this.all.find(x => x.id === id);
    if (!c) return;

    // Image
    const imgWrap = document.getElementById('cmImageWrap');
    const img = document.getElementById('cmImage');
    if (c.image_path) {
      img.src = `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`;
      imgWrap.classList.remove('hidden');
    } else {
      imgWrap.classList.add('hidden');
    }

    // Category
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

    // Status dropdown
    const statusSel = document.getElementById('cmStatus');
    statusSel.value = c.status;

    // Update handler
    document.getElementById('cmUpdateBtn').onclick = async () => {
      const newStatus = statusSel.value;
      if (newStatus === c.status) {
        this.toast('Please select a different status', 'error');
        return;
      }

      const btn = document.getElementById('cmUpdateBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Updating...</span>`;

      try {
        await API.put(`/provider/complaints/${c.id}/status`, {
          status: newStatus,
          remarks: `Status updated by myBMC to ${newStatus.replace('_',' ')}`
        });
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast('Status updated! User notified.', 'success');
        this.closeModal();
        await this.loadStats();
        await this.loadComplaints();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Update failed', 'error');
      }
    };

    // Send Message handler
    document.getElementById('cmMessageBtn').onclick = () => {
      this.toast('Direct messaging will be available soon', 'info');
    };

    this.openModal();
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

document.addEventListener('DOMContentLoaded', () => ProviderReports.init());
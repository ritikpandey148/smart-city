// frontend/js/admin-dashboard.js
// Admin Dashboard — real data, working filters, charts

const AdminDashboard = {
  user: null,
  allComplaints: [],
  filteredComplaints: [],
  stats: {},
  currentFilter: 'all',
  searchQuery: '',
  currentPage: 1,
  perPage: 5,
  chartReports: null,
  chartStatus: null,
  providersList: [],

  // ═══════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════
  async init() {
    this.user = await Guard.protect('admin');
    if (!this.user) return;

    Guard.startHeartbeat();

    this.renderAdminUser();
    this.initMenu();
    this.initLogout();
    this.initNotificationBell();
    this.initFilters();
    this.initSearch();
    this.initPagination();
    this.initNotificationForm();
    this.initViewModal();

    await this.loadProvidersList();
    await this.loadStats();
    await this.loadComplaints();
  },

  // ═══════════════════════════════════════════════
  // HEADER USER
  // ═══════════════════════════════════════════════
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
    } catch (e) { /* ignore */ }
  },

  // ═══════════════════════════════════════════════
  // LOAD STATS
  // ═══════════════════════════════════════════════
  async loadStats() {
    try {
      const res = await API.get('/admin/stats');
      this.stats = res.data || {};
      this.renderStats();
      this.renderStatusChart();
    } catch (err) {
      console.error('Stats load failed', err);
    }
  },

  renderStats() {
    const s = this.stats;
    const total = s.total_complaints || 0;
    const pct = (n) => total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statGarbage').textContent = s.garbage || 0;
    document.getElementById('statPothole').textContent = s.pothole || 0;
    document.getElementById('statOthers').textContent = s.others || 0;
    document.getElementById('statProgress').textContent = s.in_progress || 0;

    document.getElementById('pctGarbage').textContent = `${pct(s.garbage || 0)}% of total`;
    document.getElementById('pctPothole').textContent = `${pct(s.pothole || 0)}% of total`;
    document.getElementById('pctOthers').textContent = `${pct(s.others || 0)}% of total`;
    document.getElementById('pctProgress').textContent = `${pct(s.in_progress || 0)}% of total`;
  },

  renderStatusChart() {
    const s = this.stats;
    const ctx = document.getElementById('statusChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const data = {
      labels: ['Submitted', 'In Review', 'In Progress', 'Resolved'],
      datasets: [{
        data: [
          s.submitted || 0,
          s.in_review || 0,
          s.in_progress || 0,
          s.resolved || 0
        ],
        backgroundColor: ['#9ca3af', '#fbbf24', '#fb923c', '#22c55e'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    };

    if (this.chartStatus) this.chartStatus.destroy();

    this.chartStatus = new Chart(ctx, {
      type: 'doughnut',
      data: data,
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

    // Center label
    this.renderStatusLegend(s);
  },

  renderStatusLegend(s) {
    const total = s.total_complaints || 0;
    const legendWrap = document.getElementById('statusLegend');
    if (!legendWrap) return;

    const items = [
      { label: 'Submitted',   value: s.submitted || 0,   color: 'bg-gray-400' },
      { label: 'In Review',   value: s.in_review || 0,   color: 'bg-amber-400' },
      { label: 'In Progress', value: s.in_progress || 0, color: 'bg-orange-400' },
      { label: 'Resolved',    value: s.resolved || 0,    color: 'bg-green-500' }
    ];

    legendWrap.innerHTML = items.map(i => {
      const pct = total > 0 ? ((i.value / total) * 100).toFixed(1) : '0.0';
      return `
        <div class="flex items-center justify-between text-[12px]">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${i.color}"></span>
            <span class="text-[#4a5057]">${i.label}</span>
          </div>
          <span class="text-[#6b7280] font-medium">${i.value} (${pct}%)</span>
        </div>
      `;
    }).join('');

    const centerTotal = document.getElementById('statusCenterTotal');
    if (centerTotal) centerTotal.textContent = total;
  },

  // ═══════════════════════════════════════════════
  // LOAD COMPLAINTS
  // ═══════════════════════════════════════════════
  async loadComplaints() {
    const tbody = document.getElementById('complaintsBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="8" class="text-center py-10">
          <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
        </td></tr>`;
    }

    try {
      const res = await API.get('/admin/complaints');
      this.allComplaints = res.data || [];
      this.applyFilters();
      this.renderReportsChart();
    } catch (err) {
      console.error(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-red-500 text-[13px]">Failed to load complaints</td></tr>`;
    }
  },

  // ═══════════════════════════════════════════════
  // REPORTS OVERVIEW CHART (Last 30 days)
  // ═══════════════════════════════════════════════
  renderReportsChart() {
    const ctx = document.getElementById('reportsChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Build last 30 days bins
    const days = 30;
    const labels = [];
    const garbageData = [];
    const potholeData = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      garbageData.push(0);
      potholeData.push(0);
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    this.allComplaints.forEach(c => {
      const cd = new Date(c.submitted_at);
      cd.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - cd) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < days) {
        const idx = days - 1 - diffDays;
        if (c.category === 'garbage') garbageData[idx]++;
        else if (c.category === 'pothole') potholeData[idx]++;
      }
    });

    if (this.chartReports) this.chartReports.destroy();

    this.chartReports = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Garbage',
            data: garbageData,
            backgroundColor: '#E21B2D',
            borderRadius: 3,
            barThickness: 6,
            maxBarThickness: 8
          },
          {
            label: 'Potholes',
            data: potholeData,
            backgroundColor: '#343A40',
            borderRadius: 3,
            barThickness: 6,
            maxBarThickness: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d21',
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12, family: 'Poppins' },
            bodyFont: { size: 12, family: 'Poppins' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#9ca3af',
              font: { size: 10, family: 'Poppins' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6', drawBorder: false },
            ticks: {
              color: '#9ca3af',
              font: { size: 10, family: 'Poppins' },
              stepSize: 5,
              precision: 0
            }
          }
        }
      }
    });
  },

  // ═══════════════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════════════
  initFilters() {
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        const f = tab.dataset.filter;
        this.currentFilter = f;
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
    let list = [...this.allComplaints];

    // Category/status filter
    const catFilters = ['garbage', 'pothole', 'others'];
    const statusFilters = ['submitted', 'in_review', 'in_progress', 'resolved'];

    if (catFilters.includes(this.currentFilter)) {
      list = list.filter(c => c.category === this.currentFilter);
    } else if (statusFilters.includes(this.currentFilter)) {
      list = list.filter(c => c.status === this.currentFilter);
    }

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(c =>
        (c.complaint_id || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.locality || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q)
      );
    }

    this.filteredComplaints = list;
    this.renderTable();
    this.renderPagination();
  },

  // ═══════════════════════════════════════════════
  // TABLE
  // ═══════════════════════════════════════════════
  renderTable() {
    const tbody = document.getElementById('complaintsBody');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.perPage;
    const pageItems = this.filteredComplaints.slice(start, start + this.perPage);

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12">
            <div class="w-14 h-14 mx-auto rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
              <i data-lucide="inbox" class="w-6 h-6 text-[#E21B2D]"></i>
            </div>
            <p class="text-[13.5px] font-semibold text-[#343A40]">No complaints found</p>
            <p class="text-[12px] text-[#6b7280] mt-0.5">Try changing the filters or search</p>
          </td>
        </tr>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = pageItems.map((c, idx) => this.renderRow(c, start + idx + 1)).join('');
    if (window.lucide) lucide.createIcons();

    // Attach view buttons
    tbody.querySelectorAll('[data-view-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.viewId, 10);
        const complaint = this.allComplaints.find(c => c.id === id);
        if (complaint) this.openViewModal(complaint);
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

    const assignedTo = c.provider_name ? c.provider_name : '<span class="text-[#9ca3af]">Unassigned</span>';

    return `
      <tr class="border-b border-gray-50 hover:bg-[#fafbfc] transition-colors">
        <td class="py-3 px-3 text-[12.5px] text-[#6b7280] font-medium">${sl}</td>
        <td class="py-3 px-3">
          <img src="${img}" alt="" class="w-11 h-11 rounded-lg object-cover bg-gray-100" />
        </td>
        <td class="py-3 px-3 text-[12.5px] font-mono font-semibold text-[#1a1d21] whitespace-nowrap">${this.esc(c.complaint_id)}</td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold ${cat.cls} whitespace-nowrap">
            <i data-lucide="${cat.icon}" class="w-3 h-3"></i>
            ${cat.label}
          </span>
        </td>
        <td class="py-3 px-3 text-[12.5px] text-[#343A40] max-w-[200px]">
          <div class="truncate font-medium">${this.esc(c.title)}</div>
        </td>
        <td class="py-3 px-3 text-[12px] text-[#6b7280] whitespace-nowrap">${this.esc(c.locality || 'N/A')}</td>
        <td class="py-3 px-3 text-[11.5px] text-[#6b7280] whitespace-nowrap">
          <div>${dateStr}</div>
          <div>${timeStr}</div>
        </td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold ${st.cls} whitespace-nowrap">
            ${st.label}
          </span>
        </td>
        <td class="py-3 px-3 text-[11.5px] text-[#343A40]">${assignedTo}</td>
        <td class="py-3 px-3">
          <button data-view-id="${c.id}"
                  class="inline-flex items-center gap-1.5 bg-[#E21B2D] hover:bg-[#c41525] text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            View
          </button>
        </td>
      </tr>
    `;
  },

  // ═══════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════
  initPagination() {
    document.getElementById('pagePrev')?.addEventListener('click', () => {
      if (this.currentPage > 1) { this.currentPage--; this.renderTable(); this.renderPagination(); }
    });
    document.getElementById('pageNext')?.addEventListener('click', () => {
      const totalPages = Math.ceil(this.filteredComplaints.length / this.perPage);
      if (this.currentPage < totalPages) { this.currentPage++; this.renderTable(); this.renderPagination(); }
    });
  },

  renderPagination() {
    const totalPages = Math.max(1, Math.ceil(this.filteredComplaints.length / this.perPage));
    const start = (this.currentPage - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage * this.perPage, this.filteredComplaints.length);

    const showEl = document.getElementById('paginationInfo');
    if (showEl) {
      showEl.textContent = `Showing ${start} to ${end} of ${this.filteredComplaints.length} reports`;
    }

    const numsWrap = document.getElementById('pageNumbers');
    if (!numsWrap) return;

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

    numsWrap.innerHTML = html;
    numsWrap.querySelectorAll('[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        this.currentPage = parseInt(b.dataset.page, 10);
        this.renderTable();
        this.renderPagination();
      });
    });

    const prev = document.getElementById('pagePrev');
    const next = document.getElementById('pageNext');
    if (prev) prev.disabled = this.currentPage === 1;
    if (next) next.disabled = this.currentPage === totalPages;
  },

  // ═══════════════════════════════════════════════
  // NOTIFICATION FORM
  // ═══════════════════════════════════════════════
  initNotificationForm() {
    const form = document.getElementById('notifForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('notifTitle').value.trim();
      const message = document.getElementById('notifMessage').value.trim();
      const target = document.getElementById('notifTarget').value;
      const category = document.getElementById('notifCategory').value;

      if (!title || title.length < 3) { this.toast('Title must be at least 3 characters', 'error'); return; }
      if (!message || message.length < 5) { this.toast('Message must be at least 5 characters', 'error'); return; }

      const btn = document.getElementById('notifSendBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('opacity-90');
      btn.innerHTML = `<span class="spinner-sm"></span><span>Sending...</span>`;

      try {
        await API.post('/notifications/send', {
          title, message,
          target_type: target,
          category: category || null
        });
        btn.disabled = false;
        btn.classList.remove('opacity-90');
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        form.reset();
        this.toast('Notification sent successfully!', 'success');
      } catch (err) {
        btn.disabled = false;
        btn.classList.remove('opacity-90');
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Failed to send', 'error');
      }
    });
  },

  // ═══════════════════════════════════════════════
  // VIEW MODAL
  // ═══════════════════════════════════════════════
  initViewModal() {
    const modal = document.getElementById('viewModal');
    const backdrop = document.getElementById('modalBackdrop');
    const close = document.getElementById('modalClose');
    const closeBtn = document.getElementById('modalCloseBtn');

    const closeFn = () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    backdrop?.addEventListener('click', closeFn);
    close?.addEventListener('click', closeFn);
    closeBtn?.addEventListener('click', closeFn);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) closeFn();
    });
  },

  async loadProvidersList() {
    try {
      const res = await API.get('/admin/providers');
      this.providersList = res.data || [];
    } catch (e) {
      this.providersList = [];
    }
  },

  async openViewModal(c) {
    const modal = document.getElementById('viewModal');
    if (!modal) return;

    // Populate image
    const img = document.getElementById('modalImg');
    if (c.image_path) {
      img.src = `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`;
      img.parentElement.classList.remove('hidden');
    } else {
      img.parentElement.classList.add('hidden');
    }

    // Category chip
    const catMeta = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]' },
      others:  { label: 'Others',  cls: 'bg-purple-50 text-purple-600' }
    };
    const cat = catMeta[c.category] || catMeta.others;

    document.getElementById('modalCategory').textContent = cat.label;
    document.getElementById('modalCategory').className = `inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${cat.cls}`;

    document.getElementById('modalTitle').textContent = c.title;
    document.getElementById('modalComplaintId').textContent = c.complaint_id;
    document.getElementById('modalDesc').textContent = c.description || 'No description provided.';
    document.getElementById('modalLocality').textContent = c.locality || 'N/A';
    document.getElementById('modalPincode').textContent = c.pincode || '—';
    document.getElementById('modalNearby').textContent = c.nearby_address || '—';
    document.getElementById('modalUser').textContent = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'N/A';

    const dt = new Date(c.submitted_at);
    document.getElementById('modalDate').textContent = dt.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    // Status dropdown
    const statusSel = document.getElementById('modalStatus');
    statusSel.value = c.status;

    // Provider dropdown
    const provSel = document.getElementById('modalProvider');
    provSel.innerHTML = '<option value="">— Select Provider —</option>' +
      this.providersList.map(p => `<option value="${p.id}" ${c.assigned_provider_id === p.id ? 'selected' : ''}>${this.esc(p.name)} (${this.esc(p.category)})</option>`).join('');

    // Update handlers
    document.getElementById('modalUpdateBtn').onclick = async () => {
      const newStatus = statusSel.value;
      const newProv = provSel.value;

      const btn = document.getElementById('modalUpdateBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Updating...</span>`;

      try {
        if (newStatus !== c.status) {
          await API.put(`/admin/complaints/${c.id}/status`, {
            status: newStatus,
            remarks: 'Updated by admin via dashboard'
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
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
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
    document.getElementById('modalTrackBtn').onclick = () => {
      window.open(`../citizen/track-status.html?id=${c.id}`, '_blank');
    };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    if (window.lucide) lucide.createIcons();
  },

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════
  esc(s) {
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

document.addEventListener('DOMContentLoaded', () => AdminDashboard.init());
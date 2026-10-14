// frontend/js/provider-work-updates.js
// myBMC Provider — Work Updates + Status Update by Complaint ID

const ProviderWorkUpdates = {
  user: null,
  stats: {},
  updates: [],
  currentComplaint: null,
  chartPie: null,
  chartBar: null,

  async init() {
    this.user = await Guard.protect('provider');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderProviderInfo();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initLookupForm();
    this.initUpdateForm();
    this.initResetBtn();

    await this.loadStats();
    await this.loadRecentUpdates();
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

  // ═══ LOAD STATS ═══
  async loadStats() {
    try {
      const res = await API.get('/provider/work-stats');
      this.stats = res.data || {};
      this.renderStatCards();
      this.renderPieChart();
      this.renderBarChart();
    } catch (e) {
      console.error(e);
    }
  },

  renderStatCards() {
    const s = this.stats;
    document.getElementById('stTotal').textContent = s.total || 0;
    document.getElementById('stResolved').textContent = s.resolved || 0;
    document.getElementById('stProgress').textContent = s.in_progress || 0;
    document.getElementById('stReview').textContent = s.in_review || 0;
    document.getElementById('stToday').textContent = s.updated_today || 0;
    document.getElementById('st7Days').textContent = s.last_7_days || 0;
    document.getElementById('stResolvedToday').textContent = s.resolved_today || 0;
    document.getElementById('st30Days').textContent = s.last_30_days || 0;
  },

  renderPieChart() {
    const ctx = document.getElementById('pieChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const s = this.stats;
    const data = {
      labels: ['Garbage', 'Potholes', 'Others'],
      datasets: [{
        data: [s.garbage || 0, s.pothole || 0, s.others || 0],
        backgroundColor: ['#E21B2D', '#343A40', '#a855f7'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };

    if (this.chartPie) this.chartPie.destroy();

    this.chartPie = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
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

    // Legend
    const legendWrap = document.getElementById('pieLegend');
    if (legendWrap) {
      const total = (s.garbage || 0) + (s.pothole || 0) + (s.others || 0);
      const items = [
        { label: 'Garbage', value: s.garbage || 0, color: 'bg-[#E21B2D]' },
        { label: 'Potholes', value: s.pothole || 0, color: 'bg-[#343A40]' },
        { label: 'Others', value: s.others || 0, color: 'bg-purple-500' }
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
    }
  },

  renderBarChart() {
    const ctx = document.getElementById('barChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Last 7 days
    const days = 7;
    const labels = [];
    const resolvedData = [];
    const progressData = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      resolvedData.push(0);
      progressData.push(0);
    }

    const activity = this.stats.activity_last_7_days || [];
    activity.forEach(a => {
      const aDate = new Date(a.date);
      aDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - aDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < days) {
        const idx = days - 1 - diffDays;
        resolvedData[idx] = Number(a.resolved) || 0;
        progressData[idx] = Number(a.in_progress) || 0;
      }
    });

    if (this.chartBar) this.chartBar.destroy();

    this.chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Resolved',
            data: resolvedData,
            backgroundColor: '#22c55e',
            borderRadius: 4,
            barThickness: 12,
            maxBarThickness: 16
          },
          {
            label: 'In Progress',
            data: progressData,
            backgroundColor: '#fb923c',
            borderRadius: 4,
            barThickness: 12,
            maxBarThickness: 16
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              padding: 12,
              font: { size: 11, family: 'Poppins' },
              color: '#6b7280'
            }
          },
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
              font: { size: 10, family: 'Poppins' }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6', drawBorder: false },
            ticks: {
              color: '#9ca3af',
              font: { size: 10, family: 'Poppins' },
              precision: 0
            }
          }
        }
      }
    });
  },

  // ═══ RECENT UPDATES ═══
  async loadRecentUpdates() {
    const wrap = document.getElementById('recentUpdatesList');
    if (wrap) {
      wrap.innerHTML = `<div class="flex justify-center py-8">
        <span class="spinner" style="border-color:#fdd;border-top-color:#E21B2D"></span>
      </div>`;
    }

    try {
      const res = await API.get('/provider/recent-updates');
      this.updates = res.data || [];
      this.renderRecentUpdates();
    } catch (e) {
      if (wrap) wrap.innerHTML = `<div class="text-center py-6 text-[12.5px] text-[#9ca3af]">Failed to load updates</div>`;
    }
  },

  renderRecentUpdates() {
    const wrap = document.getElementById('recentUpdatesList');
    if (!wrap) return;

    if (this.updates.length === 0) {
      wrap.innerHTML = `
        <div class="text-center py-10">
          <div class="w-14 h-14 mx-auto rounded-full bg-[#ffe5e8] flex items-center justify-center mb-2">
            <i data-lucide="activity" class="w-6 h-6 text-[#E21B2D]"></i>
          </div>
          <p class="text-[13px] font-semibold text-[#343A40]">No updates yet</p>
          <p class="text-[11.5px] text-[#6b7280] mt-0.5">Your status changes will appear here</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    wrap.innerHTML = this.updates.map(u => this.renderUpdateItem(u)).join('');
    if (window.lucide) lucide.createIcons();
  },

  renderUpdateItem(u) {
    const statusMeta = {
      submitted:   { label: 'Submitted',   cls: 'bg-gray-100 text-gray-700' },
      in_review:   { label: 'In Review',   cls: 'bg-amber-50 text-amber-700' },
      in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600' },
      resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-700' }
    };
    const st = statusMeta[u.status] || statusMeta.submitted;

    const catMeta = {
      garbage: { label: 'Garbage', icon: 'trash-2', cls: 'text-[#E21B2D]' },
      pothole: { label: 'Pothole', icon: 'construction', cls: 'text-[#343A40]' },
      others:  { label: 'Others',  icon: 'layout-grid', cls: 'text-purple-600' }
    };
    const cat = catMeta[u.complaint_category] || catMeta.garbage;

    const dt = new Date(u.created_at);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User';

    return `
      <div class="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-[#fafbfc] transition-colors">
        <div class="w-10 h-10 rounded-full ${cat.cls.replace('text-', 'bg-').replace('-600', '-100').replace('-400', '-100')} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${cat.icon}" class="w-4.5 h-4.5 ${cat.cls}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <div class="text-[12.5px] text-[#343A40] leading-snug">
              You changed status to
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${st.cls} mx-0.5">${st.label}</span>
            </div>
            <span class="text-[10.5px] text-[#9ca3af] whitespace-nowrap">${dateStr} • ${timeStr}</span>
          </div>
          <div class="flex items-center gap-2 mt-1.5">
            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${cat.cls}"></i>
            <span class="text-[11.5px] font-mono font-bold text-[#1a1d21]">${this.esc(u.complaint_ref || '—')}</span>
            <span class="text-[11.5px] text-[#6b7280] truncate">${this.esc(u.complaint_title || '')}</span>
          </div>
          <div class="text-[10.5px] text-[#9ca3af] mt-1">Reported by <span class="font-semibold text-[#6b7280]">${this.esc(userName)}</span></div>
          ${u.remarks ? `<div class="text-[10.5px] text-[#9ca3af] mt-1 italic">"${this.esc(u.remarks)}"</div>` : ''}
        </div>
      </div>
    `;
  },

  // ═══ LOOKUP FORM ═══
  initLookupForm() {
    const form = document.getElementById('lookupForm');
    const input = document.getElementById('complaintIdInput');

    input?.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
      this.clearLookupError();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cid = input.value.trim().toUpperCase();
      if (!cid) {
        this.showLookupError('Please enter a Complaint ID');
        return;
      }
      if (!/^SC-\d{4}-\d+$/i.test(cid)) {
        this.showLookupError('Invalid format. Use SC-YYYY-NNNN (e.g. SC-2026-0001)');
        return;
      }

      const btn = document.getElementById('lookupBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm" style="border-color:#fdd;border-top-color:#E21B2D"></span><span>Looking up...</span>`;

      try {
        const res = await API.get(`/provider/lookup-complaint/${cid}`);
        this.currentComplaint = res.data;
        this.renderComplaintPreview(res.data);
        this.showUpdateForm();
        this.toast('Complaint found', 'success');
      } catch (err) {
        this.showLookupError(err.message || 'Complaint not found');
        this.hideUpdateForm();
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
      }
    });
  },

  showLookupError(msg) {
    const el = document.getElementById('lookupError');
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
    }
    document.getElementById('complaintIdInput')?.classList.add('border-red-500');
  },

  clearLookupError() {
    const el = document.getElementById('lookupError');
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
    document.getElementById('complaintIdInput')?.classList.remove('border-red-500');
  },

  renderComplaintPreview(c) {
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
    const ds = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const ts = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    document.getElementById('complaintPreview').innerHTML = `
      <div class="flex items-start gap-3.5">
        <img src="${img}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.cls}">
              <i data-lucide="${cat.icon}" class="w-2.5 h-2.5"></i> ${cat.label}
            </span>
            <span class="text-[11px] font-mono font-bold text-[#E21B2D]">${this.esc(c.complaint_id)}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}">${st.label}</span>
          </div>
          <h4 class="text-[13.5px] font-semibold text-[#1a1d21] leading-snug">${this.esc(c.title)}</h4>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#6b7280]">
            <span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${this.esc(c.locality || '—')}</span>
            <span class="flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i> ${this.esc((c.first_name || '') + ' ' + (c.last_name || ''))}</span>
            <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${ds} • ${ts}</span>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    document.getElementById('complaintPreview').classList.remove('hidden');
  },

  // ═══ UPDATE FORM ═══
  showUpdateForm() {
    const wrap = document.getElementById('updateFormWrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    // Prefill current status
    document.getElementById('newStatus').value = this.currentComplaint.status;
    document.getElementById('updateRemarks').value = '';
    this.clearUpdateError();
  },

  hideUpdateForm() {
    const wrap = document.getElementById('updateFormWrap');
    if (wrap) wrap.classList.add('hidden');
  },

  initUpdateForm() {
    document.getElementById('updateStatusBtn')?.addEventListener('click', async () => {
      if (!this.currentComplaint) return;

      const newStatus = document.getElementById('newStatus').value;
      const remarks = document.getElementById('updateRemarks').value.trim();

      if (newStatus === this.currentComplaint.status) {
        this.showUpdateError('Please select a different status');
        return;
      }

      const btn = document.getElementById('updateStatusBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Updating...</span>`;

      try {
        const res = await API.post('/provider/update-status-by-cid', {
          complaint_id: this.currentComplaint.complaint_id,
          status: newStatus,
          remarks: remarks || null
        });

        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();

        this.toast('Status updated! User notified.', 'success');

        // Reset the form
        this.currentComplaint = null;
        document.getElementById('complaintIdInput').value = '';
        document.getElementById('complaintPreview').classList.add('hidden');
        this.hideUpdateForm();

        // Refresh data
        await this.loadStats();
        await this.loadRecentUpdates();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.showUpdateError(err.message || 'Update failed');
      }
    });
  },

  showUpdateError(msg) {
    const el = document.getElementById('updateError');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  },

  clearUpdateError() {
    const el = document.getElementById('updateError');
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  },

  initResetBtn() {
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      this.currentComplaint = null;
      document.getElementById('complaintIdInput').value = '';
      document.getElementById('complaintPreview').classList.add('hidden');
      this.hideUpdateForm();
      this.clearLookupError();
      this.clearUpdateError();
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

document.addEventListener('DOMContentLoaded', () => ProviderWorkUpdates.init());
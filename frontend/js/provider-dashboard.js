// frontend/js/provider-dashboard.js
// myBMC Provider Dashboard

const ProviderDashboard = {
  user: null,
  stats: {},
  complaints: [],
  notifications: [],
  adminInfo: null,

  async init() {
    this.user = await Guard.protect('provider');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderProviderInfo();
    this.initMenu();
    this.initLogout();
    this.initNotificationForm();
    this.initFilters();

    await this.loadStats();
    await this.loadComplaints();
    await this.loadNotifications();
  },

  renderProviderInfo() {
    const u = this.user;
    const name = u.name || 'myBMC Mumbai';
    document.getElementById('providerName').textContent = name;
    document.getElementById('providerCategory').textContent = (u.category === 'all' ? 'All Categories' : u.category || 'All');
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

  // ═══ STATS ═══
  async loadStats() {
    try {
      const res = await API.get('/provider/stats');
      this.stats = res.data || {};

      const s = this.stats;
      document.getElementById('statTotal').textContent = s.total_assigned || 0;
      document.getElementById('statGarbage').textContent = s.garbage || 0;
      document.getElementById('statPothole').textContent = s.pothole || 0;
      document.getElementById('statOthers').textContent = s.others || 0;
      document.getElementById('statProgress').textContent = s.in_progress || 0;
      document.getElementById('statResolved').textContent = s.resolved || 0;

      // Sidebar counts
      document.getElementById('sideAssignedCount').textContent = s.total_assigned || 0;
      document.getElementById('sideGarbageCount').textContent = s.garbage || 0;
      document.getElementById('sidePotholeCount').textContent = s.pothole || 0;
      document.getElementById('sideOthersCount').textContent = s.others || 0;
    } catch (e) {
      console.error(e);
    }
  },

  // ═══ COMPLAINTS ═══
  async loadComplaints() {
    try {
      const res = await API.get('/provider/complaints');
      this.complaints = res.data || [];
      this.renderCategorySections();
    } catch (e) {
      console.error(e);
    }
  },

  initFilters() {
    document.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        document.querySelectorAll('[data-cat]').forEach(b => {
          b.classList.remove('bg-[#E21B2D]', 'text-white');
          b.classList.add('bg-white', 'text-[#343A40]', 'border', 'border-gray-200');
        });
        btn.classList.add('bg-[#E21B2D]', 'text-white');
        btn.classList.remove('bg-white', 'text-[#343A40]', 'border', 'border-gray-200');
        this.renderCategorySections(cat);
      });
    });
  },

  renderCategorySections(filterCat = 'all') {
    const wrap = document.getElementById('categorySections');
    if (!wrap) return;

    const categories = [
      { key: 'garbage', label: 'Latest Garbage Reports', icon: 'trash-2', colorCls: 'text-[#E21B2D]', bgCls: 'bg-[#ffe5e8]' },
      { key: 'pothole', label: 'Latest Pothole Reports', icon: 'construction', colorCls: 'text-[#343A40]', bgCls: 'bg-gray-100' },
      { key: 'others',  label: 'Latest Other Reports',   icon: 'layout-grid', colorCls: 'text-purple-600', bgCls: 'bg-purple-50' }
    ];

    let html = '';

    categories.forEach(cat => {
      if (filterCat !== 'all' && filterCat !== cat.key) return;

      const list = this.complaints
        .filter(c => c.category === cat.key)
        .slice(0, 3);

      const catAll = this.complaints.filter(c => c.category === cat.key);
      const catInProgress = catAll.filter(c => c.status === 'in_progress').length;
      const catResolved = catAll.filter(c => c.status === 'resolved').length;

      html += `
        <div class="bg-white rounded-2xl p-5 border border-gray-100">
          <!-- Section head -->
          <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg ${cat.bgCls} flex items-center justify-center">
                <i data-lucide="${cat.icon}" class="w-4 h-4 ${cat.colorCls}"></i>
              </div>
              <h3 class="text-[15px] font-bold text-[#1a1d21]">${cat.label}</h3>
            </div>

            <div class="flex items-center gap-2 text-[11px]">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f6f7] text-[#343A40] font-semibold">
                ${catAll.length} Total
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-semibold">
                ${catInProgress} In Progress
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                ${catResolved} Resolved
              </span>
              <a href="reports.html?cat=${cat.key}" class="text-[#E21B2D] hover:underline font-semibold ml-1">View All →</a>
            </div>
          </div>

          <!-- List -->
          ${list.length === 0 ? `
            <div class="text-center py-6 text-[12.5px] text-[#9ca3af]">No reports yet</div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              ${list.map(c => this.renderComplaintCard(c)).join('')}
            </div>
          `}
        </div>
      `;
    });

    wrap.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Attach view buttons
    wrap.querySelectorAll('[data-view-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.viewId, 10);
        window.location.href = `reports.html?view=${id}`;
      });
    });
  },

  renderComplaintCard(c) {
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
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    return `
      <div class="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
        <div class="relative h-28 overflow-hidden bg-gray-100">
          <img src="${img}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <span class="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${st.cls}">
            ${st.label}
          </span>
        </div>
        <div class="p-3">
          <div class="text-[10.5px] font-mono text-[#E21B2D] font-bold">${this.esc(c.complaint_id)}</div>
          <div class="text-[12.5px] font-semibold text-[#1a1d21] mt-1 line-clamp-2 leading-snug">${this.esc(c.title)}</div>
          <div class="flex items-center gap-1.5 mt-2 text-[10.5px] text-[#6b7280]">
            <i data-lucide="map-pin" class="w-3 h-3"></i>
            <span class="truncate">${this.esc(c.locality || 'N/A')}</span>
            <span class="text-gray-300">•</span>
            <span>${dateStr}</span>
          </div>
          <button data-view-id="${c.id}" class="mt-3 w-full flex items-center justify-center gap-1.5 bg-[#f5f6f7] hover:bg-[#E21B2D] hover:text-white text-[#343A40] text-[11px] font-semibold py-1.5 rounded-lg transition-colors">
            <i data-lucide="eye" class="w-3 h-3"></i>
            View Details
          </button>
        </div>
      </div>
    `;
  },

  // ═══ NOTIFICATIONS ═══
  async loadNotifications() {
    try {
      const res = await API.get('/provider/notifications');
      this.notifications = (res.data || []).slice(0, 4);
      this.renderNotifications();
    } catch (e) {
      console.error(e);
    }
  },

  renderNotifications() {
    const wrap = document.getElementById('recentNotifications');
    if (!wrap) return;

    if (this.notifications.length === 0) {
      wrap.innerHTML = `<div class="text-center py-6 text-[12px] text-[#9ca3af]">No notifications yet</div>`;
      return;
    }

    wrap.innerHTML = this.notifications.map(n => {
      const dt = new Date(n.created_at);
      const ds = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const isUnread = !n.is_read;

      let icon = 'bell', iconBg = 'bg-[#ffe5e8]', iconColor = 'text-[#E21B2D]';
      if (n.sender_role === 'admin') { icon = 'shield-check'; iconBg = 'bg-red-100'; iconColor = 'text-[#E21B2D]'; }
      if (n.sender_role === 'system') { icon = 'clipboard-list'; iconBg = 'bg-purple-100'; iconColor = 'text-purple-600'; }

      return `
        <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-[#fafbfc] transition-colors border ${isUnread ? 'border-[#fdd] bg-[#fafbfc]' : 'border-transparent'}">
          <div class="w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0">
            <i data-lucide="${icon}" class="w-4 h-4 ${iconColor}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="text-[12.5px] font-semibold text-[#1a1d21] leading-snug truncate">${this.esc(n.title)}</div>
              <span class="text-[10px] text-[#9ca3af] whitespace-nowrap">${ds}</span>
            </div>
            <div class="text-[11.5px] text-[#6b7280] mt-0.5 line-clamp-2 leading-snug">${this.esc(n.message)}</div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  // ═══ SEND NOTIFICATION ═══
  initNotificationForm() {
    const form = document.getElementById('notifForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('notifTitle').value.trim();
      const message = document.getElementById('notifMessage').value.trim();
      const target = document.getElementById('notifTarget').value;
      const category = document.getElementById('notifCategory').value;

      if (title.length < 3) { this.toast('Title must be at least 3 characters', 'error'); return; }
      if (message.length < 5) { this.toast('Message must be at least 5 characters', 'error'); return; }

      const btn = document.getElementById('notifSendBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Sending...</span>`;

      try {
        await API.post('/provider/notifications', {
          title, message,
          target_type: target === 'admin' ? 'admin' : 'all',
          category: category || null
        });
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        form.reset();
        this.toast('Notification sent!', 'success');
        await this.loadNotifications();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Failed', 'error');
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

document.addEventListener('DOMContentLoaded', () => ProviderDashboard.init());
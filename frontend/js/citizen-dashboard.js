// frontend/js/citizen-dashboard.js
// Citizen Dashboard logic

const CitizenDashboard = {
  user: null,

  async init() {
    // Guard — only citizen
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();

    this.renderUser();
    this.initLogout();
    await this.loadStats();
    await this.loadRecentComplaints();
    this.initMenu();
  },

  // ─── Render user info in header + sidebar ───
  renderUser() {
    const firstName = this.user.first_name || 'Citizen';
    const initial = firstName.charAt(0).toUpperCase();

    const nameEl = document.getElementById('userFirstName');
    if (nameEl) nameEl.textContent = firstName;

    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) avatarEl.textContent = initial;

    // Sidebar footer / menu
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim();

    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarRole) sidebarRole.textContent = 'Citizen';
  },

  // ─── Load stats ───
  async loadStats() {
    try {
      const res = await API.get('/complaints/stats/my');
      const s = res.data || {};

      document.getElementById('statTotal').textContent = s.total || 0;
      document.getElementById('statGarbage').textContent = s.garbage || 0;
      document.getElementById('statPothole').textContent = s.pothole || 0;
      document.getElementById('statOthers').textContent = s.others || 0;
    } catch (err) {
      console.error('Stats load failed:', err);
      // keep zeros
    }
  },

  // ─── Load recent complaints ───
  async loadRecentComplaints() {
    const container = document.getElementById('recentComplaintsList');
    const emptyState = document.getElementById('recentComplaintsEmpty');
    if (!container) return;

    try {
      const res = await API.get('/complaints/my');
      const list = (res.data || []).slice(0, 3);

      if (list.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
      }

      if (emptyState) emptyState.classList.add('hidden');

      container.innerHTML = list.map(c => this.renderComplaintRow(c)).join('');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Recent complaints failed:', err);
      if (emptyState) emptyState.classList.remove('hidden');
    }
  },

  renderComplaintRow(c) {
    const statusMap = {
      submitted: { label: 'Pending', cls: 'bg-pink-100 text-[#E21B2D]' },
      in_review: { label: 'In Review', cls: 'bg-yellow-100 text-yellow-700' },
      in_progress: { label: 'In Progress', cls: 'bg-orange-100 text-orange-600' },
      resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700' }
    };
    const st = statusMap[c.status] || statusMap.submitted;

    const img = c.image_path
      ? `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`
      : 'assets/images/sidebar-city.png'; // fallback

    const date = new Date(c.submitted_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `
      <div class="flex items-center gap-4 p-3 sm:p-4 rounded-xl hover:bg-[#fafbfc] transition-colors cursor-pointer group"
           onclick="window.location.href='track-status.html?id=${c.id}'">
        <img src="${img}" alt="" class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-[14px] sm:text-[15px] text-[#1a1d21] truncate">${this.escapeHtml(c.title)}</h4>
          <div class="flex items-center gap-1.5 mt-1 text-[12px] text-[#6b7280]">
            <i data-lucide="map-pin" class="w-3 h-3"></i>
            <span class="truncate">${this.escapeHtml(c.locality || c.location || 'N/A')}</span>
          </div>
        </div>
        <div class="hidden sm:block text-right text-[12px] text-[#6b7280] whitespace-nowrap">
          <div>${dateStr}</div>
          <div>${timeStr}</div>
        </div>
        <span class="px-3 py-1.5 rounded-full text-[11px] font-semibold ${st.cls} whitespace-nowrap">${st.label}</span>
        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-[#E21B2D] group-hover:translate-x-1 transition-all"></i>
      </div>
    `;
  },

  escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  },

  // ─── Sidebar / hamburger menu ───
  initMenu() {
    const toggle = document.getElementById('menuToggle');
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const close = document.getElementById('drawerClose');

    const open = () => {
      drawer?.classList.remove('-translate-x-full');
      backdrop?.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    };
    const closeFn = () => {
      drawer?.classList.add('-translate-x-full');
      backdrop?.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };

    toggle?.addEventListener('click', open);
    close?.addEventListener('click', closeFn);
    backdrop?.addEventListener('click', closeFn);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFn(); });
  },

  // ─── Logout ───
  initLogout() {
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await API.post('/auth/logout'); } catch (e) {}
        API.clearToken();
        window.location.href = '/login.html';
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => CitizenDashboard.init());
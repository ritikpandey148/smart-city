// frontend/js/complaints.js
// My Complaints page logic

const ComplaintsPage = {
  user: null,
  allComplaints: [],
  currentFilter: 'all',

  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initFilters();
    this.initModal();

    await this.loadData();
  },

  // ═══ HEADER ═══
  renderUser() {
    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
  },

  // ═══ MENU ═══
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
        const filter = tab.dataset.filter;
        this.currentFilter = filter;

        // Active state
        document.querySelectorAll('[data-filter]').forEach(t => {
          t.classList.remove('bg-[#E21B2D]', 'text-white', 'shadow-md');
          t.classList.add('text-[#4a5057]', 'hover:bg-gray-50');
        });
        tab.classList.add('bg-[#E21B2D]', 'text-white', 'shadow-md');
        tab.classList.remove('text-[#4a5057]', 'hover:bg-gray-50');

        this.renderList();
      });
    });
  },

  // ═══ LOAD DATA ═══
  async loadData() {
    try {
      const [listRes, statsRes] = await Promise.all([
        API.get('/complaints/my'),
        API.get('/complaints/stats/my')
      ]);

      this.allComplaints = listRes.data || [];
      this.renderStats(statsRes.data || {});
      this.updateTabCounts();
      this.renderList();
    } catch (err) {
      console.error(err);
      this.toast('Could not load complaints', 'error');
      this.showEmptyState();
    }
  },

  // ═══ STATS ═══
  renderStats(s) {
    const total = s.total || 0;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statGarbage').textContent = s.garbage || 0;
    document.getElementById('statPothole').textContent = s.pothole || 0;
    document.getElementById('statOthers').textContent = s.others || 0;

    // percentages
    const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
    const gp = document.getElementById('statGarbagePct');
    const pp = document.getElementById('statPotholePct');
    const op = document.getElementById('statOthersPct');
    if (gp) gp.textContent = `${pct(s.garbage || 0)}% of total`;
    if (pp) pp.textContent = `${pct(s.pothole || 0)}% of total`;
    if (op) op.textContent = `${pct(s.others || 0)}% of total`;
  },

  updateTabCounts() {
    const total = this.allComplaints.length;
    const garbage = this.allComplaints.filter(c => c.category === 'garbage').length;
    const pothole = this.allComplaints.filter(c => c.category === 'pothole').length;
    const others = this.allComplaints.filter(c => c.category === 'others').length;

    document.getElementById('tabAllCount').textContent = total;
    document.getElementById('tabGarbageCount').textContent = garbage;
    document.getElementById('tabPotholeCount').textContent = pothole;
    document.getElementById('tabOthersCount').textContent = others;
  },

  // ═══ RENDER LIST ═══
  renderList() {
    const container = document.getElementById('complaintsList');
    const emptyEl = document.getElementById('emptyState');
    if (!container) return;

    let list = this.allComplaints;
    if (this.currentFilter !== 'all') {
      list = list.filter(c => c.category === this.currentFilter);
    }

    if (list.length === 0) {
      container.innerHTML = '';
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');

    container.innerHTML = list.map(c => this.renderCard(c)).join('');
    if (window.lucide) lucide.createIcons();

    // Attach click handlers
    container.querySelectorAll('[data-complaint-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.complaintId, 10);
        const complaint = this.allComplaints.find(c => c.id === id);
        if (complaint) this.openModal(complaint);
      });
    });
  },

  renderCard(c) {
    const catMeta = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]', icon: 'trash-2' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]', icon: 'construction' },
      others:  { label: 'Others',  cls: 'bg-[#fff0f2] text-[#E21B2D]', icon: 'layout-grid' }
    };
    const cat = catMeta[c.category] || catMeta.others;

    const statusMeta = {
      submitted:   { label: 'Open',         cls: 'bg-red-50 text-red-600',      icon: 'alert-circle' },
      in_review:   { label: 'Under Review', cls: 'bg-amber-50 text-amber-600',  icon: 'clock' },
      in_progress: { label: 'In Progress',  cls: 'bg-blue-50 text-blue-600',    icon: 'loader' },
      resolved:    { label: 'Resolved',     cls: 'bg-green-50 text-green-600',  icon: 'check-circle-2' }
    };
    const st = statusMeta[c.status] || statusMeta.submitted;

    const img = c.image_path
      ? `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`
      : '../assets/images/sidebar-city.png';

    const date = new Date(c.submitted_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const location = `${c.locality || c.location || 'N/A'}${c.locality ? ', Mumbai' : ''}`;

    return `
      <div data-complaint-id="${c.id}"
           class="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer
                  p-3 sm:p-4 flex items-center gap-3 sm:gap-4 border border-transparent hover:border-[#E21B2D]/15">
        <img src="${img}" alt=""
             class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 bg-gray-100" />

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${cat.cls}">
              <i data-lucide="${cat.icon}" class="w-3 h-3"></i>
              ${cat.label}
            </span>
          </div>
          <h3 class="font-semibold text-[14.5px] sm:text-[15.5px] text-[#1a1d21] truncate">${this.escape(c.title)}</h3>
          <div class="flex items-center gap-1 mt-1 text-[12px] text-[#6b7280]">
            <i data-lucide="map-pin" class="w-3 h-3 flex-shrink-0"></i>
            <span class="truncate">${this.escape(location)}</span>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 mt-1 text-[12px] text-[#6b7280]">
            <i data-lucide="calendar" class="w-3 h-3"></i>
            <span>${dateStr}</span>
            <span class="text-gray-300">•</span>
            <span>${timeStr}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold ${st.cls}">
            <i data-lucide="${st.icon}" class="w-3.5 h-3.5"></i>
            ${st.label}
          </span>
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f5f6f7] group-hover:bg-[#E21B2D] flex items-center justify-center transition-colors">
            <i data-lucide="chevron-right" class="w-4 h-4 text-[#4a5057] group-hover:text-white transition-colors"></i>
          </div>
        </div>
      </div>
    `;
  },

  showEmptyState() {
    const container = document.getElementById('complaintsList');
    const emptyEl = document.getElementById('emptyState');
    if (container) container.innerHTML = '';
    emptyEl?.classList.remove('hidden');
  },

  // ═══ MODAL ═══
  initModal() {
    const modal = document.getElementById('complaintModal');
    const backdrop = document.getElementById('modalBackdrop');
    const closeBtn = document.getElementById('modalClose');

    const closeFn = () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    backdrop?.addEventListener('click', closeFn);
    closeBtn?.addEventListener('click', closeFn);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) closeFn();
    });
  },

  openModal(c) {
    const modal = document.getElementById('complaintModal');
    if (!modal) return;

    // Fill content
    document.getElementById('modalComplaintId').textContent = c.complaint_id;
    document.getElementById('modalTitle').textContent = c.title;
    document.getElementById('modalDate').textContent =
      new Date(c.submitted_at).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    document.getElementById('modalLocality').textContent = c.locality || 'N/A';
    document.getElementById('modalPincode').textContent = c.pincode || '—';
    document.getElementById('modalDescription').textContent = c.description || 'No description provided.';

    // Category chip
    const catMeta = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]' },
      others:  { label: 'Others',  cls: 'bg-[#fff0f2] text-[#E21B2D]' }
    };
    const cat = catMeta[c.category] || catMeta.others;
    const catEl = document.getElementById('modalCategory');
    catEl.textContent = cat.label;
    catEl.className = `px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${cat.cls}`;

    // Status chip
    const statusMeta = {
      submitted:   { label: 'Open',         cls: 'bg-red-50 text-red-600' },
      in_review:   { label: 'Under Review', cls: 'bg-amber-50 text-amber-600' },
      in_progress: { label: 'In Progress',  cls: 'bg-blue-50 text-blue-600' },
      resolved:    { label: 'Resolved',     cls: 'bg-green-50 text-green-600' }
    };
    const st = statusMeta[c.status] || statusMeta.submitted;
    const stEl = document.getElementById('modalStatus');
    stEl.textContent = st.label;
    stEl.className = `px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${st.cls}`;

    // Image
    const imgEl = document.getElementById('modalImage');
    if (c.image_path) {
      imgEl.src = `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`;
      imgEl.parentElement.classList.remove('hidden');
    } else {
      imgEl.parentElement.classList.add('hidden');
    }

    // Store current complaint for actions
    this._currentComplaint = c;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    if (window.lucide) lucide.createIcons();
  },

  // ═══ COPY / SHARE ═══
  initModalActions() {
    document.getElementById('copyIdBtn')?.addEventListener('click', () => {
      const id = this._currentComplaint?.complaint_id;
      if (!id) return;
      navigator.clipboard.writeText(id).then(() => {
        this.toast('Complaint ID copied!', 'success');
        const btn = document.getElementById('copyIdBtn');
        const original = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
        if (window.lucide) lucide.createIcons();
        setTimeout(() => { btn.innerHTML = original; if (window.lucide) lucide.createIcons(); }, 1400);
      }).catch(() => this.toast('Could not copy', 'error'));
    });

    document.getElementById('shareIdBtn')?.addEventListener('click', async () => {
      const c = this._currentComplaint;
      if (!c) return;
      const shareText = `SMART CITY Complaint ${c.complaint_id}: "${c.title}" — Status: ${c.status}`;
      const shareUrl = window.location.origin + '/citizen/track-status.html?id=' + c.id;
      const shareData = { title: 'SMART CITY Complaint', text: shareText, url: shareUrl };

      if (navigator.share) {
        try { await navigator.share(shareData); }
        catch (e) { /* user cancelled */ }
      } else {
        // Fallback — copy link
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
          this.toast('Complaint link copied!', 'success');
        });
      }
    });

    document.getElementById('trackFullBtn')?.addEventListener('click', () => {
      const c = this._currentComplaint;
      if (!c) return;
      window.location.href = `track-status.html?id=${c.id}`;
    });
  },

  // ═══ HELPERS ═══
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

document.addEventListener('DOMContentLoaded', () => {
  ComplaintsPage.init();
  ComplaintsPage.initModalActions();
});
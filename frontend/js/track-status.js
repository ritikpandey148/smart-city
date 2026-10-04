// frontend/js/track-status.js
// Track Status page logic

const TrackPage = {
  user: null,
  currentComplaint: null,
  currentHistory: [],
  map: null,
  marker: null,

  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initSearchForm();
    this.initRefreshBtn();
    this.initCopyBtn();

    // Auto-track if ?id=X present
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const cid = urlParams.get('cid');
    if (id) {
      document.getElementById('trackInput').value = id;
      this.trackById(id);
    } else if (cid) {
      document.getElementById('trackInput').value = cid;
      this.trackByComplaintId(cid);
    }
  },

  renderUser() {
    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
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
      window.location.href = 'complaints.html';
    });
  },

  initRefreshBtn() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      if (this.currentComplaint) {
        this.trackById(this.currentComplaint.id);
      }
    });
  },

  initCopyBtn() {
    document.getElementById('copyComplaintIdBtn')?.addEventListener('click', () => {
      const id = this.currentComplaint?.complaint_id;
      if (!id) return;
      navigator.clipboard.writeText(id).then(() => {
        this.toast('Complaint ID copied!', 'success');
        const btn = document.getElementById('copyComplaintIdBtn');
        const original = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
        if (window.lucide) lucide.createIcons();
        setTimeout(() => { btn.innerHTML = original; if (window.lucide) lucide.createIcons(); }, 1400);
      });
    });
  },

  initSearchForm() {
    const form = document.getElementById('trackForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('trackInput');
      const value = input.value.trim();

      if (!value) {
        this.showSearchError('Please enter a Complaint ID');
        return;
      }
      this.clearSearchError();

      if (/^SC-\d{4}-\d+$/i.test(value)) {
        this.trackByComplaintId(value.toUpperCase());
      } else if (/^\d+$/.test(value)) {
        this.trackById(value);
      } else {
        this.showSearchError('Invalid format. Use SC-YYYY-NNNN or numeric ID.');
      }
    });
  },

  showSearchError(msg) {
    const el = document.getElementById('searchError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('trackInput')?.classList.add('border-red-500');
  },

  clearSearchError() {
    const el = document.getElementById('searchError');
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
    document.getElementById('trackInput')?.classList.remove('border-red-500');
  },

  setLoading(loading) {
    const btn = document.getElementById('trackBtn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span><span>Searching...</span>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="search" class="w-4 h-4"></i><span>Track Complaint</span>`;
      if (window.lucide) lucide.createIcons();
    }
  },

  async trackById(id) {
    this.setLoading(true);
    this.hideResult();
    this.hideEmptyState();

    try {
      const [complaintRes, historyRes] = await Promise.all([
        API.get(`/complaints/${id}`),
        API.get(`/complaints/${id}/history`)
      ]);

      this.currentComplaint = complaintRes.data;
      this.currentHistory = historyRes.data || [];
      this.renderResult();
    } catch (err) {
      const msg = err.message || 'Could not fetch complaint';
      this.showSearchError(msg);
      this.showEmptyState(msg);
    } finally {
      this.setLoading(false);
    }
  },

  async trackByComplaintId(complaintId) {
    this.setLoading(true);
    this.hideResult();
    this.hideEmptyState();

    try {
      const res = await API.get(`/complaints/track/${complaintId}`);
      this.currentComplaint = res.data.complaint;
      this.currentHistory = res.data.history || [];
      this.renderResult();
    } catch (err) {
      const msg = err.message || 'Could not fetch complaint';
      this.showSearchError(msg);
      this.showEmptyState(msg);
    } finally {
      this.setLoading(false);
    }
  },

  hideResult() {
    document.getElementById('trackResult')?.classList.add('hidden');
  },
  showResult() {
    document.getElementById('trackResult')?.classList.remove('hidden');
  },
  hideEmptyState() {
    document.getElementById('emptyState')?.classList.add('hidden');
  },
  showEmptyState(msg) {
    const el = document.getElementById('emptyState');
    const msgEl = document.getElementById('emptyStateMsg');
    if (el) el.classList.remove('hidden');
    if (msgEl && msg) msgEl.textContent = msg;
  },

  renderResult() {
    const c = this.currentComplaint;
    if (!c) return;

    this.showResult();
    this.renderHeader(c);
    this.renderTimeline(c);
    this.renderUpdates(c);
    this.renderImage(c);
    this.renderLocation(c);
    this.renderDetails(c);

    setTimeout(() => this.initMap(c), 100);
    if (window.lucide) lucide.createIcons();

    // Scroll to result
    setTimeout(() => {
      document.getElementById('trackResult')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  },

  renderHeader(c) {
    const catMeta = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]', icon: 'trash-2' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]', icon: 'construction' },
      others:  { label: 'Others',  cls: 'bg-[#fff0f2] text-[#E21B2D]', icon: 'layout-grid' }
    };
    const cat = catMeta[c.category] || catMeta.others;

    const img = c.image_path
      ? `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`
      : '../assets/images/sidebar-city.png';

    document.getElementById('headerImage').src = img;
    document.getElementById('headerTitle').textContent = c.title;
    document.getElementById('headerCategory').innerHTML = `
      <i data-lucide="${cat.icon}" class="w-3 h-3"></i>
      <span>${cat.label}</span>
    `;
    document.getElementById('headerCategory').className = `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${cat.cls}`;

    const location = `${c.locality || c.location || 'N/A'}, Mumbai`;
    document.getElementById('headerLocation').textContent = location;

    const dt = new Date(c.submitted_at);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    document.getElementById('headerDate').textContent = `Submitted on ${dateStr} • ${timeStr}`;

    document.getElementById('headerComplaintId').textContent = c.complaint_id;
  },

  renderTimeline(c) {
    const container = document.getElementById('timelineContainer');
    if (!container) return;

    const histMap = {};
    this.currentHistory.forEach(h => {
      if (!histMap[h.status]) histMap[h.status] = h;
    });

    const steps = ['submitted', 'in_review', 'in_progress', 'resolved'];
    const labels = {
      submitted: 'Submitted',
      in_review: 'In Review',
      in_progress: 'In Progress',
      resolved: 'Resolved'
    };

    const currentIdx = steps.indexOf(c.status);

    let html = '';
    steps.forEach((step, i) => {
      const h = histMap[step];
      const isDone = h !== undefined;
      const isCurrent = i === currentIdx && !isDone;
      const isPending = !isDone && !isCurrent;

      const lineBefore = i > 0
        ? `<div class="absolute top-6 sm:top-7 -translate-y-1/2 right-1/2 w-full h-[3px] ${isDone || isCurrent ? 'bg-[#E21B2D]' : 'bg-gray-200'}" style="z-index:0"></div>`
        : '';

      let node = '';
      if (isDone) {
        node = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#E21B2D] flex items-center justify-center shadow-md z-10 relative">
                  <i data-lucide="check" class="w-5 h-5 sm:w-6 sm:h-6 text-white" stroke-width="3"></i>
                </div>`;
      } else if (isCurrent) {
        node = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#E21B2D] flex items-center justify-center shadow-lg ring-4 ring-[#E21B2D]/20 z-10 relative animate-pulse-slow">
                  <div class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white"></div>
                </div>`;
      } else {
        node = `<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 flex items-center justify-center z-10 relative">
                  <div class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-400"></div>
                </div>`;
      }

      let dateLine = '';
      if (h) {
        const d = new Date(h.created_at);
        const ds = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const ts = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        dateLine = `<div class="text-[10.5px] text-[#6b7280] mt-1">${ds}</div><div class="text-[10.5px] text-[#6b7280]">${ts}</div>`;
      } else {
        dateLine = `<div class="text-[10.5px] text-gray-400 mt-1">Pending</div>`;
      }

      html += `
        <div class="flex-1 flex flex-col items-center text-center relative" style="z-index:1">
          ${lineBefore}
          ${node}
          <div class="mt-3">
            <div class="text-[12.5px] sm:text-[13.5px] font-semibold ${isPending ? 'text-gray-400' : 'text-[#1a1d21]'}">${labels[step]}</div>
            ${dateLine}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  },

  renderUpdates(c) {
    const container = document.getElementById('updatesContainer');
    if (!container) return;

    const sorted = [...this.currentHistory].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    const meta = {
      submitted: {
        label: 'Submitted',
        icon: 'check',
        color: 'text-green-600',
        bg: 'bg-green-100',
        desc: 'Your complaint has been successfully submitted.'
      },
      in_review: {
        label: 'In Review',
        icon: 'clock',
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        desc: 'Your complaint has been received and is under review by the municipal team.'
      },
      in_progress: {
        label: 'In Progress',
        icon: 'loader',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        desc: 'Work has been assigned and is in progress.'
      },
      resolved: {
        label: 'Resolved',
        icon: 'check-circle-2',
        color: 'text-green-600',
        bg: 'bg-green-100',
        desc: 'The issue has been resolved.'
      }
    };

    if (sorted.length === 0) {
      container.innerHTML = `<p class="text-[13px] text-[#6b7280] py-3 text-center">No updates yet.</p>`;
      return;
    }

    container.innerHTML = sorted.map((h, idx) => {
      const m = meta[h.status] || { label: h.status, icon: 'circle', color: 'text-gray-600', bg: 'bg-gray-100', desc: h.remarks || '' };
      const isLatest = idx === 0;
      const d = new Date(h.created_at);
      const ds = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const ts = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const remarks = h.remarks || m.desc;
      const wrapperCls = isLatest ? 'bg-[#fff5f6] border border-[#fdd] rounded-xl p-3' : '';

      return `
        <div class="relative flex gap-3 ${wrapperCls}">
          <div class="w-8 h-8 rounded-full ${m.bg} flex items-center justify-center flex-shrink-0 z-10">
            <i data-lucide="${m.icon}" class="w-4 h-4 ${m.color}"></i>
          </div>
          <div class="flex-1 min-w-0 pb-4">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-[13.5px] font-semibold ${isLatest ? 'text-[#E21B2D]' : 'text-[#1a1d21]'}">${m.label}</span>
              <span class="text-[11px] text-[#6b7280] whitespace-nowrap">${ds} • ${ts}</span>
            </div>
            <p class="text-[12.5px] text-[#6b7280] mt-1 leading-snug">${this.escape(remarks)}</p>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  renderImage(c) {
    const wrap = document.getElementById('reportedImageWrap');
    const img = document.getElementById('reportedImage');
    if (!wrap) return;
    if (c.image_path) {
      img.src = `${CONFIG.UPLOADS_BASE_URL}${c.image_path}`;
      wrap.classList.remove('hidden');
    } else {
      wrap.classList.add('hidden');
    }
  },

  renderLocation(c) {
    document.getElementById('locationText').textContent =
      `${c.locality || c.location || 'N/A'}, Mumbai`;
    document.getElementById('locationPincode').textContent = c.pincode || '—';
  },

  initMap(c) {
    const mapEl = document.getElementById('trackMap');
    if (!mapEl || !window.L) return;

    let lat = parseFloat(c.latitude) || 19.1197;
    let lng = parseFloat(c.longitude) || 72.8464;
    const hasCoords = c.latitude && c.longitude;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = L.map('trackMap', {
      center: [lat, lng],
      zoom: hasCoords ? 15 : 12,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);

    if (hasCoords) {
      const redIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:32px;height:42px;filter:drop-shadow(0 4px 8px rgba(226,27,45,0.4));">
          <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26c0-8.8-7.2-16-16-16z" fill="#E21B2D"/>
            <circle cx="16" cy="16" r="6" fill="#fff"/>
          </svg>
        </div>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42]
      });
      L.marker([lat, lng], { icon: redIcon }).addTo(this.map);
    }

    setTimeout(() => this.map?.invalidateSize(), 200);
  },

  renderDetails(c) {
    const catLabel = { garbage: 'Garbage', pothole: 'Pothole', others: 'Others' }[c.category] || c.category;

    document.getElementById('detailCategory').textContent = catLabel;
    document.getElementById('detailTitle').textContent = c.title;
    document.getElementById('detailDescription').textContent = c.description || 'No description provided.';
    document.getElementById('detailComplaintId').textContent = c.complaint_id;

    const dt = new Date(c.submitted_at);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    document.getElementById('detailSubmitted').textContent = `${dateStr} • ${timeStr}`;

    document.getElementById('detailLocation').textContent = `${c.locality || c.location || 'N/A'}, Mumbai`;
    document.getElementById('detailPincode').textContent = c.pincode || '—';
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

document.addEventListener('DOMContentLoaded', () => TrackPage.init());
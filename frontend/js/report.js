// frontend/js/report.js
// Shared report page logic — used by garbage, potholes, others

const ReportPage = {
  category: 'garbage',
  user: null,
  map: null,
  marker: null,
  redIcon: null,
  selectedFile: null,
  location: { lat: null, lng: null },
  observation: '',
  localitySelect: null,
  pincodeSelect: null,

  async init(category) {
    this.category = category || 'garbage';

    // Guard — citizen only
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
  // Initialize side menu (avatar-triggered)
  SideMenu.init(this.user);
    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initUpload();
    this.initMap();
    this.initLocalitySelect();
    this.initPincodeSelect();
    this.initObservationPills();
    this.initDescriptionCounter();
    this.initValidation();
    this.initSubmit();
    this.initBackButton();
  },

  // ═══ USER + HEADER ═══
  renderUser() {
    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
  },

  // ═══ MENU DRAWER ═══
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

  // ═══ LOGOUT ═══
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

  // ═══ BACK BUTTON ═══
  initBackButton() {
    const btn = document.getElementById('backBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (document.referrer && document.referrer.includes('dashboard.html')) {
          window.location.href = 'dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      });
    }
  },

  // ═══ IMAGE UPLOAD ═══
  initUpload() {
    const dropZone = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const fileName = document.getElementById('fileName');
    const removeBtn = document.getElementById('removeImage');
    const cameraBtn = document.getElementById('cameraBtn');
    if (!dropZone) return;

    const handleFile = (file) => {
      if (!file) return;
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        this.toast('Only JPG, PNG or PDF allowed', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toast('File too large (max 5MB)', 'error');
        return;
      }
      this.selectedFile = file;

      // Show preview
      dropZone.classList.add('hidden');
      preview.classList.remove('hidden');

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => { previewImg.src = e.target.result; };
        reader.readAsDataURL(file);
      } else {
        previewImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0UyMUIyRCIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTQgMnY0YTIgMiAwIDAgMCAyIDJoNCIvPjxwYXRoIGQ9Ik0xNCAySDUuNUEyLjUgMi41IDAgMCAwIDMgNC41djE1QTIuNSAyLjUgMCAwIDAgNS41IDIySDE4LjVBMi41IDIuNSAwIDAgMCAyMSAxOS41VjkiLz48L3N2Zz4=';
      }

      fileName.textContent = file.name;
      this.clearError('image');
    };

    // Click on drop zone
    dropZone.addEventListener('click', () => fileInput.click());
    cameraBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      cameraInput.click();
    });

    // File inputs
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });
    cameraInput?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    // Drag & drop
    ['dragenter', 'dragover'].forEach(ev => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-[#E21B2D]', 'bg-[#fff5f6]');
      });
    });
    ['dragleave', 'drop'].forEach(ev => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-[#E21B2D]', 'bg-[#fff5f6]');
      });
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    // Remove
    removeBtn?.addEventListener('click', () => {
      this.selectedFile = null;
      preview.classList.add('hidden');
      dropZone.classList.remove('hidden');
      fileInput.value = '';
      cameraInput.value = '';
      previewImg.src = '';
      fileName.textContent = '';
    });
  },

  // ═══ MAP ═══
  initMap() {
    const mapEl = document.getElementById('locationMap');
    if (!mapEl || !window.L) return;

    this.map = L.map('locationMap', {
      center: [19.1197, 72.8464],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Custom red pin
    this.redIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:32px;height:42px;position:relative;filter:drop-shadow(0 4px 8px rgba(226,27,45,0.4));">
        <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26c0-8.8-7.2-16-16-16z" fill="#E21B2D"/>
          <circle cx="16" cy="16" r="6" fill="#fff"/>
        </svg>
      </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42]
    });

    // Map click → place marker
    this.map.on('click', (e) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Use current location button
    document.getElementById('useCurrentLoc')?.addEventListener('click', () => this.useCurrentLocation());
  },

  setMarker(lat, lng) {
    this.location.lat = lat;
    this.location.lng = lng;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { icon: this.redIcon }).addTo(this.map);
    }

    // Update "Selected Location" display coordinates
    const displayEl = document.getElementById('selectedLocationText');
    if (displayEl) {
      displayEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      displayEl.classList.remove('ss-placeholder-mode');
    }
    this.clearError('location');
  },

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.toast('Location not supported by browser', 'error');
      return;
    }
    const btn = document.getElementById('useCurrentLoc');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-sm"></span> Detecting...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.map.setView([latitude, longitude], 16);
        this.setMarker(latitude, longitude);
        this.toast('Location detected successfully', 'success');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
      },
      (err) => {
        this.toast('Could not detect location. Please select on map.', 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  },

  // ═══ LOCALITY SEARCHABLE ═══
  initLocalitySelect() {
    const root = document.getElementById('localitySelect');
    if (!root) return;

    this.localitySelect = createSearchableSelect(root, {
      options: LOCALITIES,
      placeholder: 'Select area / landmark',
      onSelect: (locality) => {
        const pincodes = getPincodesForLocality(locality);
        this.pincodeSelect.setOptions(pincodes);
        this.pincodeSelect.reset();
        if (pincodes.length === 1) {
          // Auto-select if only one
          setTimeout(() => this.pincodeSelect.setValue(pincodes[0]), 30);
        } else {
          this.pincodeSelect.setPlaceholderText('Select pincode');
        }
        this.clearError('locality');
      }
    });
  },

  initPincodeSelect() {
    const root = document.getElementById('pincodeSelect');
    if (!root) return;

    this.pincodeSelect = createSearchableSelect(root, {
      options: [],
      placeholder: 'Select locality first',
      onSelect: () => this.clearError('pincode')
    });
  },

  // ═══ OBSERVATION PILLS ═══
  initObservationPills() {
    const pills = document.querySelectorAll('[data-observation]');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.observation = pill.dataset.observation;
      });
    });
  },

  // ═══ DESCRIPTION COUNTER ═══
  initDescriptionCounter() {
    const desc = document.getElementById('description');
    const counter = document.getElementById('descCounter');
    if (!desc || !counter) return;
    desc.addEventListener('input', () => {
      const len = desc.value.length;
      counter.textContent = `${len}/300`;
      if (len > 300) {
        desc.value = desc.value.slice(0, 300);
        counter.textContent = '300/300';
      }
      this.clearError('description');
    });
  },

  // ═══ VALIDATION ═══
  initValidation() {
    ['title', 'description'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.clearError(id));
    });
  },

  showError(fieldId, msg) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    const input = document.getElementById(fieldId);
    if (input) input.classList.add('border-red-500');
    const customRoot = document.getElementById(fieldId + 'Select');
    if (customRoot) {
      const trigger = customRoot.querySelector('.ss-trigger');
      if (trigger) trigger.classList.add('border-red-500');
    }
  },

  clearError(fieldId) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
    const input = document.getElementById(fieldId);
    if (input) input.classList.remove('border-red-500');
    const customRoot = document.getElementById(fieldId + 'Select');
    if (customRoot) {
      const trigger = customRoot.querySelector('.ss-trigger');
      if (trigger) trigger.classList.remove('border-red-500');
    }
  },

  showTopError(msg) {
    const el = document.getElementById('topError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  clearAllErrors() {
    ['image', 'title', 'description', 'location', 'locality', 'pincode'].forEach(f => this.clearError(f));
    const top = document.getElementById('topError');
    if (top) { top.classList.add('hidden'); top.textContent = ''; }
  },

  // ═══ TOAST ═══
  toast(msg, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };
    const el = document.createElement('div');
    el.className = `fixed top-6 right-6 z-[100] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transform translate-x-full transition-transform duration-300`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-x-full'));
    setTimeout(() => {
      el.classList.add('translate-x-full');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  },

  // ═══ BUTTON LOADING ═══
  setButtonLoading(loading) {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.classList.add('opacity-90', 'cursor-not-allowed');
      btn.innerHTML = `
        <div class="flex items-center justify-center gap-3">
          <span class="spinner"></span>
          <span>Submitting your report...</span>
        </div>`;
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-90', 'cursor-not-allowed');
      btn.innerHTML = `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        <span>Submit Report</span>`;
    }
  },

  // ═══ VALIDATE ═══
  validate() {
    let hasError = false;

    if (!this.selectedFile) { this.showError('image', 'Please upload an image'); hasError = true; }

    const title = document.getElementById('title').value.trim();
    const desc = document.getElementById('description').value.trim();
    const locality = this.localitySelect.getValue();
    const pincode = this.pincodeSelect.getValue();

    if (!title) { this.showError('title', 'Title is required'); hasError = true; }
    else if (title.length < 3) { this.showError('title', 'Minimum 3 characters'); hasError = true; }
    else if (title.length > 150) { this.showError('title', 'Maximum 150 characters'); hasError = true; }

    if (desc.length > 300) { this.showError('description', 'Maximum 300 characters'); hasError = true; }

    if (!locality) { this.showError('locality', 'Please select locality'); hasError = true; }
    if (!pincode) { this.showError('pincode', 'Please select pincode'); hasError = true; }

    return !hasError;
  },

  // ═══ SUBMIT ═══
  initSubmit() {
    const form = document.getElementById('reportForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearAllErrors();

      if (!this.validate()) {
        this.showTopError('Please fix the errors above');
        const firstErr = document.querySelector('.text-red-600:not(.hidden), .text-red-500:not(.hidden)');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      this.setButtonLoading(true);

      try {
        // Build FormData
        const fd = new FormData();
        fd.append('category', this.category);
        fd.append('title', document.getElementById('title').value.trim());
        fd.append('description', document.getElementById('description').value.trim());
        fd.append('locality', this.localitySelect.getValue());
        fd.append('pincode', this.pincodeSelect.getValue());
        fd.append('location', this.localitySelect.getValue());
        fd.append('nearby_address', document.getElementById('nearbyAddress').value.trim() || '');
        fd.append('observation', this.observation || '');
        if (this.location.lat) fd.append('latitude', this.location.lat);
        if (this.location.lng) fd.append('longitude', this.location.lng);
        if (this.selectedFile) fd.append('image', this.selectedFile);

        const res = await API.post('/complaints', fd);

        this.setButtonLoading(false);
        this.toast(`Report submitted! ID: ${res.data.complaint_id}`, 'success');

        // Show success modal instead of instant redirect
        this.showSuccessModal(res.data.complaint_id);

      } catch (err) {
        this.setButtonLoading(false);
        const msg = err.message || 'Submission failed';
        this.showTopError(msg);
        this.toast(msg, 'error');
      }
    });
  },

  // ═══ SUCCESS MODAL ═══
  showSuccessModal(complaintId) {
    const modal = document.getElementById('successModal');
    const idEl = document.getElementById('successComplaintId');
    if (!modal) {
      // Fallback: redirect
      setTimeout(() => window.location.href = 'complaints.html', 1200);
      return;
    }
    if (idEl) idEl.textContent = complaintId;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('successTrackBtn')?.addEventListener('click', () => {
      window.location.href = `track-status.html?id=${complaintId.replace('SC-', '')}`;
    });
    document.getElementById('successComplaintsBtn')?.addEventListener('click', () => {
      window.location.href = 'complaints.html';
    });
  }
};
// frontend/js/profile.js

const ProfilePage = {
  user: null,
  editMode: false,
  localitySelect: null,
  pincodeSelect: null,

  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
      // Initialize side menu (avatar-triggered)
  SideMenu.init(this.user);
    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initLanguageSelector();
    this.initEditButtons();
    this.initLocalitySelect();
    this.initPincodeSelect();
    this.initPasswordModal();
    this.initSaveButton();
    this.initDefaultLocationBtn();
    this.applyUserData();
  },

  // ═══ HEADER ═══
  renderUser() {
    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
  },

  applyUserData() {
    const u = this.user;
    const initial = (u.first_name || 'C').charAt(0).toUpperCase();

    // Hero card
    document.getElementById('heroAvatar').textContent = initial;
    document.getElementById('heroFullName').textContent =
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Citizen';
    document.getElementById('heroUsername').textContent = u.username || '—';

    const joined = u.created_at ? new Date(u.created_at) : new Date();
    const joinedStr = joined.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('heroMemberSince').textContent = joinedStr;
    document.getElementById('accMemberSince').textContent = joinedStr;

    // Inputs
    document.getElementById('firstName').value = u.first_name || '';
    document.getElementById('lastName').value = u.last_name || '';
    document.getElementById('mobile').value = u.mobile || '';
    document.getElementById('gender').value = u.gender || '';
    document.getElementById('localityInput').value = u.locality || '';
    document.getElementById('pincodeInput').value = u.pincode || '';
    document.getElementById('username').value = u.username || '';

    // Address text
    const addr = u.locality ? `${u.locality}, Mumbai, Maharashtra` : '—';
    document.getElementById('addressText').textContent = addr;

    // Preferences — default location
    document.getElementById('defaultLocText').textContent =
      u.locality ? `${u.locality}, Mumbai` : 'Not set';

    // Set custom selects
    if (this.localitySelect && u.locality) {
      setTimeout(() => this.localitySelect.setValue(u.locality), 100);
    }
    if (this.pincodeSelect && u.pincode) {
      setTimeout(() => this.pincodeSelect.setValue(u.pincode), 150);
    }

    // Set language dropdown
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = I18N.getLang();

    // Update i18n
    if (window.I18N) I18N.apply();
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

  // ═══ LANGUAGE SELECTOR ═══
  initLanguageSelector() {
    const select = document.getElementById('languageSelect');
    if (!select) return;

    select.value = I18N.getLang();

    select.addEventListener('change', () => {
      const lang = select.value;
      I18N.setLang(lang);
      this.toast(I18N.t('msg_language_changed') + ': ' + I18N.t('lang_' + lang), 'success');
    });
  },

  // ═══ EDIT BUTTONS (toggle edit mode) ═══
  initEditButtons() {
    // Personal Info + Edit Profile buttons
    ['editProfileBtn', 'editPersonalBtn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => this.toggleEdit(true));
    });
    ['editPreferencesBtn', 'editAccountBtn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => this.toggleEdit(true));
    });
  },

  toggleEdit(on) {
    this.editMode = on;
    // Enable/disable inputs
    ['firstName', 'lastName', 'mobile', 'gender'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !on;
    });
    // Save button visibility
    document.getElementById('saveSection')?.classList.toggle('hidden', !on);

    if (on) {
      this.toast('Edit mode enabled', 'info');
      document.getElementById('personalInfoCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  // ═══ LOCALITY SELECT ═══
  initLocalitySelect() {
    const root = document.getElementById('localitySelect');
    if (!root) return;

    this.localitySelect = createSearchableSelect(root, {
      options: LOCALITIES,
      placeholder: I18N.t('profile_select_locality'),
      onSelect: (locality) => {
        const pincodes = getPincodesForLocality(locality);
        this.pincodeSelect?.setOptions(pincodes);
        this.pincodeSelect?.reset();
        if (pincodes.length === 1) {
          setTimeout(() => this.pincodeSelect?.setValue(pincodes[0]), 50);
        }
        // Address text live update
        document.getElementById('addressText').textContent =
          `${locality}, Mumbai, Maharashtra`;
        document.getElementById('defaultLocText').textContent =
          `${locality}, Mumbai`;
      }
    });
  },

  initPincodeSelect() {
    const root = document.getElementById('pincodeSelect');
    if (!root) return;

    this.pincodeSelect = createSearchableSelect(root, {
      options: [],
      placeholder: I18N.t('profile_select_pincode')
    });
  },

  // ═══ PASSWORD MODAL ═══
  initPasswordModal() {
    const modal = document.getElementById('passwordModal');
    const openBtn = document.getElementById('changePasswordBtn');
    const closeBtn = document.getElementById('pwdModalClose');
    const cancelBtn = document.getElementById('pwdCancel');
    const backdrop = document.getElementById('pwdModalBackdrop');
    const form = document.getElementById('changePasswordForm');

    const open = () => {
      modal?.classList.remove('hidden');
      modal?.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      // Reset fields
      ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    };
    const close = () => {
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) close();
    });

    // Eye toggles
    ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(id => {
      const btn = document.getElementById('toggle_' + id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const input = document.getElementById(id);
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.innerHTML = isPass
          ? '<i data-lucide="eye-off" class="w-4 h-4"></i>'
          : '<i data-lucide="eye" class="w-4 h-4"></i>';
        if (window.lucide) lucide.createIcons();
      });
    });

    // Submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = document.getElementById('pwdCurrent').value;
      const newPwd = document.getElementById('pwdNew').value;
      const confirm = document.getElementById('pwdConfirm').value;

      if (!current || !newPwd || !confirm) {
        this.toast('Please fill all fields', 'error');
        return;
      }
      if (newPwd !== confirm) {
        this.toast(I18N.t('msg_passwords_no_match'), 'error');
        return;
      }
      if (newPwd.length < 6) {
        this.toast('New password must be at least 6 characters', 'error');
        return;
      }

      const btn = document.getElementById('pwdUpdateBtn');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span><span>${I18N.t('pwd_updating')}</span>`;

      try {
        await API.put('/auth/change-password', {
          current_password: current,
          new_password: newPwd
        });
        btn.disabled = false;
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
        close();
        this.toast(I18N.t('msg_password_changed'), 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Could not change password', 'error');
      }
    });
  },

  // ═══ DEFAULT LOCATION BUTTON ═══
  initDefaultLocationBtn() {
    document.getElementById('setCurrentLocBtn')?.addEventListener('click', () => {
      const locality = this.localitySelect?.getValue();
      if (locality) {
        document.getElementById('defaultLocText').textContent = `${locality}, Mumbai`;
        this.toast('Default location updated', 'success');
      } else {
        this.toast('Please select a locality first', 'error');
      }
    });
  },

  // ═══ SAVE BUTTON ═══
  initSaveButton() {
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
      const payload = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        gender: document.getElementById('gender').value || null,
        mobile: document.getElementById('mobile').value.trim() || null,
        locality: this.localitySelect?.getValue() || null,
        pincode: this.pincodeSelect?.getValue() || null
      };

      // Basic validation
      if (!payload.first_name || !payload.last_name) {
        this.toast('First name and last name are required', 'error');
        return;
      }

      const btn = document.getElementById('saveBtn');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span><span>${I18N.t('profile_saving')}</span>`;

      try {
        const res = await API.put('/auth/profile', payload);
        this.user = res.data;
        API.setUser(res.data, 'citizen');

        btn.disabled = false;
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();

        this.applyUserData();
        this.toggleEdit(false);
        this.toast(I18N.t('msg_profile_updated'), 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || I18N.t('msg_error'), 'error');
      }
    });
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

document.addEventListener('DOMContentLoaded', () => ProfilePage.init());
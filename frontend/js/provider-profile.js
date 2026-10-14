// frontend/js/provider-profile.js
// myBMC Provider — Profile page

const ProviderProfile = {
  user: null,
  editMode: false,

  async init() {
    this.user = await Guard.protect('provider');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderProviderInfo();
    this.initMenu();
    this.initLogout();
    this.initEditButton();
    this.initSaveButton();
    this.initCancelButton();
    this.initChangeUsernameModal();
    this.initChangePasswordModal();
    this.applyProviderData();
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
  if (this._logoutBound) return;
  this._logoutBound = true;

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-logout]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    console.log('[Logout] Clicked');

    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.log('[Logout] API error (ignored):', err.message);
    }

    API.clearToken();
    localStorage.clear();
    sessionStorage.clear();

    console.log('[Logout] Redirecting...');
    window.location.replace('../login.html');
  });
}

  // ═══ APPLY DATA ═══
  applyProviderData() {
    const u = this.user;
    const name = u.name || 'myBMC Mumbai';
    const initial = name.charAt(0).toUpperCase();

    document.getElementById('heroAvatar').textContent = initial;
    document.getElementById('heroFullName').textContent = name;
    document.getElementById('heroUsername').textContent = '@' + (u.username || '—');

    const joined = u.created_at ? new Date(u.created_at) : new Date();
    const joinedStr = joined.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('heroMemberSince').textContent = joinedStr;
    document.getElementById('accMemberSince').textContent = joinedStr;

    document.getElementById('providerNameInput').value = u.name || '';
    document.getElementById('locality').value = u.locality || '';
    document.getElementById('username').value = u.username || '';

    // Category chip
    const catMap = {
      garbage: { label: 'Garbage', cls: 'bg-[#ffe5e8] text-[#E21B2D]' },
      pothole: { label: 'Pothole', cls: 'bg-gray-100 text-[#343A40]' },
      others:  { label: 'Others',  cls: 'bg-purple-50 text-purple-600' },
      all:     { label: 'All Categories', cls: 'bg-blue-50 text-blue-600' }
    };
    const cat = catMap[u.category] || catMap.all;
    const catEl = document.getElementById('heroCategory');
    catEl.textContent = cat.label;
    catEl.className = `inline-flex items-center gap-1.5 ${cat.cls} px-3 py-1 rounded-lg text-[12px] font-bold`;

    // Last login
    let lastLoginStr = '—';
    if (u.last_login) {
      lastLoginStr = new Date(u.last_login).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    }
    document.getElementById('accLastLogin').textContent = lastLoginStr;
  },

  // ═══ EDIT MODE ═══
  initEditButton() {
    document.getElementById('editBtn')?.addEventListener('click', () => this.toggleEdit(true));
  },

  initCancelButton() {
    document.getElementById('cancelBtn')?.addEventListener('click', () => {
      this.toggleEdit(false);
      this.applyProviderData();
    });
  },

  toggleEdit(on) {
    this.editMode = on;
    ['providerNameInput', 'locality'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !on;
    });

    document.getElementById('saveSection')?.classList.toggle('hidden', !on);
    document.getElementById('editBtn')?.classList.toggle('hidden', on);

    if (on) {
      document.getElementById('personalInfoCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => document.getElementById('providerNameInput')?.focus(), 300);
    }
  },

  // ═══ SAVE ═══
  initSaveButton() {
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
      const payload = {
        name: document.getElementById('providerNameInput').value.trim(),
        locality: document.getElementById('locality').value || null
      };

      if (!payload.name || payload.name.length < 2) {
        this.toast('Provider name must be at least 2 characters', 'error');
        return;
      }

      const btn = document.getElementById('saveBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Saving...</span>`;

      try {
        const res = await API.put('/provider/profile', payload);
        this.user = res.data;
        API.setUser(res.data, 'provider');

        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();

        this.applyProviderData();
        this.toggleEdit(false);
        this.toast('Profile updated successfully', 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Update failed', 'error');
      }
    });
  },

  // ═══ CHANGE USERNAME ═══
  initChangeUsernameModal() {
    const modal = document.getElementById('usernameModal');
    const backdrop = document.getElementById('usernameBackdrop');
    const close = document.getElementById('usernameClose');
    const cancel = document.getElementById('usernameCancel');
    const form = document.getElementById('usernameForm');

    const openModal = () => {
      document.getElementById('newUsername').value = '';
      document.getElementById('usernamePassword').value = '';
      document.getElementById('usernamePassword').type = 'password';
      document.getElementById('toggleUsernamePassword').innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      setTimeout(() => document.getElementById('newUsername')?.focus(), 100);
      if (window.lucide) lucide.createIcons();
    };
    const closeModal = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    document.getElementById('changeUsernameBtn')?.addEventListener('click', openModal);
    backdrop?.addEventListener('click', closeModal);
    close?.addEventListener('click', closeModal);
    cancel?.addEventListener('click', closeModal);

    // Eye toggle
    document.getElementById('toggleUsernamePassword')?.addEventListener('click', (e) => {
      const input = document.getElementById('usernamePassword');
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      e.currentTarget.innerHTML = isPass
        ? '<i data-lucide="eye-off" class="w-4 h-4"></i>'
        : '<i data-lucide="eye" class="w-4 h-4"></i>';
      if (window.lucide) lucide.createIcons();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newUsername = document.getElementById('newUsername').value.trim();
      const password = document.getElementById('usernamePassword').value;

      if (newUsername.length < 4) { this.toast('Username must be at least 4 characters', 'error'); return; }
      if (!password) { this.toast('Please enter your current password', 'error'); return; }

      const btn = document.getElementById('usernameSubmitBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Updating...</span>`;

      try {
        const res = await API.put('/provider/change-username', {
          current_password: password,
          new_username: newUsername
        });
        this.user.username = res.data.username;
        API.setUser(this.user, 'provider');

        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        closeModal();
        this.applyProviderData();
        this.toast('Username updated successfully', 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Update failed', 'error');
      }
    });
  },

  // ═══ CHANGE PASSWORD ═══
  initChangePasswordModal() {
    const modal = document.getElementById('passwordModal');
    const backdrop = document.getElementById('passwordBackdrop');
    const close = document.getElementById('passwordClose');
    const cancel = document.getElementById('passwordCancel');
    const form = document.getElementById('passwordForm');

    const openModal = () => {
      ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(id => {
        document.getElementById(id).value = '';
        document.getElementById(id).type = 'password';
      });
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      setTimeout(() => document.getElementById('pwdCurrent')?.focus(), 100);
    };
    const closeModal = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    document.getElementById('changePasswordBtn')?.addEventListener('click', openModal);
    backdrop?.addEventListener('click', closeModal);
    close?.addEventListener('click', closeModal);
    cancel?.addEventListener('click', closeModal);

    // Eye toggles
    ['pwdCurrent', 'pwdNew', 'pwdConfirm'].forEach(id => {
      document.getElementById('toggle_' + id)?.addEventListener('click', (e) => {
        const input = document.getElementById(id);
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        e.currentTarget.innerHTML = isPass
          ? '<i data-lucide="eye-off" class="w-4 h-4"></i>'
          : '<i data-lucide="eye" class="w-4 h-4"></i>';
        if (window.lucide) lucide.createIcons();
      });
    });

    // Strength indicator
    const newPwdInput = document.getElementById('pwdNew');
    newPwdInput?.addEventListener('input', () => {
      const pwd = newPwdInput.value;
      const bar = document.getElementById('pwdStrengthBar');
      const text = document.getElementById('pwdStrengthText');
      if (!bar) return;

      let score = 0;
      if (pwd.length >= 6) score++;
      if (pwd.length >= 10) score++;
      if (/[A-Z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd)) score++;
      if (/[^A-Za-z0-9]/.test(pwd)) score++;

      const colors = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
      const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
      const widths = ['20%', '40%', '60%', '80%', '100%'];

      if (pwd.length === 0) {
        bar.style.width = '0%';
        text.textContent = '';
      } else {
        bar.className = `h-full rounded-full transition-all duration-300 ${colors[score - 1] || 'bg-red-500'}`;
        bar.style.width = widths[score - 1] || '20%';
        text.textContent = labels[score - 1] || 'Very Weak';
        text.className = `text-[10.5px] font-semibold mt-1 ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`;
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = document.getElementById('pwdCurrent').value;
      const newPwd = document.getElementById('pwdNew').value;
      const confirm = document.getElementById('pwdConfirm').value;

      if (!current) { this.toast('Please enter current password', 'error'); return; }
      if (newPwd.length < 6) { this.toast('New password must be at least 6 characters', 'error'); return; }
      if (newPwd !== confirm) { this.toast('New passwords do not match', 'error'); return; }
      if (newPwd === current) { this.toast('New password must be different', 'error'); return; }

      const btn = document.getElementById('passwordSubmitBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Updating...</span>`;

      try {
        await API.put('/provider/change-password', {
          current_password: current,
          new_password: newPwd
        });
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        closeModal();
        this.toast('Password changed successfully', 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Update failed', 'error');
      }
    });
  },

  toast(msg, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };
    const el = document.createElement('div');
    el.className = `fixed top-6 right-6 z-[400] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transform translate-x-full transition-transform duration-300`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-x-full'));
    setTimeout(() => {
      el.classList.add('translate-x-full');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => ProviderProfile.init());
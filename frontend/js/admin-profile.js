// frontend/js/admin-profile.js
// Admin — Profile page

const AdminProfile = {
  user: null,
  editMode: false,

  async init() {
    this.user = await Guard.protect('admin');
    if (!this.user) return;

    Guard.startHeartbeat();
    this.renderAdminUser();
    this.initMenu();
    this.initLogout();
    this.initEditButton();
    this.initSaveButton();
    this.initCancelButton();
    this.initChangeUsernameModal();
    this.initChangePasswordModal();
    this.applyUserData();
  },

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

  // ═══ APPLY USER DATA ═══
  applyUserData() {
    const u = this.user;
    const initial = (u.first_name || 'A').charAt(0).toUpperCase();

    // Hero card
    document.getElementById('heroAvatar').textContent = initial;
    document.getElementById('heroFullName').textContent =
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Admin';
    document.getElementById('heroUsername').textContent = '@' + (u.username || '—');

    const joined = u.created_at ? new Date(u.created_at) : new Date();
    const joinedStr = joined.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('heroMemberSince').textContent = joinedStr;
    document.getElementById('accMemberSince').textContent = joinedStr;

    // Inputs
    document.getElementById('firstName').value = u.first_name || '';
    document.getElementById('lastName').value = u.last_name || '';
    document.getElementById('mobile').value = u.mobile || '';
    document.getElementById('gender').value = u.gender || '';
    document.getElementById('username').value = u.username || '';

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
      this.applyUserData(); // reset values
    });
  },

  toggleEdit(on) {
    this.editMode = on;
    ['firstName', 'lastName', 'mobile', 'gender'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !on;
    });

    document.getElementById('saveSection')?.classList.toggle('hidden', !on);
    document.getElementById('editBtn')?.classList.toggle('hidden', on);

    if (on) {
      document.getElementById('personalInfoCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => document.getElementById('firstName')?.focus(), 300);
    }
  },

  // ═══ SAVE ═══
  initSaveButton() {
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
      const payload = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        gender: document.getElementById('gender').value || null,
        mobile: document.getElementById('mobile').value.trim() || null,
        locality: this.user.locality || null,
        pincode: this.user.pincode || null
      };

      if (!payload.first_name || !payload.last_name) {
        this.toast('First name and last name are required', 'error');
        return;
      }

      const btn = document.getElementById('saveBtn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-sm"></span><span>Saving...</span>`;

      try {
        const res = await API.put('/auth/profile', payload);
        this.user = res.data;
        API.setUser(res.data, 'admin');

        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();

        this.applyUserData();
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

  // ═══ CHANGE USERNAME MODAL ═══
  initChangeUsernameModal() {
    const modal = document.getElementById('usernameModal');
    const backdrop = document.getElementById('usernameBackdrop');
    const close = document.getElementById('usernameClose');
    const form = document.getElementById('usernameForm');

    const openModal = () => {
      document.getElementById('newUsername').value = '';
      document.getElementById('usernamePassword').value = '';
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      setTimeout(() => document.getElementById('newUsername')?.focus(), 100);
    };
    const closeModal = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    };

    document.getElementById('changeUsernameBtn')?.addEventListener('click', openModal);
    backdrop?.addEventListener('click', closeModal);
    close?.addEventListener('click', closeModal);

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
        const res = await API.put('/auth/change-username', {
          current_password: password,
          new_username: newUsername
        });
        this.user.username = res.data.username;
        API.setUser(this.user, 'admin');

        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        closeModal();
        this.applyUserData();
        this.toast('Username updated successfully', 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = orig;
        if (window.lucide) lucide.createIcons();
        this.toast(err.message || 'Update failed', 'error');
      }
    });
  },

  // ═══ CHANGE PASSWORD MODAL ═══
  initChangePasswordModal() {
    const modal = document.getElementById('passwordModal');
    const backdrop = document.getElementById('passwordBackdrop');
    const close = document.getElementById('passwordClose');
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

    // Eye toggles for all 3 fields
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

    // Password strength indicator
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
        await API.put('/auth/change-password', {
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

  // ═══ TOAST ═══
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

document.addEventListener('DOMContentLoaded', () => AdminProfile.init());
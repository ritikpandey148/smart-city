// frontend/js/auth.js
// Login + Signup logic (shared across pages)

const Auth = {

  // ───── Password eye toggle ─────
  initPasswordToggle(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;

    btn.addEventListener('click', () => {
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';

      // swap icon
      btn.innerHTML = isPass
        ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
        : '<i data-lucide="eye" class="w-5 h-5"></i>';
      if (window.lucide) lucide.createIcons();
    });
  },

  // ───── Show field error ─────
  showError(fieldId, msg) {
    const el = document.getElementById(fieldId + 'Error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    const input = document.getElementById(fieldId);
    if (input) input.classList.add('border-red-500');
  },

  clearError(fieldId) {
    const el = document.getElementById(fieldId + 'Error');
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
    const input = document.getElementById(fieldId);
    if (input) input.classList.remove('border-red-500');
  },

  clearAllErrors() {
    ['username', 'password'].forEach(f => this.clearError(f));
    const top = document.getElementById('topError');
    if (top) { top.classList.add('hidden'); top.textContent = ''; }
  },

  // ───── Top error banner ─────
  showTopError(msg) {
    const el = document.getElementById('topError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  // ───── Loading state on button ─────
  setButtonLoading(btnId, loading, defaultText = 'Login') {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (loading) {
      btn.disabled = true;
      btn.classList.add('opacity-90', 'cursor-not-allowed');
      btn.innerHTML = `
        <div class="flex items-center justify-center gap-3">
          <span class="spinner"></span>
          <span>Please wait...</span>
        </div>
      `;
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-90', 'cursor-not-allowed');
      btn.innerHTML = `
        <span>${defaultText}</span>
        <i data-lucide="arrow-right" class="w-5 h-5 ml-2"></i>
      `;
      if (window.lucide) lucide.createIcons();
    }
  },

  // ───── Toast ─────
  toast(msg, type = 'info') {
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-gray-800'
    };
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

  // ───── Role-based redirect ─────
  redirectByRole(role) {
    if (role === 'admin') {
      window.location.href = 'admin/dashboard.html';
    } else if (role === 'provider') {
      window.location.href = 'provider/dashboard.html';
    } else {
      window.location.href = 'citizen/dashboard.html';
    }
  },

  // ───── LOGIN FORM ─────
  initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Eye toggle
    this.initPasswordToggle('password', 'togglePassword');

    // Clear error on typing
    document.getElementById('username')?.addEventListener('input', () => this.clearError('username'));
    document.getElementById('password')?.addEventListener('input', () => this.clearError('password'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearAllErrors();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      // Client-side validation
      let hasError = false;
      if (!username) {
        this.showError('username', 'Username is required');
        hasError = true;
      }
      if (!password) {
        this.showError('password', 'Password is required');
        hasError = true;
      } else if (password.length < 4) {
        this.showError('password', 'Password must be at least 4 characters');
        hasError = true;
      }
      if (hasError) return;

      // Loading
      this.setButtonLoading('loginBtn', true);

      try {
        const res = await API.post('/auth/login', { username, password });

        // Save token + user
        API.setToken(res.data.token);
        API.setUser(res.data.user, res.data.role);

        this.toast(`Welcome, ${res.data.user.first_name || res.data.user.name || 'User'}!`, 'success');

        // Redirect after brief pause
        setTimeout(() => this.redirectByRole(res.data.role), 600);

      } catch (err) {
        this.setButtonLoading('loginBtn', false, 'Login');

        // Map backend messages to specific fields
        const msg = err.message || 'Login failed';

        if (msg.toLowerCase().includes("doesn't have account") ||
            msg.toLowerCase().includes('username')) {
          this.showError('username', msg);
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('password')) {
          this.showError('password', msg);
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('not active')) {
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('network')) {
          this.showTopError('Cannot connect to server. Please check if backend is running.');
        } else {
          this.showTopError(msg);
        }

        this.toast(msg, 'error');
      }
    });
  }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.initLoginForm();
});
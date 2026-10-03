// frontend/js/signup.js

// ═══════════════════════════════════════════════════════
// CUSTOM SEARCHABLE SELECT COMPONENT
// ═══════════════════════════════════════════════════════
function createSearchableSelect(root, { options, placeholder = 'Select...', onSelect = null } = {}) {
  const trigger = root.querySelector('.ss-trigger');
  const valueEl = root.querySelector('.ss-value');
  const panel = root.querySelector('.ss-panel');
  const searchInput = root.querySelector('.ss-search');
  const optionsEl = root.querySelector('.ss-options');
  const hiddenInput = root.querySelector('input[type="hidden"]');
  const arrow = root.querySelector('.ss-arrow');

  let allOptions = options || [];
  let selectedValue = '';

  function renderOptions(filter = '') {
    const f = filter.toLowerCase().trim();
    const filtered = allOptions.filter(opt => {
      const label = typeof opt === 'string' ? opt : opt.label;
      return label.toLowerCase().includes(f);
    });

    if (filtered.length === 0) {
      optionsEl.innerHTML = '<div class="ss-no-results">No results found</div>';
      return;
    }
    optionsEl.innerHTML = filtered.map(opt => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const lbl = typeof opt === 'string' ? opt : opt.label;
      const selected = String(val) === String(selectedValue) ? 'ss-selected' : '';
      return `<div class="ss-option ${selected}" data-value="${val}">${lbl}</div>`;
    }).join('');
  }

  function open() {
    panel.classList.add('ss-open');
    arrow.style.transform = 'rotate(180deg)';
    searchInput.value = '';
    renderOptions('');
    setTimeout(() => searchInput.focus(), 60);
  }

  function close() {
    panel.classList.remove('ss-open');
    arrow.style.transform = 'rotate(0deg)';
  }

  function select(val) {
    const opt = allOptions.find(o => String(typeof o === 'string' ? o : o.value) === String(val));
    if (!opt) return;
    selectedValue = val;
    hiddenInput.value = val;
    const displayText = typeof opt === 'string' ? opt : opt.label;
    valueEl.textContent = displayText;
    valueEl.classList.remove('ss-placeholder-mode');
    close();
    if (onSelect) onSelect(val);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.classList.contains('ss-open')) close();
    else open();
  });

  searchInput.addEventListener('input', (e) => renderOptions(e.target.value));
  searchInput.addEventListener('click', (e) => e.stopPropagation());

  optionsEl.addEventListener('click', (e) => {
    const optEl = e.target.closest('.ss-option');
    if (optEl) select(optEl.dataset.value);
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('ss-open')) close();
  });

  return {
    setOptions(opts) {
      allOptions = opts;
      renderOptions(searchInput.value);
    },
    getValue() { return selectedValue; },
    reset() {
      selectedValue = '';
      hiddenInput.value = '';
      valueEl.textContent = placeholder;
      valueEl.classList.add('ss-placeholder-mode');
    },
    setPlaceholderText(txt) {
      valueEl.textContent = txt;
      valueEl.classList.add('ss-placeholder-mode');
    }
  };
}

// ═══════════════════════════════════════════════════════
// SIGNUP PAGE LOGIC
// ═══════════════════════════════════════════════════════
const SignupPage = {

  state: {
    gender: '',
    localitySelect: null,
    pincodeSelect: null
  },

  // ─── Init ───
  init() {
    this.initPasswordToggle();
    this.initGenderPills();
    this.initLocalitySelect();
    this.initPincodeSelect();
    this.initValidation();
    this.initFormSubmit();
    this.initLoginLink();
  },

  // ─── Password eye toggle ───
  initPasswordToggle() {
    const input = document.getElementById('password');
    const btn = document.getElementById('togglePassword');
    if (!input || !btn) return;

    btn.addEventListener('click', () => {
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.innerHTML = isPass
        ? '<i data-lucide="eye-off" class="w-5 h-5"></i>'
        : '<i data-lucide="eye" class="w-5 h-5"></i>';
      if (window.lucide) lucide.createIcons();
    });
  },

  // ─── Gender pills ───
  initGenderPills() {
    const pills = document.querySelectorAll('[data-gender]');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => {
          p.classList.remove('bg-[#E21B2D]', 'text-white', 'shadow-md');
          p.classList.add('bg-[#f0f1f3]', 'text-[#343A40]');
        });
        pill.classList.add('bg-[#E21B2D]', 'text-white', 'shadow-md');
        pill.classList.remove('bg-[#f0f1f3]', 'text-[#343A40]');
        this.state.gender = pill.dataset.gender;
        this.clearError('gender');
      });
    });
  },

  // ─── Locality searchable select ───
  initLocalitySelect() {
    const root = document.getElementById('localitySelect');
    if (!root) return;

    this.state.localitySelect = createSearchableSelect(root, {
      options: LOCALITIES,
      placeholder: 'Select your locality',
      onSelect: (locality) => {
        // Repopulate pincode options
        const pincodes = getPincodesForLocality(locality);
        if (pincodes.length === 1) {
          // Auto-select if only one
          this.state.pincodeSelect.setOptions([pincodes[0]]);
          // Trigger select after slight delay
          setTimeout(() => {
            const hidden = document.querySelector('#pincodeSelect input[type="hidden"]');
            if (hidden) {
              const opt = document.querySelector(`#pincodeSelect .ss-option[data-value="${pincodes[0]}"]`);
              // Programmatic select
              this.state.pincodeSelect.setOptions([pincodes[0]]);
              const valEl = document.querySelector('#pincodeSelect .ss-value');
              const hidIn = document.querySelector('#pincodeSelect input[type="hidden"]');
              if (valEl && hidIn) {
                valEl.textContent = pincodes[0];
                valEl.classList.remove('ss-placeholder-mode');
                hidIn.value = pincodes[0];
              }
            }
          }, 50);
        } else {
          this.state.pincodeSelect.setOptions(pincodes);
          this.state.pincodeSelect.reset();
          this.state.pincodeSelect.setPlaceholderText('Select your pincode');
        }
        this.clearError('locality');
      }
    });
  },

  // ─── Pincode searchable select ───
  initPincodeSelect() {
    const root = document.getElementById('pincodeSelect');
    if (!root) return;

    this.state.pincodeSelect = createSearchableSelect(root, {
      options: [],
      placeholder: 'Select locality first',
      onSelect: () => {
        this.clearError('pincode');
      }
    });
  },

  // ─── Clear error on input ───
  initValidation() {
    ['firstName', 'lastName', 'mobile', 'username', 'password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.clearError(id));
    });
  },

  // ─── Error helpers ───
  showError(fieldId, msg) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    const input = document.getElementById(fieldId);
    if (input && input.classList) input.classList.add('border-red-500');
    // for custom selects
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
    if (input && input.classList) input.classList.remove('border-red-500');
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
    ['firstName', 'lastName', 'gender', 'mobile', 'locality', 'pincode', 'username', 'password']
      .forEach(f => this.clearError(f));
    const top = document.getElementById('topError');
    if (top) { top.classList.add('hidden'); top.textContent = ''; }
  },

  // ─── Button loading ───
  setButtonLoading(loading) {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.classList.add('opacity-90', 'cursor-not-allowed');
      btn.innerHTML = `
        <div class="flex items-center justify-center gap-3">
          <span class="spinner"></span>
          <span>Creating account...</span>
        </div>`;
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-90', 'cursor-not-allowed');
      btn.innerHTML = `
        <span>Submit</span>
        <i data-lucide="arrow-right" class="w-5 h-5 ml-2"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  },

  // ─── Toast ───
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

  // ─── Validate form ───
  validate() {
    let hasError = false;

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const locality = this.state.localitySelect.getValue();
    const pincode = this.state.pincodeSelect.getValue();

    if (!firstName) { this.showError('firstName', 'First name is required'); hasError = true; }
    else if (firstName.length < 2) { this.showError('firstName', 'Minimum 2 characters'); hasError = true; }

    if (!lastName) { this.showError('lastName', 'Last name is required'); hasError = true; }
    else if (lastName.length < 2) { this.showError('lastName', 'Minimum 2 characters'); hasError = true; }

    if (!this.state.gender) { this.showError('gender', 'Please select gender'); hasError = true; }

    if (!mobile) { this.showError('mobile', 'Mobile number is required'); hasError = true; }
    else if (!/^[6-9]\d{9}$/.test(mobile)) { this.showError('mobile', 'Enter valid 10-digit mobile'); hasError = true; }

    if (!locality) { this.showError('locality', 'Please select locality'); hasError = true; }
    if (!pincode) { this.showError('pincode', 'Please select pincode'); hasError = true; }

    if (!username) { this.showError('username', 'Username is required'); hasError = true; }
    else if (username.length < 4) { this.showError('username', 'Minimum 4 characters'); hasError = true; }
    else if (/\s/.test(username)) { this.showError('username', 'No spaces allowed'); hasError = true; }

    if (!password) { this.showError('password', 'Password is required'); hasError = true; }
    else if (password.length < 6) { this.showError('password', 'Minimum 6 characters'); hasError = true; }

    return !hasError;
  },

  // ─── Form submit ───
  initFormSubmit() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearAllErrors();

      if (!this.validate()) {
        this.showTopError('Please fix the errors above');
        // Scroll to first error
        const firstErr = document.querySelector('.text-red-600:not(.hidden)');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const payload = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        gender: this.state.gender,
        mobile: document.getElementById('mobile').value.trim(),
        locality: this.state.localitySelect.getValue(),
        pincode: this.state.pincodeSelect.getValue(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value
      };

      this.setButtonLoading(true);

      try {
        const res = await API.post('/auth/register', payload);

        // Save session
        API.setToken(res.data.token);
        API.setUser(res.data.user, res.data.role);

        this.toast('Account created! Welcome to SMART CITY 🎉', 'success');

        setTimeout(() => {
          window.location.href = 'citizen/dashboard.html';
        }, 700);

      } catch (err) {
        this.setButtonLoading(false);
        const msg = err.message || 'Signup failed';

        if (msg.toLowerCase().includes('username')) {
          this.showError('username', msg);
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('mobile')) {
          this.showError('mobile', msg);
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('locality')) {
          this.showError('locality', msg);
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('pincode')) {
          this.showError('pincode', msg);
          this.showTopError(msg);
        } else if (msg.toLowerCase().includes('network')) {
          this.showTopError('Cannot connect to server. Please check if backend is running.');
        } else {
          this.showTopError(msg);
        }
        this.toast(msg, 'error');
      }
    });
  },

  // ─── Login link ───
  initLoginLink() {
    document.getElementById('backToLogin')?.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SignupPage.init();
  if (window.lucide) lucide.createIcons();
});
// frontend/js/side-menu.js
// Reusable right-side slide-in menu — triggered by profile avatar
// Auto-injects drawer HTML + handles all logic

const SideMenu = {

  user: null,

  // ═══ INIT — Call this after Guard.protect() ═══
  init(user) {
    this.user = user || API.getUser() || {};
    this.injectDrawer();
    this.injectBackdrop();
    this.attachTriggers();
    this.attachHandlers();
  },

  // ═══ INJECT DRAWER HTML ═══
  injectDrawer() {
    if (document.getElementById('sideMenuDrawer')) return;

    const initial = (this.user.first_name || 'C').charAt(0).toUpperCase();
    const fullName = `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim() || 'Citizen';
    const role = 'Citizen';

    const html = `
      <aside id="sideMenuDrawer"
             class="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] max-w-[88vw] bg-white z-[90]
                    flex flex-col shadow-2xl overflow-hidden"
             style="transform: translateX(100%); transition: transform 0.32s cubic-bezier(.4,0,.2,1);">

        <!-- Close button -->
        <button id="sideMenuClose"
                class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white hover:bg-gray-100
                       flex items-center justify-center shadow-lg transition-all z-20">
          <i data-lucide="x" class="w-5 h-5 text-[#343A40]"></i>
        </button>

        <!-- Scroll area -->
        <div class="flex-1 overflow-y-auto">

          <!-- Top section with logo + hero -->
          <div class="relative">

            <!-- Logo -->
            <div class="px-5 pt-5 pb-3 flex items-center gap-2.5">
              <img src="../assets/images/smart-city-logo.png" alt="SMART CITY"
                   class="w-11 h-11 object-contain" style="mix-blend-mode: multiply;" />
              <div>
                <div class="text-[15px] font-bold leading-tight">
                  <span class="text-[#343A40]">SMART</span> <span class="text-[#E21B2D]">CITY</span>
                </div>
                <div class="text-[10.5px] text-[#6b7280] leading-tight mt-0.5">Smart Citizen, Smart City</div>
              </div>
            </div>

            <!-- Hero banner -->
            <div class="relative overflow-hidden">
              <img src="../assets/images/help-hero.jpg" alt=""
                   class="w-full h-32 object-cover"
                   onerror="this.style.display='none'" />
            </div>
          </div>

          <!-- Profile card -->
          <div class="px-5 -mt-8 relative z-10">
            <div class="bg-[#fde8ea] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div class="w-14 h-14 rounded-full bg-[#a8121f] flex items-center justify-center text-white font-bold text-[24px] flex-shrink-0 shadow-md">
                ${initial}
              </div>
              <div class="min-w-0">
                <div class="text-[15.5px] font-bold text-[#1a1d21] truncate">${this.esc(fullName)}</div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <i data-lucide="user" class="w-3 h-3 text-[#6b7280]"></i>
                  <span class="text-[12px] text-[#6b7280] font-medium">${role}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Menu items -->
          <nav class="px-5 pt-4 pb-6 space-y-2">

            <a href="how-to-report.html"
               class="flex items-center gap-4 p-3.5 rounded-2xl bg-[#f5f6f7] hover:bg-[#ffe5e8] transition-all group">
              <div class="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-[#E21B2D] transition-colors">
                <i data-lucide="file-text" class="w-5 h-5 text-[#E21B2D] group-hover:text-white transition-colors"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14.5px] font-semibold text-[#1a1d21]">How to Report</div>
                <div class="text-[12px] text-[#6b7280] mt-0.5">Step by step guide</div>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-[#E21B2D] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"></i>
            </a>

            <a href="guidelines.html"
               class="flex items-center gap-4 p-3.5 rounded-2xl bg-[#f5f6f7] hover:bg-[#ffe5e8] transition-all group">
              <div class="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-[#E21B2D] transition-colors">
                <i data-lucide="clipboard-check" class="w-5 h-5 text-[#E21B2D] group-hover:text-white transition-colors"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14.5px] font-semibold text-[#1a1d21]">Guidelines</div>
                <div class="text-[12px] text-[#6b7280] mt-0.5">Rules and reporting standards</div>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-[#E21B2D] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"></i>
            </a>

            <a href="faqs.html"
               class="flex items-center gap-4 p-3.5 rounded-2xl bg-[#f5f6f7] hover:bg-[#ffe5e8] transition-all group">
              <div class="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-[#E21B2D] transition-colors">
                <i data-lucide="message-circle-question" class="w-5 h-5 text-[#E21B2D] group-hover:text-white transition-colors"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14.5px] font-semibold text-[#1a1d21]">FAQs</div>
                <div class="text-[12px] text-[#6b7280] mt-0.5">Find answers to common questions</div>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-[#E21B2D] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"></i>
            </a>

            <a href="about-us.html"
               class="flex items-center gap-4 p-3.5 rounded-2xl bg-[#f5f6f7] hover:bg-[#ffe5e8] transition-all group">
              <div class="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-[#E21B2D] transition-colors">
                <i data-lucide="users" class="w-5 h-5 text-[#E21B2D] group-hover:text-white transition-colors"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14.5px] font-semibold text-[#1a1d21]">About Us</div>
                <div class="text-[12px] text-[#6b7280] mt-0.5">Our mission and vision</div>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-[#E21B2D] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"></i>
            </a>

            <!-- Divider -->
            <div class="h-px bg-gray-100 my-3"></div>

            <!-- Logout -->
            <button data-logout
                    class="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-red-50 transition-all group">
              <div class="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <i data-lucide="log-out" class="w-5 h-5 text-[#E21B2D]"></i>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="text-[14.5px] font-semibold text-[#E21B2D]">Logout</div>
                <div class="text-[12px] text-[#6b7280] mt-0.5">Sign out of your account</div>
              </div>
            </button>

          </nav>

          <!-- Bottom city illustration watermark -->
          <div class="px-5 pb-5">
            <img src="../assets/images/sidebar-city.png" alt=""
                 class="w-full h-20 object-cover rounded-2xl opacity-60" />
          </div>

        </div>
      </aside>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    if (window.lucide) lucide.createIcons();
  },

  // ═══ BACKDROP ═══
  injectBackdrop() {
    if (document.getElementById('sideMenuBackdrop')) return;
    const html = `<div id="sideMenuBackdrop"
                       class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[85]"
                       style="opacity: 0; transition: opacity 0.3s ease-out;"></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  // ═══ ATTACH TRIGGERS ═══
  attachTriggers() {
    // Profile avatar in header — any element with id="userAvatar" or class marker
    const avatarBtn = document.getElementById('userAvatar')?.closest('button');
    if (avatarBtn) {
      avatarBtn.setAttribute('data-side-menu-trigger', 'true');
      avatarBtn.style.cursor = 'pointer';
      avatarBtn.addEventListener('click', () => this.open());
    }

    // Any other explicit trigger
    document.querySelectorAll('[data-side-menu]').forEach(el => {
      el.addEventListener('click', () => this.open());
    });
  },

  // ═══ HANDLERS ═══
  attachHandlers() {
    const drawer = document.getElementById('sideMenuDrawer');
    const backdrop = document.getElementById('sideMenuBackdrop');
    const closeBtn = document.getElementById('sideMenuClose');

    const close = () => this.close();
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Logout button inside drawer
    drawer?.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await API.post('/auth/logout'); } catch (err) {}
        API.clearToken();
        window.location.href = '../login.html';
      });
    });
  },

  isOpen() {
    const drawer = document.getElementById('sideMenuDrawer');
    return drawer && drawer.style.transform !== 'translateX(100%)';
  },

  open() {
    const drawer = document.getElementById('sideMenuDrawer');
    const backdrop = document.getElementById('sideMenuBackdrop');
    if (!drawer || !backdrop) return;
    drawer.style.transform = 'translateX(0)';
    backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    requestAnimationFrame(() => backdrop.style.opacity = '1');
  },

  close() {
    const drawer = document.getElementById('sideMenuDrawer');
    const backdrop = document.getElementById('sideMenuBackdrop');
    if (!drawer || !backdrop) return;
    drawer.style.transform = 'translateX(100%)';
    backdrop.style.opacity = '0';
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => backdrop.classList.add('hidden'), 300);
  },

  esc(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
};
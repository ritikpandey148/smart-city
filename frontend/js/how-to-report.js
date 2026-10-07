// frontend/js/how-to-report.js
// How to Report — tab switching logic

const HowToReport = {
  user: null,
  currentTab: 'garbage',

  // ═══ TAB CONTENT DATA ═══
  content: {
    garbage: {
      whatTitle: 'What is a Garbage Issue?',
      whatDesc: 'A garbage issue includes overflowing dustbins, uncollected waste, scattered garbage on roads, illegal dumping or any other waste-related problem in public places.',
      steps: [
        {
          num: 1,
          title: 'Open Report Garbage',
          desc: "From the dashboard, click on 'Report Garbage'.",
          visual: 'open-garbage'
        },
        {
          num: 2,
          title: 'Upload Image',
          desc: 'Take or upload a clear photo of the garbage area.',
          visual: 'upload'
        },
        {
          num: 3,
          title: 'Add Title & Description',
          desc: 'Enter a short title and detailed description about the issue.',
          visual: 'title-desc-garbage'
        },
        {
          num: 4,
          title: 'Select Location',
          desc: 'Choose the location on map or use your current location. Enter pincode.',
          visual: 'location'
        },
        {
          num: 5,
          title: 'Select Issue Type',
          desc: 'Choose the most suitable type for your complaint.',
          visual: 'issue-type-garbage'
        },
        {
          num: 6,
          title: 'Submit Report',
          desc: "Review the details and click on 'Submit Report' to send your complaint.",
          visual: 'submit'
        }
      ]
    },
    pothole: {
      whatTitle: 'What is a Pothole Issue?',
      whatDesc: 'A pothole issue includes damaged road surfaces, large potholes, road cracks, uneven or unsafe roads that can cause accidents or damage vehicles.',
      steps: [
        {
          num: 1,
          title: 'Open Report Pothole',
          desc: "From the dashboard, click on 'Report Pothole'.",
          visual: 'open-pothole'
        },
        {
          num: 2,
          title: 'Upload Image',
          desc: 'Take or upload a clear photo of the pothole or damaged road.',
          visual: 'upload'
        },
        {
          num: 3,
          title: 'Add Title & Description',
          desc: 'Enter a short title and detailed description about the road issue.',
          visual: 'title-desc-pothole'
        },
        {
          num: 4,
          title: 'Select Location',
          desc: 'Choose the location on map or use your current location. Enter pincode.',
          visual: 'location'
        },
        {
          num: 5,
          title: 'Select Issue Type',
          desc: 'Choose the most suitable type for your complaint.',
          visual: 'issue-type-pothole'
        },
        {
          num: 6,
          title: 'Submit Report',
          desc: "Review the details and click on 'Submit Report' to send your complaint.",
          visual: 'submit'
        }
      ]
    }
  },

  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
    SideMenu.init(this.user);

    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initTabs();
    this.renderContent();
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
      window.location.href = 'dashboard.html';
    });
  },

  // ═══ TABS ═══
  initTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === this.currentTab) return;
        this.currentTab = tab;

        // Update active styles
        document.querySelectorAll('[data-tab]').forEach(b => {
          b.classList.remove('bg-[#E21B2D]', 'text-white', 'shadow-md');
          b.classList.add('bg-[#f0f1f3]', 'text-[#343A40]');
        });
        btn.classList.add('bg-[#E21B2D]', 'text-white', 'shadow-md');
        btn.classList.remove('bg-[#f0f1f3]', 'text-[#343A40]');

        this.renderContent();
      });
    });
  },

  // ═══ RENDER DYNAMIC CONTENT ═══
  renderContent() {
    const data = this.content[this.currentTab];
    if (!data) return;

    // What is a X Issue?
    document.getElementById('whatTitle').textContent = data.whatTitle;
    document.getElementById('whatDesc').textContent = data.whatDesc;

    // Steps
    const stepsWrap = document.getElementById('stepsGrid');
    if (stepsWrap) {
      stepsWrap.innerHTML = data.steps.map(s => this.renderStep(s)).join('');
      if (window.lucide) lucide.createIcons();
    }
  },

  // ═══ RENDER EACH STEP ═══
  renderStep(s) {
    return `
      <div class="flex flex-col">
        <!-- Step header -->
        <div class="flex items-start gap-2.5 mb-3">
          <div class="w-6 h-6 rounded-full bg-[#E21B2D] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            ${s.num}
          </div>
          <div>
            <div class="text-[13.5px] font-bold text-[#1a1d21] leading-tight">${s.title}</div>
            <div class="text-[11.5px] text-[#6b7280] mt-1 leading-snug">${s.desc}</div>
          </div>
        </div>

        <!-- Visual -->
        <div class="mt-auto">
          ${this.renderVisual(s.visual)}
        </div>
      </div>
    `;
  },

  // ═══ VISUAL BLOCKS FOR EACH STEP ═══
  renderVisual(type) {
    switch (type) {
      case 'open-garbage':
        return `
          <div class="space-y-2">
            <div class="bg-[#E21B2D] rounded-xl p-3 flex items-center gap-2.5 text-white shadow-md relative">
              <i data-lucide="trash-2" class="w-5 h-5"></i>
              <div>
                <div class="text-[12px] font-bold leading-tight">Report</div>
                <div class="text-[12px] font-bold leading-tight">Garbage</div>
              </div>
              <!-- Cursor -->
              <svg class="absolute right-4 bottom-1 w-4 h-4 text-[#1a1d21] drop-shadow-lg" viewBox="0 0 24 24" fill="white" stroke="#1a1d21" stroke-width="1.5">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
              </svg>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5">
              <i data-lucide="construction" class="w-5 h-5 text-[#343A40]"></i>
              <div>
                <div class="text-[12px] font-bold text-[#343A40] leading-tight">Report</div>
                <div class="text-[12px] font-bold text-[#343A40] leading-tight">Pothole</div>
              </div>
            </div>
          </div>
        `;

      case 'open-pothole':
        return `
          <div class="space-y-2">
            <div class="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5">
              <i data-lucide="trash-2" class="w-5 h-5 text-[#343A40]"></i>
              <div>
                <div class="text-[12px] font-bold text-[#343A40] leading-tight">Report</div>
                <div class="text-[12px] font-bold text-[#343A40] leading-tight">Garbage</div>
              </div>
            </div>
            <div class="bg-[#343A40] rounded-xl p-3 flex items-center gap-2.5 text-white shadow-md relative">
              <i data-lucide="construction" class="w-5 h-5"></i>
              <div>
                <div class="text-[12px] font-bold leading-tight">Report</div>
                <div class="text-[12px] font-bold leading-tight">Pothole</div>
              </div>
              <svg class="absolute right-4 bottom-1 w-4 h-4 drop-shadow-lg" viewBox="0 0 24 24" fill="white" stroke="#1a1d21" stroke-width="1.5">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
              </svg>
            </div>
          </div>
        `;

      case 'upload':
        return `
          <div class="border-2 border-dashed border-[#fbb6bc] bg-[#fff8f9] rounded-xl p-3 text-center">
            <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white mb-1.5 shadow-sm">
              <i data-lucide="image-plus" class="w-4 h-4 text-[#E21B2D]"></i>
            </div>
            <div class="text-[11px] font-bold text-[#1a1d21]">Click to upload an image</div>
            <div class="text-[9.5px] text-[#6b7280] mt-0.5">JPG, PNG (Max 5 MB)</div>
            <div class="mt-2 relative rounded-lg overflow-hidden">
              <img src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=300&h=100&fit=crop&auto=format"
                   alt="" class="w-full h-16 object-cover"
                   onerror="this.parentElement.style.display='none'" />
              <div class="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#E21B2D] flex items-center justify-center">
                <i data-lucide="x" class="w-3 h-3 text-white"></i>
              </div>
            </div>
          </div>
        `;

      case 'title-desc-garbage':
        return `
          <div class="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
            <div>
              <div class="text-[10px] font-semibold text-[#343A40] mb-1">Title</div>
              <div class="text-[11px] text-[#4a5057] bg-gray-50 rounded-md px-2 py-1">Overflowing Dustbin</div>
            </div>
            <div>
              <div class="text-[10px] font-semibold text-[#343A40] mb-1">Description</div>
              <div class="text-[10.5px] text-[#6b7280] leading-snug">Dustbin is overflowing near society gate. Garbage is spread on the road.</div>
              <div class="text-[9.5px] text-[#9ca3af] text-right mt-1">0/300</div>
            </div>
          </div>
        `;

      case 'title-desc-pothole':
        return `
          <div class="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
            <div>
              <div class="text-[10px] font-semibold text-[#343A40] mb-1">Title</div>
              <div class="text-[11px] text-[#4a5057] bg-gray-50 rounded-md px-2 py-1">Big Pothole on SV Road</div>
            </div>
            <div>
              <div class="text-[10px] font-semibold text-[#343A40] mb-1">Description</div>
              <div class="text-[10.5px] text-[#6b7280] leading-snug">Large pothole causing traffic and damage to vehicles.</div>
              <div class="text-[9.5px] text-[#9ca3af] text-right mt-1">0/300</div>
            </div>
          </div>
        `;

      case 'location':
        return `
          <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <!-- Map placeholder -->
            <div class="relative h-20 bg-gradient-to-br from-[#d9e8e0] to-[#c8dbc9]">
              <!-- Grid pattern -->
              <svg class="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 80" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="200" y2="25" stroke="#7a9b7d" stroke-width="1"/>
                <line x1="0" y1="50" x2="200" y2="48" stroke="#7a9b7d" stroke-width="1"/>
                <line x1="50" y1="0" x2="55" y2="80" stroke="#7a9b7d" stroke-width="1"/>
                <line x1="140" y1="0" x2="145" y2="80" stroke="#7a9b7d" stroke-width="1"/>
              </svg>
              <!-- Location pin -->
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <svg class="w-7 h-9 drop-shadow-md" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26c0-8.8-7.2-16-16-16z" fill="#E21B2D"/>
                  <circle cx="16" cy="16" r="6" fill="#fff"/>
                </svg>
              </div>
              <!-- Select Location badge -->
              <div class="absolute top-2 left-2 bg-white text-[9px] font-semibold text-[#E21B2D] px-2 py-0.5 rounded shadow-sm">
                Select Location
              </div>
            </div>
            <!-- Buttons -->
            <div class="p-2 space-y-1.5">
              <div class="flex items-center gap-2 text-[10.5px] text-[#343A40]">
                <i data-lucide="crosshair" class="w-3 h-3 text-[#E21B2D]"></i>
                Use My Current Location
              </div>
              <div>
                <div class="text-[9.5px] font-semibold text-[#343A40] mb-1">Pincode</div>
                <div class="border border-gray-200 rounded px-2 py-1 text-[10.5px] text-[#4a5057] flex items-center gap-1.5">
                  <i data-lucide="map-pin" class="w-3 h-3 text-gray-400"></i>
                  400101
                </div>
              </div>
            </div>
          </div>
        `;

      case 'issue-type-garbage':
        return `
          <div class="space-y-1.5">
            <div class="bg-[#fff8f9] border border-[#E21B2D] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <i data-lucide="trash-2" class="w-3.5 h-3.5 text-[#E21B2D]"></i>
                <span class="text-[10.5px] font-semibold text-[#E21B2D]">Overflowing Dustbin</span>
              </div>
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-[#E21B2D]" fill="#E21B2D"></i>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="trash" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Waste on Road</span>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Illegal Dumping</span>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="truck" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Uncollected Waste</span>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="more-horizontal" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Other</span>
            </div>
          </div>
        `;

      case 'issue-type-pothole':
        return `
          <div class="space-y-1.5">
            <div class="bg-[#f5f6f7] border border-[#343A40] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <i data-lucide="construction" class="w-3.5 h-3.5 text-[#343A40]"></i>
                <span class="text-[10.5px] font-semibold text-[#343A40]">Pothole</span>
              </div>
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-[#343A40]" fill="#343A40"></i>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="route" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Damaged Road</span>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Road Sinkage</span>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="circle-dot" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Loose Gravel</span>
            </div>
            <div class="bg-[#f9fafb] border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <i data-lucide="more-horizontal" class="w-3.5 h-3.5 text-[#6b7280]"></i>
              <span class="text-[10.5px] text-[#4a5057]">Other</span>
            </div>
          </div>
        `;

      case 'submit':
        return `
          <div class="space-y-2">
            <div class="bg-[#E21B2D] rounded-xl p-3 flex items-center justify-center gap-2 text-white shadow-md relative">
              <i data-lucide="send" class="w-4 h-4"></i>
              <span class="text-[12px] font-bold">Submit Report</span>
              <svg class="absolute right-3 bottom-1 w-4 h-4 drop-shadow-lg" viewBox="0 0 24 24" fill="white" stroke="#1a1d21" stroke-width="1.5">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
              </svg>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mb-1.5">
                <i data-lucide="check" class="w-4 h-4 text-green-600" stroke-width="3"></i>
              </div>
              <div class="text-[11.5px] font-bold text-green-700">Report Submitted!</div>
              <div class="text-[10px] text-[#6b7280] mt-0.5 leading-snug">Your complaint has been successfully submitted. Track it in 'My Complaints' section.</div>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => HowToReport.init());
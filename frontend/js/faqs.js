// frontend/js/faqs.js
// FAQs page — category switching + accordion

const FAQPage = {
  user: null,
  activeCategory: 'general',
  openIndex: 0, // first question open by default

  // ═══════════════════════════════════════════════════════
  // ALL CATEGORIES + QUESTIONS + ANSWERS
  // ═══════════════════════════════════════════════════════
  data: {
    general: {
      title: 'General FAQs',
      subtitle: 'Here are the most common questions about the Smart City platform.',
      icon: 'help-circle',
      questions: [
        {
          q: 'What is Smart City?',
          a: 'Smart City is a citizen-powered platform that allows you to report civic issues like garbage, potholes and other infrastructure problems. Your reports help the authorities take quick action and make the city cleaner, safer and better for everyone.'
        },
        {
          q: 'Who can use this platform?',
          a: 'Any resident of Mumbai can use Smart City. All you need is a valid mobile number to create an account. Citizens, municipal authorities and service providers all interact through this single platform.'
        },
        {
          q: 'Is this platform free to use?',
          a: 'Yes, Smart City is completely free for all citizens. There are no charges for creating an account, reporting issues or tracking your complaints.'
        },
        {
          q: 'Which types of issues can I report?',
          a: 'You can report three main categories of issues — Garbage (overflowing dustbins, waste on roads, illegal dumping), Potholes (damaged roads, road cracks), and Other civic issues (street lights, water logging, stray animals, damaged public property).'
        },
        {
          q: 'How will my report be used?',
          a: 'Your report is reviewed by the admin team, assigned to the relevant service provider (like myBMC), and tracked until resolution. All updates are visible to you through the Track Status page.'
        },
        {
          q: 'Can I report an issue anonymously?',
          a: 'No, you need to be logged in to submit a report. This helps the authorities follow up with you for verification or additional information. However, your personal details are never shown publicly.'
        },
        {
          q: 'How do I get updates about my complaint?',
          a: 'You will receive notifications on the Notifications page whenever the status of your complaint changes. You can also check the Track Status page any time for the latest update.'
        },
        {
          q: 'What should I do if my issue is not resolved?',
          a: 'If your complaint shows "Resolved" but the issue still exists, you can contact our support team through the Help & Support page. Please include your Complaint ID so we can look into it quickly.'
        }
      ]
    },

    garbage: {
      title: 'Garbage Related FAQs',
      subtitle: 'Common questions about garbage reporting and collection.',
      icon: 'trash-2',
      questions: [
        {
          q: 'What types of garbage issues can I report?',
          a: 'You can report overflowing dustbins, uncollected waste, garbage dumped on roads, illegal dumping in public areas, and any other waste-related problem in your neighbourhood.'
        },
        {
          q: 'How do I upload a photo of the garbage?',
          a: 'While making a report, use the "Upload Image" option on the Report Garbage page. You can either select a file from your device or use the camera to take a fresh photo. Only JPG, PNG or PDF files up to 5 MB are accepted.'
        },
        {
          q: 'How long does it take to resolve a garbage complaint?',
          a: 'Most garbage complaints are reviewed within 24 hours and resolved within 2-3 working days, depending on the location and severity. Complex cases like illegal dumping may take longer.'
        },
        {
          q: 'Can I report garbage on private property?',
          a: 'Smart City handles public civic issues only. Garbage on private property (inside a society compound or a private building) should be reported to the respective property management. However, if it is affecting public spaces or roads, you can report it here.'
        },
        {
          q: 'What if the garbage is not collected after reporting?',
          a: 'If your complaint has been marked resolved but the garbage is still there, please contact support with your Complaint ID. Our team will re-verify and escalate the matter to the service provider.'
        },
        {
          q: 'Can I report the same garbage issue multiple times?',
          a: 'No. Multiple reports for the same issue cause confusion and delay action. If you want to add more information, please contact support and mention your original Complaint ID.'
        }
      ]
    },

    pothole: {
      title: 'Pothole Related FAQs',
      subtitle: 'Common questions about pothole reporting and road maintenance.',
      icon: 'construction',
      questions: [
        {
          q: 'What types of road issues can I report?',
          a: 'You can report potholes, damaged road surfaces, road cracks, sinkholes, loose gravel and any other unsafe road conditions that could damage vehicles or cause accidents.'
        },
        {
          q: 'How do I report a pothole accurately?',
          a: 'Take a clear photo of the pothole, provide a short title (like "Big Pothole on SV Road"), mark the exact location on the map, and add the pincode. The more accurate the details, the faster the repair.'
        },
        {
          q: 'How long does road repair take?',
          a: 'Small potholes are usually repaired within 3-5 working days after the complaint is assigned. Larger road damage or reconstruction work may take 2-4 weeks depending on the severity and budget approval.'
        },
        {
          q: 'Can I report a pothole on a highway?',
          a: 'Yes, if it is a Mumbai city road, you can report it. For National Highways or Expressways, please report to NHAI or MSRDC directly. You can still submit here and we will forward it if applicable.'
        },
        {
          q: 'What if a pothole damages my vehicle?',
          a: 'Smart City cannot process damage claims. However, keeping a record of the pothole complaint (with your Complaint ID) can help you if you decide to file a formal complaint with the municipal corporation.'
        },
        {
          q: 'Can I suggest road maintenance in my area?',
          a: 'Yes. If you notice a road that needs preventive maintenance (before potholes form), you can still report it as a pothole issue with the observation "Seen on daily basis". The authorities will assess it.'
        }
      ]
    },

    others: {
      title: 'Other Issues FAQs',
      subtitle: 'Common questions about reporting other civic issues.',
      icon: 'layout-grid',
      questions: [
        {
          q: 'What falls under "Other Issues"?',
          a: 'Other Issues covers street lights not working, water logging, stray animal problems, broken traffic signals, damaged public property (benches, bus stops, footpaths) and similar civic problems not covered under garbage or potholes.'
        },
        {
          q: 'How do I report a street light problem?',
          a: 'Go to Report Others, upload a photo of the dark street or the broken light pole, mark the location, and select "Street Light Not Working" as the observation. Provide the nearby landmark for faster action.'
        },
        {
          q: 'Can I report stray animal issues?',
          a: 'Yes. You can report stray dog or cattle issues that cause public safety concerns. Provide clear photos and mention if the animal appears injured or aggressive. Rescue teams will be notified accordingly.'
        },
        {
          q: 'How do I report water logging?',
          a: 'Report water logging by uploading a photo showing the affected area, marking the location, and selecting "Water Logging" as the observation. This helps drainage teams respond during heavy rains.'
        },
        {
          q: 'Can I report broken public property?',
          a: 'Yes. Broken benches, damaged bus stops, footpath issues, broken railings, damaged signage etc. can all be reported. Include photos and precise location for accurate action.'
        },
        {
          q: 'What about illegal construction or encroachment?',
          a: 'Illegal construction and encroachments are handled by the Building Proposal department. Please report these directly to BMC through their official channels, as Smart City currently focuses on core civic issues.'
        }
      ]
    },

    tracking: {
      title: 'Tracking & Status FAQs',
      subtitle: 'Learn how to track your complaints and understand status updates.',
      icon: 'map-pin',
      questions: [
        {
          q: 'How do I track my complaint?',
          a: 'Go to the Track Status page and enter your Complaint ID (like SC-2026-0001). You can also click any complaint in My Complaints to see its full tracking timeline.'
        },
        {
          q: 'What do the different status labels mean?',
          a: 'Submitted — your complaint has been received. In Review — admin is checking the details. In Progress — the service provider has been assigned and work has started. Resolved — the issue has been fixed.'
        },
        {
          q: 'How long does each stage take?',
          a: 'Submitted → In Review usually takes a few hours. In Review → In Progress takes 24-48 hours. In Progress → Resolved depends on the type of issue, typically 2-7 days for most complaints.'
        },
        {
          q: 'Will I get notified when the status changes?',
          a: 'Yes. Every time your complaint status changes, you will receive a notification in the Notifications section. You can also check the Track Status page for the complete history.'
        },
        {
          q: 'Can I cancel a complaint after submitting?',
          a: 'Currently complaints cannot be cancelled after submission. If you submitted something by mistake, please contact support immediately with your Complaint ID.'
        },
        {
          q: 'What if my complaint is marked resolved but issue persists?',
          a: 'Please contact our support team through Help & Support with your Complaint ID, photos of the current situation, and a brief description. The admin will re-open the case and assign it again.'
        }
      ]
    },

    account: {
      title: 'Account & Profile FAQs',
      subtitle: 'Login, signup and account related questions.',
      icon: 'user',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click on Signup from the login page. Fill in your name, gender, mobile number, locality, pincode, and create a username and password. You will be automatically logged in after signup.'
        },
        {
          q: 'How do I reset my password?',
          a: 'Currently password reset is done from your Profile page. Go to Profile → Account Information → Change Password. Enter your current password and the new password to update it.'
        },
        {
          q: 'Can I change my username?',
          a: 'Usernames cannot be changed after signup as they are used as your unique login identifier. If you need to change it, please contact support with a valid reason.'
        },
        {
          q: 'How do I update my profile information?',
          a: 'Go to your Profile page, click on the Edit button in the Personal Information section, make the changes, and click Save Changes. Changes are applied immediately.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Currently self-service account deletion is not available. Please contact support if you wish to delete your account. Note that your past complaints will remain in the system for civic records.'
        },
        {
          q: 'Why do I need to provide my mobile number?',
          a: 'Your mobile number helps the authorities contact you for verification of complaints, additional information, or follow-up after work is completed. It is kept confidential and never shown publicly.'
        }
      ]
    }
  },

  // ═══════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════
  async init() {
    this.user = await Guard.protect('citizen');
    if (!this.user) return;

    Guard.startHeartbeat();
    SideMenu.init(this.user);

    this.renderUser();
    this.initMenu();
    this.initLogout();
    this.initBackButton();
    this.initCategoryNav();
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

  // ═══ CATEGORY NAV ═══
  initCategoryNav() {
    document.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        if (cat === this.activeCategory) return;
        this.activeCategory = cat;
        this.openIndex = 0; // reset accordion to first
        this.updateCategoryStates();
        this.renderContent();
      });
    });
  },

  updateCategoryStates() {
    document.querySelectorAll('[data-cat]').forEach(btn => {
      const cat = btn.dataset.cat;
      const inner = btn.querySelector('.cat-inner');
      if (cat === this.activeCategory) {
        btn.classList.add('bg-[#ffe5e8]', 'border', 'border-[#fdd]');
        btn.classList.remove('bg-white');
        if (inner) {
          inner.classList.add('text-[#E21B2D]');
          inner.classList.remove('text-[#1a1d21]');
        }
      } else {
        btn.classList.remove('bg-[#ffe5e8]', 'border', 'border-[#fdd]');
        btn.classList.add('bg-white');
        if (inner) {
          inner.classList.remove('text-[#E21B2D]');
          inner.classList.add('text-[#1a1d21]');
        }
      }
    });
  },

  // ═══ RENDER RIGHT SIDE ═══
  renderContent() {
    const cat = this.data[this.activeCategory];
    if (!cat) return;

    document.getElementById('faqTitle').textContent = cat.title;
    document.getElementById('faqSubtitle').textContent = cat.subtitle;

    const wrap = document.getElementById('accordionWrap');
    if (!wrap) return;

    wrap.innerHTML = cat.questions.map((item, i) => this.renderAccordionItem(item, i)).join('');

    // Attach click handlers
    wrap.querySelectorAll('[data-acc]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.acc, 10);
        this.toggleAccordion(idx);
      });
    });

    if (window.lucide) lucide.createIcons();
  },

  renderAccordionItem(item, idx) {
    const isOpen = idx === this.openIndex;
    return `
      <div class="border border-gray-100 rounded-2xl overflow-hidden bg-white transition-shadow ${isOpen ? 'shadow-md' : 'hover:shadow-sm'}">
        <button data-acc="${idx}"
                class="w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-colors ${isOpen ? 'bg-[#fff5f6]' : 'hover:bg-gray-50'}">
          <div class="w-9 h-9 rounded-full bg-[#ffe5e8] flex items-center justify-center flex-shrink-0">
            <span class="text-[12px] font-bold text-[#E21B2D]">Q${idx + 1}</span>
          </div>
          <span class="flex-1 text-[14.5px] sm:text-[15.5px] font-semibold text-[#1a1d21] leading-snug">
            ${this.escape(item.q)}
          </span>
          <i data-lucide="${isOpen ? 'chevron-up' : 'chevron-down'}" class="w-5 h-5 text-[#E21B2D] flex-shrink-0"></i>
        </button>
        ${isOpen ? `
          <div class="px-4 sm:px-5 pb-5 pt-1 bg-[#fff5f6]">
            <div class="pl-13 sm:pl-14 text-[13px] sm:text-[13.5px] text-[#4a5057] leading-relaxed">
              ${this.escape(item.a)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  toggleAccordion(idx) {
    if (this.openIndex === idx) {
      // close if same
      this.openIndex = -1;
    } else {
      this.openIndex = idx;
    }
    this.renderContent();
  },

  escape(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
};

document.addEventListener('DOMContentLoaded', () => FAQPage.init());
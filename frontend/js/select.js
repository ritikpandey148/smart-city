// frontend/js/select.js
// Shared searchable select component

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
    setOptions(opts) { allOptions = opts; renderOptions(searchInput.value); },
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
    },
    setValue(val) {
      const opt = allOptions.find(o => String(typeof o === 'string' ? o : o.value) === String(val));
      if (opt) select(val);
    }
  };
}
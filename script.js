const reveals = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

reveals.forEach((el) => observer.observe(el));

// Maker: category tabs switch which items are offered for placement
const makerTabs = document.querySelectorAll('.maker-tab');
makerTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const cat = tab.dataset.cat;
    makerTabs.forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('[data-cat-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.catPanel !== cat;
    });
  });
});

// Maker: tap-to-place + this-session ranking (sessionStorage only, no server aggregation yet)
const MAKER_KEY = 'thirdplaceMakerPlacements';
const makerDropzone = document.getElementById('maker-dropzone');
const makerEmptyMsg = document.getElementById('maker-dropzone-empty');
const makerPlacedEl = document.getElementById('maker-placed');
const makerCountEl = document.getElementById('maker-count');
const makerRankingEl = document.getElementById('maker-ranking-list');

if (makerDropzone) {
  const loadPlacements = () => {
    try {
      const raw = sessionStorage.getItem(MAKER_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const savePlacements = (list) => {
    try {
      sessionStorage.setItem(MAKER_KEY, JSON.stringify(list));
    } catch {
      /* sessionStorage unavailable (private mode etc.) — placements just won't persist across reload */
    }
  };

  let placements = loadPlacements();

  const render = () => {
    makerCountEl.textContent = placements.length;
    makerEmptyMsg.hidden = placements.length > 0;

    makerPlacedEl.innerHTML = '';
    placements.forEach((p) => {
      const span = document.createElement('span');
      span.textContent = p.item;
      span.title = p.label;
      makerPlacedEl.appendChild(span);
    });

    if (placements.length === 0) {
      makerRankingEl.innerHTML = '<p class="empty">まだ何も配置されていません</p>';
      return;
    }
    const counts = new Map();
    placements.forEach((p) => {
      const key = p.item;
      const entry = counts.get(key) || { item: p.item, label: p.label, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
    makerRankingEl.innerHTML = ranked
      .map(
        (r, i) => `
        <div class="maker-rank-row">
          <span class="rk">${i + 1}</span>
          <span class="emoji">${r.item}</span>
          <span class="label">${r.label}</span>
          <span class="count">${r.count}</span>
        </div>`
      )
      .join('');
  };

  document.querySelectorAll('.maker-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      placements.push({ item: btn.dataset.item, label: btn.dataset.label });
      savePlacements(placements);
      render();
    });
  });

  render();
}

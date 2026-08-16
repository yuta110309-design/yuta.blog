const MEMBERS_API_BASE = 'https://yuta-blog.vercel.app';

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

// Header: hide on scroll down, show on scroll up. A plain sticky header
// permanently covers whatever content the page happens to be scrolled to,
// which can leave buttons right at the top of the viewport unreachable.
const siteHeader = document.querySelector('.site-header');
let lastScrollY = window.scrollY;
window.addEventListener(
  'scroll',
  () => {
    const currentY = window.scrollY;
    if (currentY <= siteHeader.offsetHeight || currentY < lastScrollY) {
      siteHeader.classList.remove('is-hidden');
    } else if (currentY > lastScrollY) {
      siteHeader.classList.add('is-hidden');
    }
    lastScrollY = currentY;
  },
  { passive: true }
);

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

// Signup modal: opened from the membership plan buttons, posts to thirdplace-app's /api/members
const PLAN_LABELS = { free: 'Free', standard: 'Standard（Founding Member）', premium: 'Premium' };

const signupOverlay = document.getElementById('signup-overlay');
if (signupOverlay) {
  const formView = document.getElementById('signup-form-view');
  const successView = document.getElementById('signup-success-view');
  const form = document.getElementById('signup-form');
  const planLabel = document.getElementById('signup-plan-label');
  const planInput = document.getElementById('signup-plan');
  const errorEl = document.getElementById('signup-error');
  const submitBtn = document.getElementById('signup-submit');

  function openSignup(plan) {
    planInput.value = plan;
    planLabel.textContent = PLAN_LABELS[plan] || plan;
    errorEl.hidden = true;
    formView.hidden = false;
    successView.hidden = true;
    form.reset();
    planInput.value = plan;
    signupOverlay.hidden = false;
    document.getElementById('signup-name').focus();
  }

  function closeSignup() {
    signupOverlay.hidden = true;
  }

  document.querySelectorAll('[data-open-signup]').forEach((btn) => {
    btn.addEventListener('click', () => openSignup(btn.dataset.openSignup));
  });
  document.getElementById('signup-close').addEventListener('click', closeSignup);
  document.getElementById('signup-done').addEventListener('click', closeSignup);
  signupOverlay.addEventListener('click', (e) => {
    if (e.target === signupOverlay) closeSignup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !signupOverlay.hidden) closeSignup();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    if (!MEMBERS_API_BASE) {
      errorEl.textContent = '現在申し込みフォームは準備中です。お手数ですがLINEまたはInstagramからご連絡ください。';
      errorEl.hidden = false;
      return;
    }

    const payload = {
      name: document.getElementById('signup-name').value.trim(),
      contact: document.getElementById('signup-contact').value.trim(),
      plan: planInput.value,
      message: document.getElementById('signup-message').value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = '送信中…';
    try {
      const res = await fetch(`${MEMBERS_API_BASE}/api/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('failed');
      formView.hidden = true;
      successView.hidden = false;
    } catch {
      errorEl.textContent = '送信に失敗しました。しばらくしてからもう一度お試しください。';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '送信する';
    }
  });
}

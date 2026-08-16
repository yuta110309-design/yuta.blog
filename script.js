const APP_API_BASE = 'https://yuta-blog.vercel.app';

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

// Event RSVP: mirrors thirdplace-app's lib/events.ts recurrence config so
// occ_date bucketing lines up with the same Supabase responses rows.
const RSVP_EVENTS = {
  yoruran: { recurrence: { mode: 'weekly', weekday: 1, time: '20:00' }, deadlineDaysBefore: 1, capacity: 10 },
  'karuizawa-tour': { recurrence: { mode: 'once', dateISO: null }, deadlineDaysBefore: null, capacity: 12 },
  futsal: { recurrence: { mode: 'once', dateISO: '2026-09-21T19:00:00' }, deadlineDaysBefore: 7, capacity: 25 }
};

function rsvpPad(n) {
  return n < 10 ? '0' + n : '' + n;
}
function rsvpDateKey(d) {
  return d.getFullYear() + '-' + rsvpPad(d.getMonth() + 1) + '-' + rsvpPad(d.getDate());
}
function rsvpApplyTime(d, timeStr) {
  const parts = (timeStr || '00:00').split(':').map(Number);
  d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
  return d;
}
function rsvpComputeOccurrence(recurrence, from) {
  from = from || new Date();
  if (!recurrence) return null;
  if (recurrence.mode === 'once') {
    return recurrence.dateISO ? new Date(recurrence.dateISO) : null;
  }
  if (recurrence.mode === 'weekly') {
    const candidate = new Date(from);
    const diff = (((recurrence.weekday || 0) - from.getDay()) + 7) % 7;
    candidate.setDate(candidate.getDate() + diff);
    rsvpApplyTime(candidate, recurrence.time);
    if (candidate < from) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }
  return null;
}

const eventRows = document.querySelectorAll('.event-row[data-event-id]');
if (eventRows.length && APP_API_BASE) {
  let allResponses = [];

  function rsvpStatusLabel(s) {
    return s === 'go' ? '参加' : s === 'no' ? '不参加' : '未定';
  }

  function renderRow(row) {
    const eventId = row.dataset.eventId;
    const cfg = RSVP_EVENTS[eventId];
    if (!cfg) return;

    const now = new Date();
    const occurrence = rsvpComputeOccurrence(cfg.recurrence, now);
    const occDate = occurrence ? rsvpDateKey(occurrence) : '';

    let deadline = null;
    if (occurrence && cfg.deadlineDaysBefore != null) {
      deadline = new Date(occurrence.getTime() - cfg.deadlineDaysBefore * 86400000);
      deadline.setHours(23, 59, 59, 999);
    }
    const pastDeadline = deadline ? now > deadline : false;

    const list = allResponses.filter((r) => r.event_id === eventId && (r.occ_date || '') === occDate);
    const goCount = list.filter((r) => r.status === 'go').length;
    const full = cfg.capacity != null && goCount >= cfg.capacity;

    const countTag = row.querySelector('.event-rsvp-count');
    if (countTag) countTag.textContent = '👥 参加 ' + goCount + '/' + cfg.capacity + '名';

    const body = row.querySelector('.event-rsvp-body');
    if (!body) return;
    const draft = row._rsvpDraft || { name: '', status: null };
    row._rsvpDraft = draft;

    if (pastDeadline) {
      body.innerHTML = '<p class="rsvp-closed">募集を締め切りました</p>';
      return;
    }

    const alreadyGoing = list.some((r) => r.name === draft.name.trim() && r.status === 'go');
    const options = [
      { value: 'go', label: '参加' },
      { value: 'maybe', label: '未定' },
      { value: 'no', label: '不参加' }
    ];

    body.innerHTML =
      '<label class="field-label" for="rsvp-name-' +
      eventId +
      '">お名前</label>' +
      '<input class="field-input" id="rsvp-name-' +
      eventId +
      '" type="text" placeholder="山田 太郎" value="' +
      draft.name.replace(/"/g, '&quot;') +
      '">' +
      (full && !alreadyGoing ? '<p class="rsvp-hint">定員に達しているため「参加」は選択できません</p>' : '') +
      '<div class="rsvp-status-row">' +
      options
        .map((opt) => {
          const disabled = opt.value === 'go' && full && !alreadyGoing;
          return (
            '<button type="button" class="rsvp-status-btn' +
            (draft.status === opt.value ? ' is-selected' : '') +
            '"' +
            (disabled ? ' disabled' : '') +
            ' data-status="' +
            opt.value +
            '">' +
            opt.label +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      '<button type="button" class="rsvp-submit">' + (draft.message || '送信する') + '</button>';

    body.querySelector('input').addEventListener('input', (e) => {
      draft.name = e.target.value;
    });
    body.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.status = btn.dataset.status;
        renderRow(row);
      });
    });
    body.querySelector('.rsvp-submit').addEventListener('click', async () => {
      if (!draft.name.trim() || !draft.status) {
        draft.message = 'お名前と出欠を選んでください';
        renderRow(row);
        setTimeout(() => {
          draft.message = null;
          renderRow(row);
        }, 1800);
        return;
      }
      try {
        const res = await fetch(APP_API_BASE + '/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, occDate, name: draft.name.trim(), status: draft.status })
        });
        if (!res.ok) throw new Error('failed');
        await loadResponsesAndRender();
      } catch {
        draft.message = '送信に失敗しました';
        renderRow(row);
      }
    });
  }

  async function loadResponsesAndRender() {
    try {
      const res = await fetch(APP_API_BASE + '/api/responses', { cache: 'no-store' });
      allResponses = res.ok ? await res.json() : [];
    } catch {
      allResponses = [];
    }
    eventRows.forEach(renderRow);
  }

  eventRows.forEach((row) => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rsvp-toggle';
    toggle.textContent = '出欠を回答する';

    const countTag = document.createElement('span');
    countTag.className = 'event-rsvp-count';

    const meta = row.querySelector('.event-meta');
    if (meta) meta.appendChild(countTag);

    const body = document.createElement('div');
    body.className = 'event-rsvp-body';
    body.hidden = true;

    const link = row.querySelector('.event-link');
    link.insertAdjacentElement('afterend', body);
    link.insertAdjacentElement('afterend', toggle);

    toggle.addEventListener('click', () => {
      body.hidden = !body.hidden;
      toggle.textContent = body.hidden ? '出欠を回答する' : '閉じる';
    });
  });

  loadResponsesAndRender();
}

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

    if (!APP_API_BASE) {
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
      const res = await fetch(`${APP_API_BASE}/api/members`, {
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

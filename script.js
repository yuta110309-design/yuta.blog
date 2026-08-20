const APP_API_BASE = 'https://yuta-blog.vercel.app';

// リロード時に先頭へ戻す処理は index.html の <head> インラインスクリプトで
// スクロール発生前（最速タイミング）に行っている。

// 見出し・リード文を下から静かに立ち上げるアニメーション用に、
// テキストを1枚のspanで包む（overflow:hiddenでマスクして動かすため）。
// .reveal（セクションのコンテナ）が visible になった瞬間にCSS側で発火する。
document.querySelectorAll('.eyebrow:not(#signup-plan-label):not(#inquiry-type-label), .section-title').forEach((el) => {
  el.classList.add('text-reveal');
  el.innerHTML = `<span>${el.innerHTML}</span>`;
});

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

// ナビ: 右上のハンバーガーアイコンをタップすると項目一覧が開閉する。
const navToggle = document.getElementById('nav-toggle');
const navPanel = document.getElementById('nav-panel');
if (navToggle && navPanel) {
  function closeNavPanel() {
    navPanel.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
  }
  function openNavPanel() {
    navPanel.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'メニューを閉じる');
  }
  navToggle.addEventListener('click', () => {
    if (navPanel.classList.contains('open')) closeNavPanel();
    else openNavPanel();
  });
  navPanel.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNavPanel));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navPanel.classList.contains('open')) closeNavPanel();
  });
  document.addEventListener('click', (e) => {
    if (
      navPanel.classList.contains('open') &&
      !navPanel.contains(e.target) &&
      !navToggle.contains(e.target)
    ) {
      closeNavPanel();
    }
  });
}

// North Starの地図: 恵比寿・軽井沢のマーカーをタップすると、その土地の紹介文を表示する。
const MAP_PLACES = {
  ebisu: {
    label: 'EBISU — 東京',
    text: '洗練されたジムやカフェが並ぶ、大人の街。THE THIRDPLACE EBISUの拠点であり、47都道府県へ広がっていく最初の1マス。'
  },
  karuizawa: {
    label: 'KARUIZAWA — 長野',
    text: '避暑地として愛されてきた、緑と静けさに満ちた高原リゾート。都会の喧騒を離れ、サウナと語らいを楽しむ、2マス目の拠点。'
  }
};
const mapMarkers = document.querySelectorAll('.jp-marker');
const mapInfo = document.getElementById('map-info');
const mapInfoPlace = document.getElementById('map-info-place');
const mapInfoText = document.getElementById('map-info-text');
if (mapMarkers.length && mapInfo && mapInfoPlace && mapInfoText) {
  function showMapPlace(marker) {
    const isActive = marker.getAttribute('aria-pressed') === 'true';
    mapMarkers.forEach((m) => m.setAttribute('aria-pressed', 'false'));
    if (isActive) {
      mapInfo.hidden = true;
      return;
    }
    const place = MAP_PLACES[marker.dataset.place];
    if (!place) return;
    marker.setAttribute('aria-pressed', 'true');
    mapInfoPlace.textContent = place.label;
    mapInfoText.textContent = place.text;
    mapInfo.hidden = false;
  }
  mapMarkers.forEach((marker) => {
    marker.addEventListener('click', () => showMapPlace(marker));
    marker.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showMapPlace(marker);
      }
    });
  });
}

// 同姓同名の別人を誤って同一回答者として扱わないよう、端末ごとのIDで判定する
// （名前の文字列一致ではない）。thirdplace-app側（lib/deviceId.ts）と同じ考え方。
function getDeviceId() {
  try {
    let id = localStorage.getItem('thirdplaceDeviceId');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem('thirdplaceDeviceId', id);
    }
    return id;
  } catch {
    return '';
  }
}
const RSVP_DEVICE_ID = getDeviceId();

// Event RSVP: mirrors thirdplace-app's lib/events.ts recurrence config so
// occ_date bucketing lines up with the same Supabase responses rows.
const RSVP_EVENTS = {
  yoruran: { recurrence: { mode: 'weekly', weekday: 1, time: '20:00' }, deadlineDaysBefore: 0, capacity: 10 },
  'karuizawa-tour': { recurrence: { mode: 'once', dateISO: '2026-09-17T11:00:00' }, deadlineDaysBefore: null, capacity: 15 },
  futsal: {
    recurrence: { mode: 'once', dateISO: '2026-09-21T19:00:00' },
    deadlineDaysBefore: 7,
    capacity: 25,
    extraFields: [
      { key: 'referrer', label: '紹介者のお名前（いれば）', type: 'text' },
      { key: 'payment', label: '当日決済方法', type: 'select', options: ['現金', 'PayPay'] },
      { key: 'job', label: 'お仕事', type: 'text' }
    ]
  }
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
// 「来週は無理だが再来週は行きたい」のように先の回にも予約できるよう、
// 直近の occurrence だけでなく、その先何回分かをまとめて返す。
function rsvpUpcomingOccurrences(recurrence, from, count) {
  const list = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const occ = rsvpComputeOccurrence(recurrence, cursor);
    if (!occ) break;
    list.push(occ);
    cursor = new Date(occ.getTime() + 1);
  }
  return list;
}
const RSVP_WEEKDAY_KANJI = ['日', '月', '火', '水', '木', '金', '土'];
function rsvpFormatDateLabel(d) {
  return (d.getMonth() + 1) + '/' + d.getDate() + '(' + RSVP_WEEKDAY_KANJI[d.getDay()] + ')';
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
    const isWeekly = cfg.recurrence.mode === 'weekly';
    // 「来週は無理だが再来週は行きたい」に対応するため、定例イベントは直近5回分から
    // 開催日を選べるようにする（単発イベントは従来通り1回だけ）。
    const occurrenceOptions = isWeekly
      ? rsvpUpcomingOccurrences(cfg.recurrence, now, 5)
      : [rsvpComputeOccurrence(cfg.recurrence, now)].filter(Boolean);
    const nextOccurrence = occurrenceOptions[0] || null;

    // 定例（毎週）イベントは開催日が固定文言だと過去日のまま残ってしまうため、
    // 次回の開催日を毎回計算して表示を更新する（単発イベントは元の表記のまま）。
    if (isWeekly && nextOccurrence) {
      const dateEl = row.querySelector('.event-date');
      const firstNode = dateEl && dateEl.firstChild;
      if (firstNode && firstNode.nodeType === Node.TEXT_NODE) {
        firstNode.textContent = String(nextOccurrence.getDate());
      }
    }

    function isPastDeadline(occ) {
      if (!occ || cfg.deadlineDaysBefore == null) return false;
      // 当日締切（0日前）の場合、日付だけで区切ると開始時刻を過ぎても
      // 「その日はまだ23:59:59まで受付中」になってしまうため、開始時刻そのものを締切にする。
      if (cfg.deadlineDaysBefore === 0) return now > occ;
      const deadline = new Date(occ.getTime() - cfg.deadlineDaysBefore * 86400000);
      deadline.setHours(23, 59, 59, 999);
      return now > deadline;
    }

    // 折りたたみ時のバッジは、常に直近開催分の人数を表示する
    const nextOccDate = nextOccurrence ? rsvpDateKey(nextOccurrence) : '';
    const nextGoCount = allResponses.filter(
      (r) => r.event_id === eventId && (r.occ_date || '') === nextOccDate && r.status === 'go'
    ).length;
    const countTag = row.querySelector('.event-rsvp-count');
    if (countTag) countTag.textContent = '👥 参加 ' + nextGoCount + '/' + cfg.capacity + '名';

    const body = row.querySelector('.event-rsvp-body');
    if (!body) return;
    const draft = row._rsvpDraft || { name: '', email: '', status: null, occDate: null, saved: false, extra: {} };
    row._rsvpDraft = draft;

    // フォーム内で選択中の開催日（未選択、または選び直しで無効になった場合は
    // 締切前の一番近い回にフォールバックする）
    let selected = occurrenceOptions.find((o) => rsvpDateKey(o) === draft.occDate);
    if (!selected) {
      selected = occurrenceOptions.find((o) => !isPastDeadline(o)) || nextOccurrence;
      draft.occDate = selected ? rsvpDateKey(selected) : '';
    }
    const occDate = draft.occDate;
    const selectedPastDeadline = isPastDeadline(selected);

    const list = allResponses.filter((r) => r.event_id === eventId && (r.occ_date || '') === occDate);
    const goCount = list.filter((r) => r.status === 'go').length;
    const full = cfg.capacity != null && goCount >= cfg.capacity;
    const alreadyGoing = list.some((r) => r.device_id === RSVP_DEVICE_ID && r.status === 'go');

    const datePickerHtml =
      isWeekly && occurrenceOptions.length > 1
        ? '<label class="field-label">開催日</label><div class="rsvp-date-row">' +
          occurrenceOptions
            .map((o) => {
              const key = rsvpDateKey(o);
              const closed = isPastDeadline(o);
              return (
                '<button type="button" class="rsvp-date-btn' +
                (key === occDate ? ' is-selected' : '') +
                '"' +
                (closed ? ' disabled' : '') +
                ' data-occdate="' +
                key +
                '">' +
                rsvpFormatDateLabel(o) +
                '</button>'
              );
            })
            .join('') +
          '</div>'
        : '';

    function bindDatePicker() {
      body.querySelectorAll('[data-occdate]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          draft.occDate = btn.dataset.occdate;
          draft.saved = false;
          renderRow(row);
        });
      });
    }

    if (selectedPastDeadline) {
      body.innerHTML =
        datePickerHtml +
        '<p class="rsvp-closed">' +
        (occurrenceOptions.length > 1 ? 'この日程の募集は締め切りました。別の日程を選んでください。' : '募集を締め切りました') +
        '</p>';
      bindDatePicker();
      return;
    }

    const options = [
      { value: 'go', label: '参加' },
      { value: 'maybe', label: '未定' },
      { value: 'no', label: '不参加' }
    ];

    const extraFieldsHtml = (cfg.extraFields || [])
      .map((field) => {
        const fieldId = 'rsvp-extra-' + field.key + '-' + eventId;
        if (field.type === 'select') {
          return (
            '<label class="field-label">' +
            field.label +
            '</label><div class="rsvp-status-row">' +
            (field.options || [])
              .map(
                (opt) =>
                  '<button type="button" class="rsvp-status-btn' +
                  (draft.extra[field.key] === opt ? ' is-selected' : '') +
                  '" data-extra-key="' +
                  field.key +
                  '" data-extra-value="' +
                  opt +
                  '">' +
                  opt +
                  '</button>'
              )
              .join('') +
            '</div>'
          );
        }
        return (
          '<label class="field-label" for="' +
          fieldId +
          '">' +
          field.label +
          '</label><input class="field-input" id="' +
          fieldId +
          '" type="text" data-extra-key="' +
          field.key +
          '" value="' +
          (draft.extra[field.key] || '').replace(/"/g, '&quot;') +
          '">'
        );
      })
      .join('');

    body.innerHTML =
      datePickerHtml +
      '<label class="field-label" for="rsvp-name-' +
      eventId +
      '">お名前</label>' +
      '<input class="field-input" id="rsvp-name-' +
      eventId +
      '" type="text" placeholder="山田 太郎" value="' +
      draft.name.replace(/"/g, '&quot;') +
      '">' +
      '<label class="field-label" for="rsvp-email-' +
      eventId +
      '">メールアドレス（任意・確認メールを送ります）</label>' +
      '<input class="field-input" id="rsvp-email-' +
      eventId +
      '" type="email" placeholder="you@example.com" value="' +
      draft.email.replace(/"/g, '&quot;') +
      '">' +
      extraFieldsHtml +
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
      '<button type="button" class="rsvp-submit' +
      (draft.saved ? ' is-saved' : '') +
      '">' +
      (draft.saved ? '✓ 送信しました' : draft.message || '送信する') +
      '</button>';

    bindDatePicker();
    body.querySelector('#rsvp-name-' + eventId).addEventListener('input', (e) => {
      draft.name = e.target.value;
      draft.saved = false;
    });
    body.querySelector('#rsvp-email-' + eventId).addEventListener('input', (e) => {
      draft.email = e.target.value;
      draft.saved = false;
    });
    body.querySelectorAll('[data-extra-key]').forEach((el) => {
      if (el.tagName === 'INPUT') {
        el.addEventListener('input', (e) => {
          draft.extra[el.dataset.extraKey] = e.target.value;
          draft.saved = false;
        });
      } else {
        el.addEventListener('click', () => {
          draft.extra[el.dataset.extraKey] = el.dataset.extraValue;
          draft.saved = false;
          renderRow(row);
        });
      }
    });
    body.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.status = btn.dataset.status;
        draft.saved = false;
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
          body: JSON.stringify({
            eventId,
            occDate,
            name: draft.name.trim(),
            status: draft.status,
            deviceId: RSVP_DEVICE_ID,
            email: draft.email.trim() || undefined,
            extra: Object.keys(draft.extra).length ? draft.extra : undefined
          })
        });
        if (!res.ok) throw new Error('failed');
        draft.saved = true;
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
    body.innerHTML = '<p class="rsvp-hint">読み込み中…</p>';

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

// Inquiry modal (協賛・提携): opened from the Partners section links, posts to thirdplace-app's /api/inquiries
const INQUIRY_LABELS = { sponsor: '協賛', partner: '提携店舗' };

const inquiryOverlay = document.getElementById('inquiry-overlay');
if (inquiryOverlay) {
  const formView = document.getElementById('inquiry-form-view');
  const successView = document.getElementById('inquiry-success-view');
  const form = document.getElementById('inquiry-form');
  const typeLabelEl = document.getElementById('inquiry-type-label');
  const titleEl = document.getElementById('inquiry-title');
  const typeInput = document.getElementById('inquiry-type');
  const errorEl = document.getElementById('inquiry-error');
  const submitBtn = document.getElementById('inquiry-submit');

  function openInquiry(type) {
    const label = INQUIRY_LABELS[type] || type;
    typeInput.value = type;
    typeLabelEl.textContent = label;
    titleEl.textContent = `${label}のお問い合わせ`;
    errorEl.hidden = true;
    formView.hidden = false;
    successView.hidden = true;
    form.reset();
    typeInput.value = type;
    inquiryOverlay.hidden = false;
    document.getElementById('inquiry-name').focus();
  }

  function closeInquiry() {
    inquiryOverlay.hidden = true;
  }

  document.querySelectorAll('[data-open-inquiry]').forEach((btn) => {
    btn.addEventListener('click', () => openInquiry(btn.dataset.openInquiry));
  });
  document.getElementById('inquiry-close').addEventListener('click', closeInquiry);
  document.getElementById('inquiry-done').addEventListener('click', closeInquiry);
  inquiryOverlay.addEventListener('click', (e) => {
    if (e.target === inquiryOverlay) closeInquiry();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !inquiryOverlay.hidden) closeInquiry();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    if (!APP_API_BASE) {
      errorEl.textContent = '現在お問い合わせフォームは準備中です。お手数ですがInstagramからご連絡ください。';
      errorEl.hidden = false;
      return;
    }

    const payload = {
      name: document.getElementById('inquiry-name').value.trim(),
      contact: document.getElementById('inquiry-contact').value.trim(),
      type: typeInput.value,
      message: document.getElementById('inquiry-message').value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = '送信中…';
    try {
      const res = await fetch(`${APP_API_BASE}/api/inquiries`, {
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

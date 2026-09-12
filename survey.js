const SURVEY_API_BASE = 'https://yuta-blog.vercel.app';

const STAR_COUNT = 5;
const starsEl = document.getElementById('survey-stars');
let satisfactionValue = 0; // 1-5
for (let i = 1; i <= STAR_COUNT; i++) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'survey-star';
  btn.textContent = '★';
  btn.setAttribute('aria-label', `${i}つ星`);
  btn.dataset.value = String(i);
  btn.addEventListener('click', () => {
    satisfactionValue = i;
    renderStars();
  });
  btn.addEventListener('mouseenter', () => renderStars(i));
  btn.addEventListener('mouseleave', () => renderStars());
  starsEl.appendChild(btn);
}
function renderStars(hoverValue) {
  const active = hoverValue || satisfactionValue;
  Array.from(starsEl.children).forEach((btn, idx) => {
    const isOn = idx < active;
    btn.classList.toggle('is-active', isOn && !hoverValue);
    btn.classList.toggle('is-hover', isOn && !!hoverValue);
  });
}
function satisfactionLabel() {
  return '★'.repeat(satisfactionValue);
}

const NPS_MIN = 0, NPS_MAX = 10;
const npsEl = document.getElementById('survey-nps');
let npsValue = null;
for (let i = NPS_MIN; i <= NPS_MAX; i++) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'survey-nps-btn';
  btn.textContent = String(i);
  btn.dataset.value = String(i);
  btn.addEventListener('click', () => {
    npsValue = i;
    Array.from(npsEl.children).forEach((b) => b.classList.toggle('is-active', b === btn));
  });
  npsEl.appendChild(btn);
}

// ピル選択（1グループにつき1つだけアクティブにする）
document.querySelectorAll('.survey-pills').forEach((group) => {
  group.querySelectorAll('.survey-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      group.querySelectorAll('.survey-pill').forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      if (group.dataset.field === 'nextEvent') {
        const otherInput = document.getElementById('survey-next-event-other');
        otherInput.hidden = pill.textContent !== 'その他';
        if (otherInput.hidden) otherInput.value = '';
      }
    });
  });
});

function getPillValue(field) {
  const active = document.querySelector(`.survey-pills[data-field="${field}"] .survey-pill.is-active`);
  return active ? active.textContent : null;
}

const errorEl = document.getElementById('survey-error');
const submitBtn = document.getElementById('survey-submit');

submitBtn.addEventListener('click', async () => {
  const highlight = getPillValue('highlight');
  const willReturn = getPillValue('willReturn');
  const priceImpression = getPillValue('priceImpression');
  const nextEvent = getPillValue('nextEvent');

  if (!satisfactionValue || !highlight || !willReturn || npsValue === null || !priceImpression || !nextEvent) {
    errorEl.textContent = '未回答の項目があります。すべての質問（自由記述以外）にお答えください。';
    errorEl.hidden = false;
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  errorEl.hidden = true;

  submitBtn.disabled = true;
  submitBtn.textContent = '送信中…';

  const payload = {
    name: document.getElementById('survey-name').value.trim() || undefined,
    satisfaction: satisfactionLabel(),
    highlight,
    willReturn,
    nps: npsValue,
    priceImpression,
    nextEvent,
    nextEventOther: document.getElementById('survey-next-event-other').value.trim() || undefined,
    comment: document.getElementById('survey-comment').value.trim() || undefined
  };

  try {
    await fetch(`${SURVEY_API_BASE}/api/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    // ネットワークエラーでも回答者体験を優先し、完了画面は表示する
  }

  document.getElementById('survey-form-view').hidden = true;
  document.getElementById('survey-success-view').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

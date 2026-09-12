const SURVEY_API_BASE = 'https://yuta-blog.vercel.app';

// 1タップで選べる数字ボタン行（総合満足度・NPSで共用）
function buildNumberRow(container, min, max, ariaLabelFn, onSelect) {
  for (let i = min; i <= max; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'survey-nps-btn';
    btn.textContent = String(i);
    btn.setAttribute('aria-label', ariaLabelFn(i));
    btn.dataset.value = String(i);
    btn.addEventListener('click', () => {
      Array.from(container.children).forEach((b) => b.classList.toggle('is-active', b === btn));
      onSelect(i);
    });
    container.appendChild(btn);
  }
}

let satisfactionValue = null; // 1-5
buildNumberRow(
  document.getElementById('survey-satisfaction'),
  1, 5,
  (i) => `満足度${i}`,
  (i) => { satisfactionValue = i; }
);

let npsValue = null; // 0-10
buildNumberRow(
  document.getElementById('survey-nps'),
  0, 10,
  (i) => `おすすめ度${i}`,
  (i) => { npsValue = i; }
);

// ピル選択（1グループにつき1つだけアクティブにする）
document.querySelectorAll('.survey-pills').forEach((group) => {
  const isMulti = group.dataset.multi === 'true';
  group.querySelectorAll('.survey-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      if (isMulti) {
        pill.classList.toggle('is-active');
      } else {
        group.querySelectorAll('.survey-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
      }
      if (group.dataset.field === 'nextEvent') {
        const otherInput = document.getElementById('survey-next-event-other');
        const otherActive = Array.from(group.querySelectorAll('.survey-pill.is-active')).some(
          (p) => p.textContent === 'その他'
        );
        otherInput.hidden = !otherActive;
        if (otherInput.hidden) otherInput.value = '';
      }
    });
  });
});

function getPillValue(field) {
  const active = document.querySelector(`.survey-pills[data-field="${field}"] .survey-pill.is-active`);
  return active ? active.textContent : null;
}

function getPillValues(field) {
  return Array.from(document.querySelectorAll(`.survey-pills[data-field="${field}"] .survey-pill.is-active`)).map(
    (p) => p.textContent
  );
}

const errorEl = document.getElementById('survey-error');
const submitBtn = document.getElementById('survey-submit');

submitBtn.addEventListener('click', async () => {
  const highlight = getPillValue('highlight');
  const willReturn = getPillValue('willReturn');
  const priceImpression = getPillValue('priceImpression');
  const nextEvent = getPillValues('nextEvent');

  if (!satisfactionValue || !highlight || !willReturn || npsValue === null || !priceImpression || nextEvent.length === 0) {
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
    satisfaction: satisfactionValue,
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

import { EventConfig, Recurrence } from './types';

export const WEEKDAY_KANJI = ['日', '月', '火', '水', '木', '金', '土'];
export const WEEKDAY_LABELS = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

export const EVENTS: EventConfig[] = [
  {
    id: 'asaran',
    emoji: '☀️',
    title: '朝ラン',
    location: '恵比寿ガーデンプレイス集合・発着',
    description:
      '週末の朝を気持ちよく動かす、朝ランです。ゆるいペースで、走った後は清々しい一日のスタートに。初参加・お一人参加も大歓迎です。',
    recurrence: { mode: 'once', dateISO: null, time: '08:00' },
    dateLabelOverride: '開催時期は保留中',
    timeLabelOverride: '8:00〜（想定）',
    deadlineDaysBefore: null,
    capacity: 10
  },
  {
    id: 'yoruran',
    emoji: '🌃',
    title: '夜ラン',
    location: '恵比寿ガーデンプレイス集合・発着',
    description:
      '恵比寿ガーデンプレイスを起点に、ゆるいペースで夜の街を走ります。タイムを追うことより、会話を楽しむことを大切に。初参加・お一人参加も大歓迎です。',
    recurrence: { mode: 'weekly', weekday: 1, time: '20:00' },
    timeLabelOverride: '20:00〜21:00',
    deadlineDaysBefore: 0,
    capacity: 10
  },
  {
    id: 'futsal',
    emoji: '⚽',
    title: 'フットサル（男女混合）',
    location: '代々木 or 渋谷（会場調整中）',
    description:
      '初めましての方も歓迎の、男女混合でゆるく楽しむフットサル部活動です。運動が得意でなくても大丈夫。体を動かしながら、仕事でも家でもない新しいつながりをつくる時間にしませんか。',
    recurrence: { mode: 'once', dateISO: '2026-09-21T19:00:00', time: '19:00' },
    deadlineDaysBefore: 7,
    capacity: 25,
    extraFields: [
      { key: 'referrer', label: '紹介者のお名前（いれば）', type: 'text' },
      { key: 'payment', label: '当日決済方法', type: 'select', options: ['現金', 'PayPay'] },
      { key: 'job', label: 'お仕事', type: 'text' }
    ]
  },
  {
    id: 'karuizawa-tour',
    emoji: '🏔',
    title: '軽井沢ツアー（特別開催）',
    location: '軽井沢駅集合 → タクシーで現地へ',
    description:
      'ピラティス → サウナ → BBQの特別な一日。軽井沢と都内、それぞれの事業者が力を合わせてお届けするハイブリッドイベントです。日常から少し離れて、心と身体を整える時間を。参加費 事前振込¥17,500・当日¥18,000、限定15名。',
    recurrence: { mode: 'once', dateISO: '2026-09-17T11:00:00' },
    timeLabelOverride: '11:00〜18:00',
    deadlineDaysBefore: null,
    capacity: 15
  }
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_KANJI[d.getDay()]})`;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  const d = new Date(year, month, 1);
  let count = 0;
  while (d.getMonth() === month) {
    if (d.getDay() === weekday) {
      count++;
      if (count === nth) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
}

function applyTime(d: Date, timeStr?: string): Date {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function computeOccurrence(recurrence: Recurrence, from: Date = new Date()): Date | null {
  if (!recurrence) return null;

  if (recurrence.mode === 'once') {
    return recurrence.dateISO ? new Date(recurrence.dateISO) : null;
  }

  if (recurrence.mode === 'weekly') {
    const candidate = new Date(from);
    const diff = ((recurrence.weekday ?? 0) - from.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + diff);
    applyTime(candidate, recurrence.time);
    if (candidate < from) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }

  if (recurrence.mode === 'monthly') {
    let year = from.getFullYear();
    let month = from.getMonth();
    let candidate = nthWeekdayOfMonth(year, month, recurrence.weekday ?? 0, recurrence.nth ?? 1);
    if (candidate) applyTime(candidate, recurrence.time);
    if (!candidate || candidate < from) {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
      candidate = nthWeekdayOfMonth(year, month, recurrence.weekday ?? 0, recurrence.nth ?? 1);
      if (candidate) applyTime(candidate, recurrence.time);
    }
    return candidate;
  }

  return null;
}

export function recurrenceLabel(recurrence: Recurrence): string {
  if (!recurrence) return '';
  if (recurrence.mode === 'weekly') {
    return `定例・毎週${WEEKDAY_LABELS[recurrence.weekday ?? 0]} ${recurrence.time}〜`;
  }
  if (recurrence.mode === 'monthly') {
    return `定例・毎月第${recurrence.nth}${WEEKDAY_LABELS[recurrence.weekday ?? 0]} ${recurrence.time}〜`;
  }
  if (recurrence.mode === 'once' && !recurrence.dateISO) {
    return '不定期開催（曜日固定なし・都度決定）';
  }
  return '単発開催';
}

/** イベント×開催日を一意に表すキー（Supabaseの occ_date カラムに対応） */
export function occurrenceKey(ev: EventConfig, occurrence: Date | null): string {
  return occurrence ? dateKey(occurrence) : '';
}

/**
 * 「来週は無理だが再来週は行きたい」のように先の回にも予約できるよう、
 * 直近の occurrence だけでなく、その先何回分かをまとめて返す。
 */
export function computeUpcomingOccurrences(recurrence: Recurrence, from: Date, count: number): Date[] {
  const list: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const occ = computeOccurrence(recurrence, cursor);
    if (!occ) break;
    list.push(occ);
    cursor = new Date(occ.getTime() + 1);
  }
  return list;
}

/**
 * 当日締切（0日前）の場合、日付だけで区切ると開始時刻を過ぎても
 * 「その日はまだ23:59:59まで受付中」になってしまうため、開始時刻そのものを締切にする。
 */
export function occurrenceDeadline(occurrence: Date | null, deadlineDaysBefore: number | null | undefined): Date | null {
  if (!occurrence || deadlineDaysBefore == null) return null;
  if (deadlineDaysBefore === 0) return occurrence;
  const deadline = new Date(occurrence.getTime() - deadlineDaysBefore * 86400000);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

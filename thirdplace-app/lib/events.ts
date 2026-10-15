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
      '水曜の朝を気持ちよく動かす、朝ランです。ゆるいペースで、走った後は清々しい一日のスタートに。初参加・お一人参加も大歓迎です。',
    recurrence: {
      mode: 'dates',
      dates: ['2026-10-14T07:30:00', '2026-10-28T07:30:00'],
      time: '07:30'
    },
    timeLabelOverride: '7:30〜',
    deadlineDaysBefore: 0,
    capacity: 10,
    emailDetails: [
      { label: '集合場所', value: '恵比寿ガーデンプレイス' },
      { label: '持ち物', value: '動きやすい服装・運動シューズ（貴重品は各自での管理をお願いします）' },
      { label: '当日の流れ', value: '軽くストレッチ → ゆるいペースでラン → 終了後は希望者で軽く歓談' },
      { label: '天候について', value: '荒天時は中止となる場合があります。前日〜当日にInstagram（@the.thirdplace.ebisu）でお知らせします。' }
    ]
  },
  {
    id: 'toride',
    emoji: '🌾',
    title: '畑HYROX（特別開催）— 茨城・取手',
    location: '取手駅集合（送迎あり）',
    description:
      '「整ってないからこそのフィットネス」がコンセプトの一日。畑HYROX → さつまいも掘り・種まき → BBQの計225分。整った施設ではなく、土と自然の中で体を動かします。参加費¥20,000、限定15名。',
    recurrence: { mode: 'once', dateISO: '2026-11-01T11:00:00' },
    timeLabelOverride: '11:00〜15:30',
    deadlineDaysBefore: null,
    capacity: 15,
    emailDetails: [
      { label: '集合場所', value: '取手駅（10:30集合、送迎で会場へ）' },
      {
        label: 'タイムテーブル',
        value:
          '10:30 取手駅集合 → 11:00 畑HYROX → 12:15 さつまいも掘り・種まき → 13:00 BBQ → 15:00 片付け・集合写真 → 15:30 送迎 → 15:50頃 取手駅解散'
      },
      { label: '参加費', value: '¥20,000（お支払い方法は別途ご案内します）' },
      { label: '持ち物', value: '動きやすい服装、汚れてもいい靴、タオル、着替え' },
      { label: 'ひとこと', value: '種まきをして「また収穫に来る」きっかけをつくる回です。整った施設ではなく、土と自然の中で体を動かしましょう。' }
    ]
  },
  {
    id: 'futsal',
    emoji: '⚽',
    title: 'フットサル（男女混合）',
    location: '国立代々木競技場フットサルコート 第1コート',
    description:
      '初めましての方も歓迎の、男女混合でゆるく楽しむフットサル部活動です。経験・レベルは一切問いません。「ボールを蹴るの久しぶり」な方も大歓迎。体を動かしながら、仕事でも家でもない新しいつながりをつくる時間にしませんか。',
    recurrence: { mode: 'once', dateISO: '2026-11-29T19:00:00', time: '19:00' },
    deadlineDaysBefore: 0,
    capacity: 25,
    extraFields: [
      { key: 'referrer', label: '紹介者のお名前（いれば）', type: 'text', notionProperty: '紹介者名' },
      { key: 'payment', label: '当日決済方法', type: 'select', options: ['現金', 'PayPay'], notionProperty: '決済方法' },
      { key: 'job', label: 'お仕事', type: 'text', notionProperty: 'お仕事' }
    ],
    emailDetails: [
      { label: '集合場所', value: '国立代々木競技場フットサルコート 第1コート' },
      { label: '参加費', value: '¥2,000（現地払い）' },
      { label: '持ち物', value: 'フットサルシューズ（必須）、飲み物、タオル（レンタルシューズ¥550あり）' },
      { label: 'レベル', value: '経験不問・初心者歓迎です' },
      { label: 'ひとこと', value: '男女混合・運動が得意でない方も歓迎です。初めましての方もお気軽にどうぞ。' }
    ]
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

  // 毎週/毎月のような規則的な周期ではなく、バラバラな複数日程をあらかじめ指定する開催形式
  // （例：10/14と10/28の2回だけ開催、など）。
  if (recurrence.mode === 'dates') {
    const candidates = (recurrence.dates ?? [])
      .map((iso) => new Date(iso))
      .filter((d) => d >= from)
      .sort((a, b) => a.getTime() - b.getTime());
    return candidates[0] ?? null;
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
  if (recurrence.mode === 'dates') {
    return '不定期開催（複数日程あり）';
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

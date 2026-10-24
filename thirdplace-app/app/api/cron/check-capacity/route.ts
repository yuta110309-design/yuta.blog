import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EVENTS, computeOccurrence, dateKey, formatLabel } from '@/lib/events';

// 定員割れ（参加表明が最低人数未満）を、開催判断の締切日に運営へメールで知らせる。
// Vercel Cron（vercel.jsonのcrons設定）から毎日1回呼ばれる想定。
const MIN_ATTENDEES = 3;

// 毎回実行時に最新のSupabaseデータと現在日時を見る必要があるため、静的最適化を無効にする。
export const dynamic = 'force-dynamic';

function todayInJST(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function GET(req: NextRequest) {
  // Vercel Cronは Authorization: Bearer <CRON_SECRET> を自動付与する。
  // CRON_SECRETを設定した場合のみ検証し、未設定なら（導入の手間を優先して）チェックをスキップする。
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const today = todayInJST();
  const notified: string[] = [];

  for (const ev of EVENTS) {
    if (ev.deadlineDaysBefore == null) continue;

    const occurrence = computeOccurrence(ev.recurrence, new Date());
    if (!occurrence) continue;

    const notifyDate = dateKey(addDays(occurrence, -ev.deadlineDaysBefore));
    if (notifyDate !== today) continue;

    const occDate = dateKey(occurrence);
    const { data, error } = await supabase
      .from('responses')
      .select('name')
      .eq('event_id', ev.id)
      .eq('occ_date', occDate)
      .eq('status', 'go');

    if (error) continue;

    const goCount = data?.length ?? 0;
    if (goCount < MIN_ATTENDEES) {
      await sendShortageEmail({
        title: ev.title,
        dateLabel: ev.dateLabelOverride ?? formatLabel(occurrence),
        goCount
      });
      notified.push(ev.id);
    }
  }

  return NextResponse.json({ result: 'success', checkedDate: today, notified });
}

async function sendShortageEmail({
  title,
  dateLabel,
  goCount
}: {
  title: string;
  dateLabel: string;
  goCount: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  // 運営メンバーそれぞれに直接届くよう、カンマ区切りで複数アドレスを指定できるようにする
  const to = process.env.NOTIFY_EMAIL_TO?.split(',').map((addr) => addr.trim()).filter(Boolean);
  if (!apiKey || !to || to.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY または NOTIFY_EMAIL_TO が未設定のため、定員割れ通知メールをスキップしました。');
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM || 'THE THIRDPLACE EBISU <onboarding@resend.dev>',
        to,
        subject: `【定員割れの可能性】${title}（${dateLabel}）`,
        text: [
          `${title}（${dateLabel}）の現在の参加表明が ${goCount}名 で、最低催行人数（${MIN_ATTENDEES}名）を下回っています。`,
          ``,
          `開催の可否をご検討のうえ、必要であればLINEオープンチャットで「開催なし」のアナウンスをお願いします。`,
          ``,
          `詳細はSupabaseのTable Editor（responsesテーブル）またはthirdplace-appの管理画面から確認できます。`
        ].join('\n')
      })
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('定員割れ通知メールの送信に失敗しました:', err);
  }
}

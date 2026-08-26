import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { EVENTS, formatLabel } from '@/lib/events';

// 開催前日に、参加（go）回答者へリマインドメールを送る。
// Vercel Cron（vercel.jsonのcrons設定）から毎日1回呼ばれる想定。
export const dynamic = 'force-dynamic';

function tomorrowInJST(): string {
  // 実時間で24時間後を見れば、日本時間としても確実に「明日」になる（日本にサマータイムはない）。
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(in24h);
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!supabaseAdmin) {
    // eslint-disable-next-line no-console
    console.warn('SUPABASE_SERVICE_ROLE_KEY が未設定のため、前日リマインドをスキップしました。');
    return NextResponse.json({ result: 'skipped', reason: 'no service role key configured' });
  }

  const occDate = tomorrowInJST();
  const { data, error } = await supabaseAdmin
    .from('response_emails')
    .select('event_id, email')
    .eq('occ_date', occDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  let sent = 0;

  for (const ev of EVENTS) {
    const emails = rows.filter((r) => r.event_id === ev.id).map((r) => r.email);
    if (emails.length === 0) continue;

    const dateLabel = ev.dateLabelOverride || formatLabel(new Date(`${occDate}T00:00:00`));
    const timeLabel = ev.timeLabelOverride || (ev.recurrence?.time ? `${ev.recurrence.time}〜` : '');

    for (const email of emails) {
      await sendReminderEmail({ to: email, eventTitle: ev.title, dateLabel, timeLabel, location: ev.location });
      sent += 1;
    }
  }

  return NextResponse.json({ result: 'success', occDate, sent });
}

async function sendReminderEmail({
  to,
  eventTitle,
  dateLabel,
  timeLabel,
  location
}: {
  to: string;
  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY が未設定のため、前日リマインドメールをスキップしました。');
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
        subject: `【明日開催】${eventTitle}（${dateLabel}）`,
        text: [
          `明日、以下のイベントが開催されます。`,
          ``,
          `イベント: ${eventTitle}`,
          `日時: ${dateLabel}${timeLabel ? ` ${timeLabel}` : ''}`,
          `場所: ${location}`,
          ``,
          `当日お会いできるのを楽しみにしています！`,
          `予定が変わった場合は、同じページからもう一度回答し直してください。`
        ].join('\n')
      })
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('前日リマインドメールの送信に失敗しました:', err);
  }
}

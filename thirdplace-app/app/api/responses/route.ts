import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EVENTS, formatLabel } from '@/lib/events';

const STATUS_LABEL: Record<string, string> = { go: '参加', maybe: '未定', no: '不参加' };

// ランディングページ（GitHub Pages・別オリジン）からも呼ばれるため CORS を許可する。
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/responses -> 全回答を返す（クライアント側でイベント×開催日でフィルタする）
export async function GET() {
  const { data, error } = await supabase
    .from('responses')
    .select('event_id, occ_date, name, device_id, status, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
  return NextResponse.json(data ?? [], { headers: CORS_HEADERS });
}

// POST /api/responses -> 回答を登録・更新
// 同姓同名の別人を区別するため、同一 event_id + occ_date + deviceId（端末ごとに割り当てるID）を
// 同一回答者とみなして上書きする。deviceIdが無い（古いクライアント）場合は毎回新規行になる。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, occDate, name, status, deviceId, email } = body;

  if (!eventId || !name || !status) {
    return NextResponse.json(
      { error: 'eventId, name, status は必須です' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { error } = await supabase
    .from('responses')
    .upsert(
      {
        event_id: eventId,
        occ_date: occDate ?? '',
        name,
        device_id: deviceId ?? null,
        status,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'event_id,occ_date,device_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  // emailはpublicにSELECT可能なresponsesテーブルには保存せず、確認メール送信にのみ使う。
  if (email) {
    await sendConfirmationEmail({ to: email, name, eventId, occDate, status });
  }

  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

async function sendConfirmationEmail({
  to,
  name,
  eventId,
  occDate,
  status
}: {
  to: string;
  name: string;
  eventId: string;
  occDate?: string;
  status: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY が未設定のため、出欠確認メールをスキップしました。');
    return;
  }

  const eventCfg = EVENTS.find((e) => e.id === eventId);
  const eventTitle = eventCfg?.title ?? eventId;
  const dateLabel = occDate ? formatLabel(new Date(`${occDate}T00:00:00`)) : eventCfg?.dateLabelOverride ?? '';

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
        subject: `【出欠登録完了】${eventTitle}${dateLabel ? `（${dateLabel}）` : ''}`,
        text: [
          `${name}様`,
          ``,
          `以下の内容で出欠を登録しました。`,
          ``,
          `イベント: ${eventTitle}`,
          dateLabel ? `日程: ${dateLabel}` : null,
          `回答: ${STATUS_LABEL[status] ?? status}`,
          ``,
          `内容を変更したい場合は、同じページからもう一度回答してください（同じ端末であれば上書きされます）。`
        ]
          .filter(Boolean)
          .join('\n')
      })
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('出欠確認メールの送信に失敗しました:', err);
  }
}

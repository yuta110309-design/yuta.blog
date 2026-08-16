import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EVENTS, formatLabel } from '@/lib/events';
import { notionRequest, logIfNotionError, formatJst } from '@/lib/notion';

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

  const eventCfg = EVENTS.find((e) => e.id === eventId);
  const eventTitle = eventCfg?.title ?? eventId;
  const dateLabel = occDate ? formatLabel(new Date(`${occDate}T00:00:00`)) : eventCfg?.dateLabelOverride ?? '';

  // emailはpublicにSELECT可能なresponsesテーブルには保存せず、確認メール送信にのみ使う。
  if (email) {
    await sendConfirmationEmail({ to: email, name, eventTitle, dateLabel, status });
  }
  await syncResponseToNotion({ eventId, eventTitle, occDate: occDate ?? '', dateLabel, name, status, deviceId });

  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

async function sendConfirmationEmail({
  to,
  name,
  eventTitle,
  dateLabel,
  status
}: {
  to: string;
  name: string;
  eventTitle: string;
  dateLabel: string;
  status: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY が未設定のため、出欠確認メールをスキップしました。');
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

// 出欠をNotionデータベースにも記録する。同じ回答者（event_id + occ_date + deviceId）の
// 既存ページがあれば新規作成せず更新する（回答を変更するたびに行が増えないように）。
// NOTION_API_KEY / NOTION_RESPONSES_DB_ID が未設定なら何もしない。
async function syncResponseToNotion({
  eventId,
  eventTitle,
  occDate,
  dateLabel,
  name,
  status,
  deviceId
}: {
  eventId: string;
  eventTitle: string;
  occDate: string;
  dateLabel: string;
  name: string;
  status: string;
  deviceId?: string;
}) {
  const dbId = process.env.NOTION_RESPONSES_DB_ID;
  if (!dbId) {
    // eslint-disable-next-line no-console
    console.warn('NOTION_RESPONSES_DB_ID が未設定のため、Notion連携をスキップしました。');
    return;
  }

  const matchKey = `${eventId}|${occDate}|${deviceId ?? ''}`;
  const properties = {
    名前: { title: [{ text: { content: name } }] },
    イベント: { rich_text: [{ text: { content: eventTitle } }] },
    開催日: { rich_text: dateLabel ? [{ text: { content: dateLabel } }] : [] },
    出欠: { rich_text: [{ text: { content: STATUS_LABEL[status] ?? status } }] },
    更新日時: { rich_text: [{ text: { content: formatJst(new Date()) } }] },
    回答ID: { rich_text: [{ text: { content: matchKey } }] }
  };

  try {
    const queryRes = await notionRequest(`/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: '回答ID', rich_text: { equals: matchKey } }
      })
    });
    await logIfNotionError(queryRes, '出欠データ検索');
    const queryJson = queryRes?.ok ? await queryRes.json() : null;
    const existingPageId = queryJson?.results?.[0]?.id;

    if (existingPageId) {
      const res = await notionRequest(`/pages/${existingPageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties })
      });
      await logIfNotionError(res, '出欠データ更新');
    } else {
      const res = await notionRequest('/pages', {
        method: 'POST',
        body: JSON.stringify({ parent: { database_id: dbId }, properties })
      });
      await logIfNotionError(res, '出欠データ作成');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Notionへの出欠データ連携に失敗しました:', err);
  }
}

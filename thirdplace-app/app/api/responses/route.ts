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
    .select('event_id, occ_date, name, device_id, status, updated_at, extra')
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
  const { eventId, occDate, name, status, deviceId, email, extra } = body;

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
        extra: extra ?? null,
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
    await sendConfirmationEmail({
      to: email,
      name,
      eventTitle,
      dateLabel,
      status,
      location: eventCfg?.location,
      emailDetails: eventCfg?.emailDetails,
      extra,
      extraFields: eventCfg?.extraFields
    });
  }
  // 前日リマインド用に、参加（go）表明者のメールアドレスだけを別テーブルに保存する
  // （response_emailsは匿名ロールからSELECTできないため、公開responsesテーブルより安全）。
  // 参加以外に変わった場合は、翌日以降にリマインドが届かないよう削除する。
  if (deviceId) {
    if (status === 'go' && email) {
      await supabase
        .from('response_emails')
        .upsert(
          {
            event_id: eventId,
            occ_date: occDate ?? '',
            device_id: deviceId,
            email,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'event_id,occ_date,device_id' }
        );
    } else {
      await supabase
        .from('response_emails')
        .delete()
        .eq('event_id', eventId)
        .eq('occ_date', occDate ?? '')
        .eq('device_id', deviceId);
    }
  }
  await syncResponseToNotion({
    eventId,
    eventTitle,
    occDate: occDate ?? '',
    dateLabel,
    name,
    status,
    deviceId,
    extra,
    extraFields: eventCfg?.extraFields
  });

  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

async function sendConfirmationEmail({
  to,
  name,
  eventTitle,
  dateLabel,
  status,
  location,
  emailDetails,
  extra,
  extraFields
}: {
  to: string;
  name: string;
  eventTitle: string;
  dateLabel: string;
  status: string;
  location?: string;
  emailDetails?: { label: string; value: string }[];
  extra?: Record<string, string>;
  extraFields?: { key: string; label: string }[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY が未設定のため、出欠確認メールをスキップしました。');
    return;
  }

  const isGoing = status === 'go';

  const answeredExtras = (extraFields ?? [])
    .map((f) => (extra?.[f.key] ? `${f.label}: ${extra[f.key]}` : null))
    .filter((v): v is string => Boolean(v));

  const lines = [
    `${name}様`,
    ``,
    `以下の内容で出欠を登録しました。`,
    ``,
    `イベント: ${eventTitle}`,
    dateLabel ? `日程: ${dateLabel}` : null,
    location ? `場所: ${location}` : null,
    `回答: ${STATUS_LABEL[status] ?? status}`
  ];

  if (isGoing && answeredExtras.length > 0) {
    lines.push(``, `ご回答いただいた内容:`, ...answeredExtras);
  }

  if (isGoing && emailDetails && emailDetails.length > 0) {
    lines.push(
      ``,
      `──────────────`,
      `当日のご案内`,
      `──────────────`,
      ...emailDetails.map((d) => `${d.label}: ${d.value}`)
    );
  }

  lines.push(``, `内容を変更したい場合は、同じページからもう一度回答してください（同じ端末であれば上書きされます）。`);

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
        // .filter(Boolean)だと意図した空行（''）まで消えてしまうため、
        // null/undefined（該当なしの項目）だけを取り除く。
        text: lines.filter((l): l is string => l !== null && l !== undefined).join('\n')
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
  deviceId,
  extra,
  extraFields
}: {
  eventId: string;
  eventTitle: string;
  occDate: string;
  dateLabel: string;
  name: string;
  status: string;
  deviceId?: string;
  extra?: Record<string, string>;
  extraFields?: { key: string; label: string; notionProperty?: string }[];
}) {
  const dbId = process.env.NOTION_RESPONSES_DB_ID;
  if (!dbId) {
    // eslint-disable-next-line no-console
    console.warn('NOTION_RESPONSES_DB_ID が未設定のため、Notion連携をスキップしました。');
    return;
  }

  const matchKey = `${eventId}|${occDate}|${deviceId ?? ''}`;
  const baseProperties = {
    名前: { title: [{ text: { content: name } }] },
    イベント: { rich_text: [{ text: { content: eventTitle } }] },
    開催日: { rich_text: dateLabel ? [{ text: { content: dateLabel } }] : [] },
    出欠: { rich_text: [{ text: { content: STATUS_LABEL[status] ?? status } }] },
    更新日時: { rich_text: [{ text: { content: formatJst(new Date()) } }] },
    回答ID: { rich_text: [{ text: { content: matchKey } }] }
  };
  // 追加質問（紹介者名など）は、イベントごとに指定されたNotionのプロパティ名に
  // それぞれ個別に書き込む（未指定ならlabelをそのままプロパティ名として使う）。
  const extraProperties: Record<string, unknown> = {};
  for (const f of extraFields ?? []) {
    const value = extra?.[f.key];
    if (!value) continue;
    extraProperties[f.notionProperty || f.label] = { rich_text: [{ text: { content: value } }] };
  }
  const properties = { ...baseProperties, ...extraProperties };
  const hasExtra = Object.keys(extraProperties).length > 0;

  // extraPropertiesの列がNotion側のデータベースにまだ作成されていない場合、
  // Notion APIはページ全体の作成・更新を400エラーで拒否する（基本情報も含めて丸ごと失敗する）。
  // その場合はextraPropertiesを諦めて再送し、名前・イベント・出欠などの基本情報だけは必ず反映されるようにする。
  async function upsertNotionPage(existingPageId: string | undefined) {
    const path = existingPageId ? `/pages/${existingPageId}` : '/pages';
    const method = existingPageId ? 'PATCH' : 'POST';
    const body = existingPageId ? { properties } : { parent: { database_id: dbId }, properties };
    const res = await notionRequest(path, { method, body: JSON.stringify(body) });
    if (res && !res.ok && hasExtra) {
      const bodyText = await res.text();
      // eslint-disable-next-line no-console
      console.error(
        `Notion API エラー（出欠データ${existingPageId ? '更新' : '作成'}・追加項目[${Object.keys(extraProperties).join('、')}]なしで再送します）: ${res.status} ${bodyText}`
      );
      const fallbackBody = existingPageId
        ? { properties: baseProperties }
        : { parent: { database_id: dbId }, properties: baseProperties };
      const retryRes = await notionRequest(path, { method, body: JSON.stringify(fallbackBody) });
      await logIfNotionError(retryRes, `出欠データ${existingPageId ? '更新' : '作成'}（追加項目なし再送）`);
      return;
    }
    await logIfNotionError(res, `出欠データ${existingPageId ? '更新' : '作成'}`);
  }

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

    await upsertNotionPage(existingPageId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Notionへの出欠データ連携に失敗しました:', err);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { notionRequest, logIfNotionError } from '@/lib/notion';

// ランディングページ（GitHub Pages・別オリジン）から呼ばれるため CORS を許可する。
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const SATISFACTION_OPTIONS = ['★★★★★', '★★★★', '★★★', '★★', '★'];
const HIGHLIGHT_OPTIONS = ['ピラティス', 'サウナ', 'BBQ', '交流タイム'];
const RETURN_OPTIONS = ['はい', 'いいえ', 'わからない'];
const PRICE_OPTIONS = ['安い', '妥当', '高い'];
const NEXT_EVENT_OPTIONS = ['温泉', 'キャンプ', 'スキー', 'その他'];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/survey -> イベント事後アンケートの回答をNotionに記録する
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    satisfaction,
    highlight,
    willReturn,
    nps,
    priceImpression,
    nextEvent,
    nextEventOther,
    comment
  } = body;

  if (
    !satisfaction ||
    !SATISFACTION_OPTIONS.includes(satisfaction) ||
    !highlight ||
    !HIGHLIGHT_OPTIONS.includes(highlight) ||
    !willReturn ||
    !RETURN_OPTIONS.includes(willReturn) ||
    typeof nps !== 'number' ||
    nps < 0 ||
    nps > 10 ||
    !priceImpression ||
    !PRICE_OPTIONS.includes(priceImpression) ||
    !nextEvent ||
    !NEXT_EVENT_OPTIONS.includes(nextEvent)
  ) {
    return NextResponse.json({ error: '必須項目が不足しているか、不正な値です' }, { status: 400, headers: CORS_HEADERS });
  }

  await syncSurveyToNotion({
    name,
    satisfaction,
    highlight,
    willReturn,
    nps,
    priceImpression,
    nextEvent,
    nextEventOther,
    comment
  });

  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

async function syncSurveyToNotion({
  name,
  satisfaction,
  highlight,
  willReturn,
  nps,
  priceImpression,
  nextEvent,
  nextEventOther,
  comment
}: {
  name?: string;
  satisfaction: string;
  highlight: string;
  willReturn: string;
  nps: number;
  priceImpression: string;
  nextEvent: string;
  nextEventOther?: string;
  comment?: string;
}) {
  const dbId = process.env.NOTION_SURVEY_DB_ID;
  if (!dbId) {
    // eslint-disable-next-line no-console
    console.warn('NOTION_SURVEY_DB_ID が未設定のため、Notion連携をスキップしました。');
    return;
  }

  try {
    const res = await notionRequest('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          '回答者名（任意）': { title: name ? [{ text: { content: name } }] : [] },
          総合満足度: { select: { name: satisfaction } },
          一番良かったコンテンツ: { select: { name: highlight } },
          また参加したいか: { select: { name: willReturn } },
          'おすすめ度(NPS 0-10)': { number: nps },
          参加費の印象: { select: { name: priceImpression } },
          次回希望イベント: { select: { name: nextEvent } },
          '次回希望イベント（自由記述）': {
            rich_text: nextEventOther ? [{ text: { content: nextEventOther } }] : []
          },
          '良かった点・改善点': { rich_text: comment ? [{ text: { content: comment } }] : [] },
          回答日時: { date: { start: new Date().toISOString() } }
        }
      })
    });
    await logIfNotionError(res, 'アンケート回答作成');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Notionへのアンケート回答連携に失敗しました:', err);
  }
}

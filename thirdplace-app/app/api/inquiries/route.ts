import { NextRequest, NextResponse } from 'next/server';

// ランディングページ（GitHub Pages・別オリジン）から呼ばれるため CORS を許可する。
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const TYPE_LABEL: Record<string, string> = {
  sponsor: '協賛企業',
  partner: '提携店舗'
};

// 通知先は運営個人のメールアドレス固定。会員申し込み（/api/members）とは
// 用途が違う軽量なお問い合わせ窓口のため、Supabase/Notionへの保存はしない。
const INQUIRY_NOTIFY_TO = 'yuta110309@gmail.com';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/inquiries -> 協賛・提携のお問い合わせをメールで通知する
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, contact, type, message } = body;

  if (!name || !contact || !type || !TYPE_LABEL[type]) {
    return NextResponse.json(
      { error: 'name, contact, type（sponsor/partnerのいずれか）は必須です' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY が未設定のため、お問い合わせ通知メールをスキップしました。');
    return NextResponse.json({ result: 'skipped' }, { headers: CORS_HEADERS });
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
        to: INQUIRY_NOTIFY_TO,
        subject: `【${TYPE_LABEL[type]}お問い合わせ】${name}様`,
        text: [
          `${TYPE_LABEL[type]}についてのお問い合わせがありました。`,
          ``,
          `お名前: ${name}`,
          `連絡先: ${contact}`,
          message ? `メッセージ: ${message}` : null
        ]
          .filter(Boolean)
          .join('\n')
      })
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('お問い合わせ通知メールの送信に失敗しました:', err);
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

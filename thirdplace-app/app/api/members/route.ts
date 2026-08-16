import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ランディングページ（GitHub Pages・別オリジン）から呼ばれるため CORS を許可する。
// insert のみを受け付ける公開フォームのエンドポイントなので、オリジンは絞らずワイルドカードにしている。
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  standard: 'Standard（Founding Member）',
  premium: 'Premium'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/members -> 会員申し込み・お問い合わせを保存し、運営にメール通知する
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, contact, plan, message } = body;

  if (!name || !contact || !plan || !PLAN_LABEL[plan]) {
    return NextResponse.json(
      { error: 'name, contact, plan（free/standard/premiumのいずれか）は必須です' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { error } = await supabase.from('members').insert({
    name,
    contact,
    plan,
    message: message || null
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  await sendNotificationEmail({ name, contact, plan, message });

  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

// 通知メール送信に失敗しても申し込み自体は成功として扱う（データの保存を優先する）。
async function sendNotificationEmail({
  name,
  contact,
  plan,
  message
}: {
  name: string;
  contact: string;
  plan: string;
  message?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !to) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY または NOTIFY_EMAIL_TO が未設定のため、通知メールをスキップしました。');
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
        subject: `【新規申し込み】${name}様（${PLAN_LABEL[plan]}）`,
        text: [
          `新しい会員申し込み・お問い合わせがありました。`,
          ``,
          `お名前: ${name}`,
          `連絡先: ${contact}`,
          `プラン: ${PLAN_LABEL[plan]}`,
          message ? `メッセージ: ${message}` : null,
          ``,
          `詳細一覧はSupabaseのTable Editor（membersテーブル）から確認してください。`
        ]
          .filter(Boolean)
          .join('\n')
      })
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('通知メールの送信に失敗しました:', err);
  }
}

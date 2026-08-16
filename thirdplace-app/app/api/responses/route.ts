import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
  const { eventId, occDate, name, status, deviceId } = body;

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
  return NextResponse.json({ result: 'success' }, { headers: CORS_HEADERS });
}

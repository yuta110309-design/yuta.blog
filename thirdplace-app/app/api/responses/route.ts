import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/responses -> 全回答を返す（クライアント側でイベント×開催日でフィルタする）
export async function GET() {
  const { data, error } = await supabase
    .from('responses')
    .select('event_id, occ_date, name, status, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/responses -> 回答を登録・更新（同一 event_id + occ_date + name は上書き）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, occDate, name, status } = body;

  if (!eventId || !name || !status) {
    return NextResponse.json({ error: 'eventId, name, status は必須です' }, { status: 400 });
  }

  const { error } = await supabase
    .from('responses')
    .upsert(
      {
        event_id: eventId,
        occ_date: occDate ?? '',
        name,
        status,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'event_id,occ_date,name' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ result: 'success' });
}

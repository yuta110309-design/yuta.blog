import { createClient } from '@supabase/supabase-js';

// service role キーはRLSを全てバイパスするため、サーバー専用（Route Handler/Cron）でのみ使う。
// クライアントに公開される NEXT_PUBLIC_ 系の変数とは別に、Vercelの環境変数で
// SUPABASE_SERVICE_ROLE_KEY を設定すること（Supabaseダッシュボード → Project Settings → API）。
const FALLBACK_SUPABASE_URL = 'https://pzqhmexmsqmofijsccnv.supabase.co';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

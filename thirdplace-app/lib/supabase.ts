import { createClient } from '@supabase/supabase-js';

// anon key と URL は Supabase の設計上ブラウザに公開されて問題ない値（RLSで保護される）。
// Vercelの環境変数UIにこの値を保存すると、原因不明の文字化け（非ASCII文字の混入）が
// 何度やり直しても再発したため、既知の正しい値をフォールバックとして直接埋め込んでいる。
// 環境変数が正しく（ASCIIのみで）設定されていればそちらを優先する。
const FALLBACK_SUPABASE_URL = 'https://pzqhmexmsqmofijsccnv.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cWhtZXhtc3Ftb2ZpanNjY252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODMxOTUsImV4cCI6MjEwMjI1OTE5NX0.UTxHWZyrsQp9JST--iNG3FFmBpC2HD6B4rZFYECH8AU';

function isAsciiOnly(value: string | undefined): value is string {
  return !!value && /^[\x00-\xFF]*$/.test(value);
}

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = isAsciiOnly(envUrl) ? envUrl : FALLBACK_SUPABASE_URL;
const supabaseAnonKey = isAsciiOnly(envAnonKey) ? envAnonKey : FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

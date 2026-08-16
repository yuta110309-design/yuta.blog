-- THE THIRDPLACE EBISU 出欠管理システム用スキーマ
-- Supabaseの SQL Editor でそのまま実行してください

create extension if not exists "pgcrypto";

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  occ_date text not null default '',
  name text not null,
  device_id text,
  status text not null check (status in ('go', 'maybe', 'no')),
  updated_at timestamptz not null default now()
);

-- 既存テーブルに対する追記用マイグレーション（新規作成時は上のcreate tableで既にdevice_id列がある）。
-- 同姓・同名の別人が「同じ回答者」として上書きされてしまう問題を避けるため、
-- 回答者の識別を名前の文字列一致ではなく、端末ごとに割り当てるIDに切り替える。
alter table responses add column if not exists device_id text;

alter table responses drop constraint if exists responses_event_id_occ_date_name_key;

create unique index if not exists responses_event_occdate_device_key
  on responses (event_id, occ_date, device_id);

-- 参加者は名前を入力するだけの想定のため、匿名アクセスを許可する。
-- 認証を追加する場合はここを見直すこと（要件定義書 9章 参照）。
alter table responses enable row level security;

drop policy if exists "public can read responses" on responses;
create policy "public can read responses"
  on responses for select
  using (true);

drop policy if exists "public can insert responses" on responses;
create policy "public can insert responses"
  on responses for insert
  with check (true);

drop policy if exists "public can update own-name responses" on responses;
create policy "public can update own-name responses"
  on responses for update
  using (true);

-- 開催履歴を素早く引けるようにインデックスを張る
create index if not exists responses_event_occdate_idx
  on responses (event_id, occ_date);

-- 会員申し込み・お問い合わせ
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  plan text not null check (plan in ('free', 'standard', 'premium')),
  message text,
  created_at timestamptz not null default now()
);

-- 氏名・連絡先という個人情報を含むため responses とは異なり、
-- 匿名ロールには insert のみを許可し、select は許可しない
-- （運営はSupabaseダッシュボードのTable Editor、または後述のAPIから確認する）。
alter table members enable row level security;

drop policy if exists "public can submit membership applications" on members;
create policy "public can submit membership applications"
  on members for insert
  with check (true);

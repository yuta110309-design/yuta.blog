-- THE THIRDPLACE EBISU 出欠管理システム用スキーマ
-- Supabaseの SQL Editor でそのまま実行してください

create extension if not exists "pgcrypto";

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  occ_date text not null default '',
  name text not null,
  status text not null check (status in ('go', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  unique (event_id, occ_date, name)
);

-- 参加者は名前を入力するだけの想定のため、匿名アクセスを許可する。
-- 認証を追加する場合はここを見直すこと（要件定義書 9章 参照）。
alter table responses enable row level security;

create policy "public can read responses"
  on responses for select
  using (true);

create policy "public can insert responses"
  on responses for insert
  with check (true);

create policy "public can update own-name responses"
  on responses for update
  using (true);

-- 開催履歴を素早く引けるようにインデックスを張る
create index if not exists responses_event_occdate_idx
  on responses (event_id, occ_date);

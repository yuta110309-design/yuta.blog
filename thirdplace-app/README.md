# THE THIRDPLACE EBISU 出欠管理アプリ

Next.js (App Router) + Supabase 構成の出欠管理Webアプリのスターターコードです。
詳しい機能要件は同梱の `要件定義書.md`（プロジェクトルート外）を参照してください。

## セットアップ手順

### 1. Supabaseプロジェクトを作成
1. https://supabase.com で新規プロジェクトを作成
2. 「SQL Editor」を開き、`supabase/schema.sql` の中身を貼り付けて実行
3. 「Project Settings」→「API」から `Project URL` と `anon public key` を控える

### 2. 環境変数を設定
```bash
cp .env.example .env.local
```
`.env.local` に、控えておいたSupabaseのURLとキーを貼り付けてください。

### 3. インストール & 起動
```bash
npm install
npm run dev
```
http://localhost:3000 で確認できます。

### 4. デプロイ（Vercel推奨）

このアプリはリポジトリ直下ではなく `thirdplace-app/` フォルダに置かれています。
Vercelでプロジェクトを作成する際は、「Root Directory」に `thirdplace-app` を指定してください。

```bash
npx vercel
```
Vercelのダッシュボードで環境変数（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定してください。

---

## ディレクトリ構成

```
app/
  page.tsx              トップページ（タブ・イベント一覧）
  layout.tsx            フォント読み込み・全体レイアウト
  globals.css           Tailwindディレクティブ・背景グラデーション
  api/responses/route.ts  出欠回答のGET/POST APIルート
components/
  EventCard.tsx          イベントカード（開閉・共通ロジック）
  AttendeeForm.tsx       参加者の出欠回答フォーム
  OrganizerPanel.tsx     幹事向け集計・履歴パネル
lib/
  events.ts              イベント定義＋定例開催日の自動計算ロジック
  supabase.ts             Supabaseクライアント初期化
  types.ts                型定義
supabase/
  schema.sql              テーブル定義（Supabase SQL Editorで実行）
```

## イベント内容の変更方法

`lib/events.ts` の `EVENTS` 配列を直接編集してください。現状はコード管理（DBではなくコード内の定数）です。
将来的に幹事がUIから編集できるようにする場合は、`events` テーブルをSupabase側に追加し、`lib/events.ts` を
Supabaseからのフェッチに置き換える形が想定されます（要件定義書 9章 参照）。

## 既知の未実装・要検討事項（Claude Codeでの続きの実装候補）

- [ ] 幹事タブに認証をかける（現状は誰でも切り替え可能。要件定義書9章で未決定事項として明記済み）
- [ ] イベント自体（開催曜日・定員・締切など）をUIから編集できるようにする（Supabaseにevents テーブルを追加）
- [ ] LINEなどへの回答通知（Webhook連携）
- [ ] レスポンシブ・アクセシビリティの最終チェック
- [ ] 元のHTML版にあった細かいマイクロインタラクション（アニメーション等）の移植
- [ ] Next.js を 14.2.x の最新（このリポジトリでは14.2.35）からさらに最新版へ追従する（本アプリはServer Actionsを使用していないため実害は低いが、`npm audit` に残存する既知の脆弱性あり）

## Claude Codeで実施した主な修正（初回スキャフォールドからの変更点）

- トップページの初期表示タブを「幹事」から「参加者」に変更（LINE/Instagram経由で開くのは主に参加者のため、回答者一覧が既定で見える状態を避けた）
- 定員超過時の挙動を「フォーム自体を隠す」から「『参加』の選択のみ不可にする」方式に修正し、既に回答済みの人が定員超過後も出欠を変更（キャンセル等）できるようにした
- 同姓同名でも別人の回答として扱われてしまうキー衝突のバグを修正（幹事ビューの回答者一覧）
- 定員判定のロジックにあった不具合を修正（既存回答者が「参加」以外のステータスから「参加」に変更する際、定員チェックをすり抜けてしまう問題）
- `next.config.js` にキャッシュ制御ヘッダーを追加（要件4.2「ブラウザキャッシュにより情報が古くなる問題」への対応）
- `next` を既知の脆弱性が修正された `14.2.35` に更新

## デザインについて

深緑（#0c1815）× ゴールド（#D9B876）× オフホワイト（#FBF9F2）を基調にしたラグジュアリー路線。
`tailwind.config.ts` にブランドカラーとフォントをトークン化済みです。

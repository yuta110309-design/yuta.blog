# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code に向けたガイドです。

## プロジェクト概要

「THE THIRDPLACE EBISU」（恵比寿のコミュニティスペース）の公式サイト兼、関連ツール群のリポジトリです。

- 独自ドメイン: `thethirdplace-ebisu.com`（`CNAME` で指定）
- 静的サイト本体と、イベント出欠管理用の Next.js アプリの2つが同居している

## ディレクトリ構成

```
/                     静的サイト本体（トップページ）
  index.html            サイトのHTML本体
  style.css             スタイル
  script.js             フロントのJS（イベント表示・SNSリンク等）
  images/                サイト用画像（events, team など）
  CNAME                 GitHub Pages用カスタムドメイン設定

thirdplace-app/       イベント出欠管理Webアプリ（Next.js + Supabase）
  app/                   App Router のページ・API
  components/            EventCard, AttendeeForm, OrganizerPanel 等
  lib/                   共通ロジック
  supabase/               DBスキーマ
  要件定義書.md            出欠管理システムの要件定義書（日本語）
  README.md               セットアップ手順
```

## 技術スタック

- 静的サイト:素のHTML/CSS/JS（ビルド不要、GitHub Pagesで配信想定）
- `thirdplace-app`: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Supabase
  - デプロイ想定: Vercel（Root Directory に `thirdplace-app` を指定）

## よく使うコマンド（`thirdplace-app/` 内）

```bash
npm install       # 依存関係インストール
npm run dev       # 開発サーバー起動（http://localhost:3000）
npm run build     # 本番ビルド
npm run lint      # Lint
```

静的サイト本体（ルート直下）はビルド不要。`index.html` をブラウザで直接開くかローカルサーバーで確認する。

## 今後の作業予定：SNS（YouTube / Instagram / TikTok）のリサーチ・分析

このプロジェクトフォルダーでは今後、YouTube・Instagram・TikTok のリサーチや分析作業も行う予定です。現状これらの作業専用のディレクトリはまだ存在しないため、着手する際は用途に応じて以下のような整理を検討してください。

- リサーチメモや分析結果は既存のサイトコード（`index.html` / `script.js` / `thirdplace-app/`）とは分離し、専用ディレクトリ（例: `sns-research/`）を新設して格納する
- サイトの `Instagram` 関連リンク（`index.html` / `script.js` 内）は既存の公式SNS導線なので、リサーチ用途で誤って編集しないよう注意する

具体的な保存場所やフォーマットは、実際の作業内容が決まり次第このセクションを更新してください。

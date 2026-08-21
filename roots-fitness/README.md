# Roots Fitness 公式サイト リニューアル

`yuta.blog` リポジトリ内の `/roots-fitness/` に、既存の THE THIRDPLACE EBISU とは独立したサイトとして実装しています(既存ファイルには一切手を加えていません)。

## 構成

- `index.html` — トップページ(Hero / News / Concept / Why Roots / Service / Location / Plan / Trainer / 実績 / Recruit(簡易) / FAQ / Access / Footer)
- `online-training.html` — オンライントレーニング(独立ページ)
- `voice.html` — お客様の声(独立ページ)
- `recruit.html` — 採用ページ(独立ページ)
- `news.html` — お知らせ一覧(独立ページ)
- `style.css` — 全ページ共通スタイル
- `script.js` — ハンバーガーメニュー制御 / 店舗リンクの動的差し込み
- `data/stores.json` — 店舗ごとのFitKarte予約URL・公式LINE URLの設定ファイル
- `data/news.json` — お知らせの投稿データ

## 店舗リンクの管理方法(コード変更なしで店舗追加)

CTAボタンには `data-store-cta="daikanyama"` のように店舗IDを指定しておき、`script.js` が起動時に `data/stores.json` を読み込んで `href` を自動設定します。店舗を増やす場合は `data/stores.json` の `stores` 配列にオブジェクトを追加するだけで、HTML/CSS/JSの修正は不要です。

軽井沢店・オンラインの `fitkarteUrl` は現時点でプレースホルダー(`REPLACE_ME_...`)です。URLが確定次第、`data/stores.json` の該当箇所を差し替えてください。

## News(お知らせ)の運用方法(提案)

現状はビルド不要な静的サイトのため、**`data/news.json` を直接編集する方式**を採用しています。

- 運用担当は GitHub の Web UI 上で `data/news.json` を開き、`items` 配列に項目を追加/編集するだけで投稿できます(コード修正・デプロイ作業は不要、コミットすれば自動反映)。
- 将来的に非エンジニアの運用担当が増える、あるいは画像添付など表現の幅を広げたい場合は、次のいずれかへの移行を推奨します。
  - **Decap CMS(旧Netlify CMS)** などのGit-basedヘッドレスCMSを導入し、管理画面からJSON/Markdownを編集できるようにする
  - **microCMS** 等の日本語対応ヘッドレスCMSをAPI経由で読み込む構成に変更する
- まずはMVPとして `news.json` 直接編集方式で運用を開始し、投稿頻度・運用負荷を見ながら移行要否を判断する想定です。

## 実装の進め方

全16セクション/ページの雛形とナビゲーションを先に作成し、その後 Header + Hero を実装しました。以降はレビューを挟みながら1セクションずつ実装していきます。未実装のセクションは `.section-placeholder` として枠だけ用意しています。

## 未確定・要確認事項(プレースホルダーのまま)

- 軽井沢店・オンラインの FitKarte予約URL(`data/stores.json`)
- 公式LINE URL(`data/stores.json` の `line.url`)
- Instagram実アカウントURL(代官山・軽井沢)
- 店舗住所・電話番号・営業時間(Accessセクション実装時に構造化データとあわせて追加)
- Hero・各セクションの実写真素材
- セミパーソナルのペアレッスン料金

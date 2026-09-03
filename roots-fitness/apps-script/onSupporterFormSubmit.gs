/**
 * Roots Fitness オフィシャルサポーター制度 申込フォーム — Notion自動連携
 *
 * フォーム送信のたびに、Notionデータベース「オフィシャルサポーター制度 申込管理」に
 * 新しい行を1件追加する。スプレッドシートへの回答保存(Googleフォーム標準機能)と
 * 併用でき、こちらは追加でNotion側にも同じ内容を転記するだけの仕組み。
 *
 * 設置方法(概要。Googleフォーム自体の作成手順は docs/supporter-form-setup.md):
 * 1. Notion側で「マイインテグレーション」を作成する
 *    a. https://www.notion.so/profile/integrations を開く(要Notionログイン)
 *    b. 「新しいインテグレーション」→ 名前は任意(例: Roots Supporter連携)→ 作成
 *    c. 表示された「シークレット」(ntn_ から始まる文字列)をコピーして
 *       下の NOTION_TOKEN に設定する
 * 2. 対象のNotionデータベース「オフィシャルサポーター制度 申込管理」を開き、
 *    右上「•••」→「コネクト」→ 手順1で作ったインテグレーションを選択して連携を許可する
 *    (これをしないと、トークンがあってもAPIから書き込めない)
 * 3. このファイルの内容をまるごとコピーし、Googleフォームの回答スプレッドシート
 *    (または フォーム編集画面右上「⋮」)から「拡張機能 > Apps Script」を開いて貼り付け、保存
 * 4. 左メニュー「トリガー」から onSupporterFormSubmit を追加
 *    (イベントのソース: フォームから / イベントの種類: フォーム送信時)
 * 5. 初回保存時にGoogleアカウントの権限承認を求められるので許可する
 * 6. supporter.html からテスト送信し、Notionデータベースに行が追加されることを確認する
 *
 * フォーム側の質問文は docs/supporter-form-setup.md の表と完全一致させること
 * (一致しない場合、その項目だけ空欄でNotionに登録される)。
 */

// Notion側の設定。手順1・2で取得したものに差し替える。
var NOTION_TOKEN = "REPLACE_ME_NOTION_INTEGRATION_TOKEN";
// 「オフィシャルサポーター制度 申込管理」データベースのID(作成済み)。
var NOTION_DATABASE_ID = "04298fd2ad344f9cb2f6e4a934ee44d0";

// フォーム側の質問文(完全一致で参照するため定数化)
var Q_NAME = "お名前";
var Q_PHONE = "お電話番号";
var Q_EMAIL = "メールアドレス";
var Q_STORE = "ご利用店舗";
var Q_INSTAGRAM = "Instagramアカウント";

function onSupporterFormSubmit(e) {
  var values = e.namedValues; // 例: { "お名前": ["山田太郎"], "ご利用店舗": ["代官山"], ... }

  var name = getValue(values, Q_NAME);
  var phone = getValue(values, Q_PHONE);
  var email = getValue(values, Q_EMAIL);
  var store = getValue(values, Q_STORE);
  var instagram = getValue(values, Q_INSTAGRAM);

  if (!name) {
    return; // 名前が取得できない場合は何もしない
  }

  var properties = {
    "名前": { title: [{ text: { content: name } }] },
    "ステータス": { select: { name: "未対応" } }
  };
  if (phone) properties["電話番号"] = { phone_number: phone };
  if (email) properties["メールアドレス"] = { email: email };
  if (store) properties["利用店舗"] = { select: { name: store } };
  if (instagram) properties["Instagram"] = { rich_text: [{ text: { content: instagram } }] };

  var payload = {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: properties
  };

  var response = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + NOTION_TOKEN,
      "Notion-Version": "2022-06-28"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 300) {
    // Notion側への書き込みに失敗した場合は、あとで気づけるようログに残す
    // (実行ログ: Apps Scriptエディタ左メニュー「実行数」から確認できる)
    Logger.log("Notion登録に失敗しました: " + response.getResponseCode() + " " + response.getContentText());
  }
}

function getValue(namedValues, question) {
  var v = namedValues[question];
  return v && v.length ? v[0] : "";
}

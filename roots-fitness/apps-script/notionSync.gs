/**
 * Roots Fitness — フォーム → Notion/メール自動連携(統合版)
 *
 * 1つのスプレッドシート・1つのApps Scriptプロジェクトに、複数フォームの
 * 送信処理をまとめる場合の構成。それぞれのフォームの回答をこの1つの
 * スプレッドシートに「別シートとして」連携させ(Googleフォームの
 * 「回答」タブ→緑のスプレッドシートアイコン→「既存のスプレッドシートを選択」)、
 * このファイル内の該当する関数をトリガーに割り当てる。
 *
 * - 体験予約フォーム   → onFormSubmit
 * - サポーター申込フォーム → onSupporterFormSubmit
 *
 * 変数名は SUPPORTER_ / RESERVATION_ の接頭辞で分けており、
 * 今後フォームが増えても同じ命名ルールで追加できる。
 *
 * トリガー設定(左メニュー「トリガー」→「トリガーを追加」):
 * 1. 体験予約フォーム用: 実行する関数 onFormSubmit / イベントのソース フォームから
 *    / フォームを選択(体験予約) / イベントの種類 フォーム送信時
 * 2. サポーターフォーム用: 実行する関数 onSupporterFormSubmit / イベントのソース フォームから
 *    / フォームを選択(オフィシャルサポーター制度) / イベントの種類 フォーム送信時
 *
 * 同じスプレッドシートに複数フォームを紐づけている場合、トリガー追加時に
 * 「フォームを選択」でどのフォームの送信で発火させるかを選べる。
 */

// Notionへのアクセスに使う共通のインテグレーショントークン(両フォームで同じものを使用)。
// 実際の値は Notion の「Roots Supporter連携」インテグレーション設定ページから取得し、
// Apps Scriptエディタ上でこの行を直接書き換える(このリポジトリには実際の値をコミットしない)。
var NOTION_TOKEN = "REPLACE_ME_NOTION_INTEGRATION_TOKEN";

function getValue(namedValues, key) {
  return namedValues[key] && namedValues[key][0] ? namedValues[key][0].trim() : "";
}

function postToNotion(databaseId, properties) {
  var response = UrlFetchApp.fetch("https://api.notion.com/v1/pages", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + NOTION_TOKEN,
      "Notion-Version": "2022-06-28"
    },
    payload: JSON.stringify({ parent: { database_id: databaseId }, properties: properties }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 300) {
    Logger.log("Notion登録に失敗しました: " + response.getResponseCode() + " " + response.getContentText());
  }
}

/* ============================================================
   体験予約フォーム
   ============================================================ */

var RESERVATION_NOTION_DATABASE_ID = "20ce7162893c461ea0b2696a22e17c87";

var RESERVATION_STORE_REPLY_TEMPLATES = {
  "代官山": {
    subject: "【Roots Fitness 代官山店】体験予約のご案内",
    fitkarteUrl: "https://roots-fitness.fit-karte.com/mypage?s=roots-fitness-daikanyama&openExternalBrowser=1",
    bodyIntro: "代官山店へのお問い合わせ、ありがとうございます。"
  },
  "軽井沢": {
    subject: "【Roots Fitness 軽井沢店】体験予約のご案内",
    fitkarteUrl: "https://roots-fitness.fit-karte.com/mypage?s=roots-fitness-karuizawa&openExternalBrowser=1",
    bodyIntro: "軽井沢店へのお問い合わせ、ありがとうございます。"
  }
};

var RESERVATION_Q_NAME = "お名前";
var RESERVATION_Q_AGE = "ご年齢";
var RESERVATION_Q_STORE = "店舗選択";
var RESERVATION_Q_EMAIL = "メールアドレス";
var RESERVATION_Q_PHONE = "お電話番号";
var RESERVATION_Q_SOURCE = "知ったキッカケ";

var RESERVATION_ADMIN_NOTIFY_EMAILS = "yuta110309@gmail.com,kawashima@proudc-inc.com";

function onFormSubmit(e) {
  var values = e.namedValues;

  var name = getValue(values, RESERVATION_Q_NAME);
  var age = getValue(values, RESERVATION_Q_AGE);
  var store = getValue(values, RESERVATION_Q_STORE);
  var email = getValue(values, RESERVATION_Q_EMAIL);
  var phone = getValue(values, RESERVATION_Q_PHONE);
  var source = getValue(values, RESERVATION_Q_SOURCE);

  if (!email) {
    return;
  }

  addReservationToNotion(name, age, store, email, phone, source);

  var template = RESERVATION_STORE_REPLY_TEMPLATES[store];
  if (!template) {
    notifyAdminOfUnknownStore(store, email);
    return;
  }

  var body =
    name + " 様\n\n" +
    template.bodyIntro + "\n\n" +
    "以下のリンクより、体験予約のお手続きにお進みください。\n" +
    template.fitkarteUrl + "\n\n" +
    "ご不明な点がございましたら、このメールへの返信または公式LINEにてお気軽にご連絡ください。\n\n" +
    "Roots Fitness";

  MailApp.sendEmail(email, template.subject, body);
  notifyAdminOfNewReservation(name, age, store, email, phone, source);
}

function notifyAdminOfNewReservation(name, age, store, email, phone, source) {
  MailApp.sendEmail(
    RESERVATION_ADMIN_NOTIFY_EMAILS,
    "【体験予約】新規申込みがありました(" + store + ")",
    "体験予約フォームに新しい申込みがありました。\n\n" +
      "お名前: " + name + "\n" +
      "ご年齢: " + age + "\n" +
      "店舗: " + store + "\n" +
      "メールアドレス: " + email + "\n" +
      "お電話番号: " + phone + "\n" +
      "知ったキッカケ: " + source + "\n\n" +
      "詳細はGoogleフォームの回答スプレッドシートをご確認ください。"
  );
}

function notifyAdminOfUnknownStore(store, email) {
  MailApp.sendEmail(
    RESERVATION_ADMIN_NOTIFY_EMAILS,
    "[要確認] 体験予約フォームで未知の店舗が送信されました",
    "店舗名: " + store + "\n応募者メール: " + email +
      "\n\nRESERVATION_STORE_REPLY_TEMPLATES のキーとGoogleフォームの選択肢が一致しているか確認してください。"
  );
}

function addReservationToNotion(name, age, store, email, phone, source) {
  if (!name) return;

  var properties = {
    "名前": { title: [{ text: { content: name } }] },
    "ステータス": { select: { name: "未対応" } }
  };
  if (age) properties["年齢"] = { rich_text: [{ text: { content: age } }] };
  if (store) properties["店舗"] = { select: { name: store } };
  if (email) properties["メールアドレス"] = { email: email };
  if (phone) properties["電話番号"] = { phone_number: phone };
  if (source) properties["知ったキッカケ"] = { rich_text: [{ text: { content: source } }] };

  postToNotion(RESERVATION_NOTION_DATABASE_ID, properties);
}

/* ============================================================
   サポーター申込フォーム
   ============================================================ */

var SUPPORTER_NOTION_DATABASE_ID = "04298fd2ad344f9cb2f6e4a934ee44d0";

var SUPPORTER_Q_NAME = "お名前";
var SUPPORTER_Q_PHONE = "お電話番号";
var SUPPORTER_Q_EMAIL = "メールアドレス";
var SUPPORTER_Q_STORE = "ご利用店舗";
var SUPPORTER_Q_INSTAGRAM = "Instagramアカウント";

function onSupporterFormSubmit(e) {
  var values = e.namedValues;

  var name = getValue(values, SUPPORTER_Q_NAME);
  var phone = getValue(values, SUPPORTER_Q_PHONE);
  var email = getValue(values, SUPPORTER_Q_EMAIL);
  var store = getValue(values, SUPPORTER_Q_STORE);
  var instagram = getValue(values, SUPPORTER_Q_INSTAGRAM);

  if (!name) {
    return;
  }

  var properties = {
    "名前": { title: [{ text: { content: name } }] },
    "ステータス": { select: { name: "未対応" } }
  };
  if (phone) properties["電話番号"] = { phone_number: phone };
  if (email) properties["メールアドレス"] = { email: email };
  if (store) properties["利用店舗"] = { select: { name: store } };
  if (instagram) properties["Instagram"] = { rich_text: [{ text: { content: instagram } }] };

  postToNotion(SUPPORTER_NOTION_DATABASE_ID, properties);
}

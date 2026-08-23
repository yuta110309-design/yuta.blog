/**
 * Roots Fitness 体験予約フォーム — 店舗別自動返信メール + 運営宛て新規予約通知
 *
 * フォーム送信のたびに、(1) 応募者へ店舗別の案内メール、
 * (2) ADMIN_NOTIFY_EMAILS 宛てに新規予約の通知メール、の両方を送信する。
 *
 * 設置方法(概要。詳細は docs/reservation-form-setup.md):
 * 1. Googleフォームの回答スプレッドシート(または フォーム編集画面右上「⋮」)から
 *    「拡張機能 > Apps Script」を開く
 * 2. このファイルの内容をまるごと貼り付けて保存
 * 3. 左メニュー「トリガー」から onFormSubmit を追加
 *    (イベントのソース: フォームから / イベントの種類: フォーム送信時)
 * 4. 初回保存時にGoogleアカウントの権限承認を求められるので許可する
 *
 * 店舗が増えた場合は STORE_REPLY_TEMPLATES にオブジェクトを追加するだけでよい。
 * キー(店舗名)は、Googleフォームの「店舗選択」項目の選択肢の文言と
 * 完全に一致させること(一致しない場合は notifyAdminOfUnknownStore が動く)。
 */

var STORE_REPLY_TEMPLATES = {
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

// フォーム側の質問文(完全一致で参照するため定数化)
var Q_NAME = "お名前";
var Q_AGE = "ご年齢";
var Q_STORE = "店舗選択";
var Q_EMAIL = "メールアドレス";
var Q_PHONE = "お電話番号";
var Q_SOURCE = "知ったキッカケ";

// 新規予約の通知・未知の店舗名(表記ゆれ等)の通知を送る運営メールアドレス。
// 複数宛先はカンマ区切りで指定できる(MailApp.sendEmailの仕様)。
var ADMIN_NOTIFY_EMAILS = "yuta110309@gmail.com,kawashima@proudc-inc.com";

function onFormSubmit(e) {
  var values = e.namedValues; // 例: { "お名前": ["山田太郎"], "店舗選択": ["代官山"], ... }

  var name = getValue(values, Q_NAME);
  var age = getValue(values, Q_AGE);
  var store = getValue(values, Q_STORE);
  var email = getValue(values, Q_EMAIL);
  var phone = getValue(values, Q_PHONE);
  var source = getValue(values, Q_SOURCE);

  if (!email) {
    return; // メールアドレスが取得できない場合は何もしない
  }

  var template = STORE_REPLY_TEMPLATES[store];
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

function getValue(namedValues, key) {
  return namedValues[key] && namedValues[key][0] ? namedValues[key][0].trim() : "";
}

function notifyAdminOfNewReservation(name, age, store, email, phone, source) {
  MailApp.sendEmail(
    ADMIN_NOTIFY_EMAILS,
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
    ADMIN_NOTIFY_EMAILS,
    "[要確認] 体験予約フォームで未知の店舗が送信されました",
    "店舗名: " + store + "\n応募者メール: " + email +
      "\n\nSTORE_REPLY_TEMPLATES のキーとGoogleフォームの選択肢が一致しているか確認してください。"
  );
}

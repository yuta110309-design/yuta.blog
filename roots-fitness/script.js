(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Hamburger nav toggle                                                */
  /* ------------------------------------------------------------------ */
  var toggle = document.getElementById("nav-toggle");
  var panel = document.getElementById("nav-panel");

  function openNav() {
    panel.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }

  function closeNav() {
    panel.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var isOpen = panel.classList.contains("is-open");
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeNav();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 店舗設定(FitKarte予約URL / LINE URL)の読み込み                       */
  /* data/stores.json を編集するだけで店舗の追加・URL差し替えが可能。        */
  /* data-store-cta="<storeId>" を持つ要素の href を自動設定する。          */
  /* data-line-cta を持つ要素には公式LINEのURLを自動設定する。               */
  /* ------------------------------------------------------------------ */
  function applyStoreLinks(config) {
    if (!config || !config.stores) return;

    var storeMap = {};
    config.stores.forEach(function (store) {
      storeMap[store.id] = store;
    });

    document.querySelectorAll("[data-store-cta]").forEach(function (el) {
      var storeId = el.getAttribute("data-store-cta");
      var store = storeMap[storeId];
      if (store && store.fitkarteUrl) {
        el.setAttribute("href", store.fitkarteUrl);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });

    if (config.line && config.line.url) {
      document.querySelectorAll("[data-line-cta]").forEach(function (el) {
        el.setAttribute("href", config.line.url);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      });
    }
  }

  var storesDataUrl = document.body.getAttribute("data-stores-json") || "data/stores.json";

  fetch(storesDataUrl)
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(applyStoreLinks)
    .catch(function () {
      /* オフライン等でfetchできない場合はプレースホルダーのままにする */
    });

  /* ------------------------------------------------------------------ */
  /* News                                                                 */
  /* [data-news-source] を持つ要素にJSONを読み込み、カードを描画する。         */
  /* data-news-limit があれば件数を絞る(新しい日付順)。                     */
  /* 投稿の追加・編集は data/news.json を直接編集するだけでよい。            */
  /* ------------------------------------------------------------------ */
  function formatNewsDate(dateStr) {
    return dateStr.replace(/-/g, ".");
  }

  function buildNewsCardHtml(item) {
    var titleHtml =
      '<p class="news-card-title">' + item.title + "</p>" +
      (item.link ? '<span class="news-card-arrow">続きを見る →</span>' : "");

    var innerHtml =
      '<div class="news-card-meta">' +
        '<span class="news-card-date">' + formatNewsDate(item.date) + "</span>" +
        '<span class="news-card-badge">' + item.category + "</span>" +
      "</div>" +
      titleHtml +
      '<p class="news-card-body">' + item.body + "</p>";

    if (item.link) {
      var isExternal = /^https?:\/\//.test(item.link);
      return (
        '<a class="news-card" href="' + item.link + '"' +
        (isExternal ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" + innerHtml + "</a>"
      );
    }
    return '<div class="news-card">' + innerHtml + "</div>";
  }

  function renderNewsInto(el, items) {
    if (!items.length) {
      el.innerHTML = '<p class="news-empty">現在お知らせはありません。</p>';
      return;
    }
    el.innerHTML = items.map(buildNewsCardHtml).join("");
  }

  document.querySelectorAll("[data-news-source]").forEach(function (el) {
    var src = el.getAttribute("data-news-source");
    var limit = parseInt(el.getAttribute("data-news-limit"), 10) || null;

    fetch(src)
      .then(function (res) {
        return res.ok ? res.json() : { items: [] };
      })
      .then(function (data) {
        var items = (data.items || []).slice().sort(function (a, b) {
          return a.date < b.date ? 1 : -1;
        });
        if (limit) {
          items = items.slice(0, limit);
        }
        renderNewsInto(el, items);
      })
      .catch(function () {
        el.innerHTML = '<p class="news-empty">お知らせの読み込みに失敗しました。</p>';
      });
  });

  /* ------------------------------------------------------------------ */
  /* 体験予約フォーム(モーダル)                                            */
  /* [data-open-reservation] クリックでモーダルを開き、送信時は             */
  /* data/reservation-form.json の設定に従ってGoogleフォームへPOSTする。    */
  /* 設定手順: docs/reservation-form-setup.md                             */
  /* ------------------------------------------------------------------ */
  var reservationModal = document.getElementById("reservation-modal");

  if (reservationModal) {
    var reservationForm = document.getElementById("reservation-form");
    var reservationFormStep = reservationModal.querySelector('[data-reservation-step="form"]');
    var reservationSuccessStep = reservationModal.querySelector('[data-reservation-step="success"]');
    var reservationErrorEl = reservationModal.querySelector(".reservation-form-error");
    var reservationConfig = null;
    var reservationConfigUrl =
      document.body.getAttribute("data-reservation-json") || "data/reservation-form.json";

    fetch(reservationConfigUrl)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (config) {
        reservationConfig = config;
      })
      .catch(function () {
        /* 設定が読み込めない場合はプレースホルダーのまま(送信時に警告) */
      });

    function openReservationModal() {
      reservationModal.classList.add("is-open");
      document.body.classList.add("reservation-open");
      if (reservationFormStep) reservationFormStep.hidden = false;
      if (reservationSuccessStep) reservationSuccessStep.hidden = true;
    }

    function closeReservationModal() {
      reservationModal.classList.remove("is-open");
      document.body.classList.remove("reservation-open");
    }

    document.querySelectorAll("[data-open-reservation]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openReservationModal();
      });
    });

    reservationModal.querySelectorAll("[data-close-reservation]").forEach(function (el) {
      el.addEventListener("click", closeReservationModal);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && reservationModal.classList.contains("is-open")) {
        closeReservationModal();
      }
    });

    if (reservationForm) {
      reservationForm.addEventListener("submit", function (e) {
        e.preventDefault();

        if (reservationErrorEl) reservationErrorEl.textContent = "";

        if (!reservationForm.reportValidity()) {
          return;
        }

        if (
          !reservationConfig ||
          !reservationConfig.actionUrl ||
          reservationConfig.actionUrl.indexOf("REPLACE_ME") !== -1
        ) {
          console.warn(
            "data/reservation-form.json が未設定のため、実際の送信は行われていません(docs/reservation-form-setup.md を参照)。"
          );
          showReservationSuccess();
          return;
        }

        var formData = new FormData();
        var fields = reservationConfig.fields;
        new FormData(reservationForm).forEach(function (value, key) {
          if (fields[key]) {
            formData.append(fields[key], value);
          }
        });

        fetch(reservationConfig.actionUrl, {
          method: "POST",
          mode: "no-cors",
          body: formData
        })
          .then(showReservationSuccess)
          .catch(function () {
            if (reservationErrorEl) {
              reservationErrorEl.textContent =
                "送信に失敗しました。通信環境をご確認のうえ再度お試しください。";
            }
          });
      });
    }

    function showReservationSuccess() {
      if (reservationFormStep) reservationFormStep.hidden = true;
      if (reservationSuccessStep) reservationSuccessStep.hidden = false;
      if (reservationForm) reservationForm.reset();
    }
  }
})();

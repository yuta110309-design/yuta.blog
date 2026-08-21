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
})();

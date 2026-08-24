(function () {
  "use strict";

  /* 写真未確定のプレースホルダーで使う共通アイコン(index.html側の #photo-pending シンボルを参照)。 */
  var PHOTO_PLACEHOLDER_ICON =
    '<svg class="photo-placeholder-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#photo-pending"></use></svg>';

  /* モーダル共通のフォーカス制御(予約・プラン詳細・トレーナー詳細で共用)。      */
  /* 開いたときはモーダル内の閉じるボタンへ、閉じたときは開くきっかけになった      */
  /* 要素へフォーカスを戻す(キーボード操作時にフォーカスが迷子にならないように)。 */
  var modalLastFocused = new Map();

  function openModal(modal, triggerEl) {
    modalLastFocused.set(modal, triggerEl || document.activeElement);
    modal.classList.add("is-open");
    document.body.classList.add("reservation-open");
    var closeBtn = modal.querySelector(".reservation-modal-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    document.body.classList.remove("reservation-open");
    var toFocus = modalLastFocused.get(modal);
    modalLastFocused.delete(modal);
    if (toFocus && typeof toFocus.focus === "function") {
      toFocus.focus();
    }
  }

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
  /* Why Roots スライダー(横スライド + 矢印 + ドットページネーション)          */
  /* 共通のスライダー処理(setupCardSlider)を使う。定義は下の方にあるが、       */
  /* 関数宣言は巻き上げられるため、ここで呼び出しても問題ない。                 */
  /* ------------------------------------------------------------------ */
  var whyCards = document.getElementById("why-cards");
  var whyDots = document.getElementById("why-slider-dots");

  if (whyCards && whyDots) {
    setupCardSlider(whyCards, document.querySelector("[data-why-prev]"), document.querySelector("[data-why-next]"), whyDots);
  }

  /* ------------------------------------------------------------------ */
  /* 体験までの流れ スライダー(横スライド + 矢印 + ドットページネーション)       */
  /* ------------------------------------------------------------------ */
  var trialSteps = document.getElementById("trial-steps");
  var trialDots = document.getElementById("trial-slider-dots");

  if (trialSteps && trialDots) {
    setupCardSlider(trialSteps, document.querySelector("[data-trial-prev]"), document.querySelector("[data-trial-next]"), trialDots);
  }

  /* ------------------------------------------------------------------ */
  /* 店舗設定(FitKarte予約URL / Instagram URL / LINE URL)の読み込み          */
  /* data/stores.json を編集するだけで店舗の追加・URL差し替えが可能。        */
  /* data-store-cta="<storeId>" を持つ要素の href を自動設定する。          */
  /* data-instagram-cta="<storeId>" を持つ要素には店舗別Instagram URLを、    */
  /* data-line-cta を持つ要素には公式LINEのURLを自動設定する。               */
  /* ------------------------------------------------------------------ */
  var storeMapCache = {};

  function applyStoreLinks(config) {
    if (!config || !config.stores) return;

    var storeMap = {};
    config.stores.forEach(function (store) {
      storeMap[store.id] = store;
    });
    storeMapCache = storeMap;

    document.querySelectorAll("[data-store-cta]").forEach(function (el) {
      var storeId = el.getAttribute("data-store-cta");
      var store = storeMap[storeId];
      if (store && store.fitkarteUrl) {
        el.setAttribute("href", store.fitkarteUrl);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });

    document.querySelectorAll("[data-instagram-cta]").forEach(function (el) {
      var storeId = el.getAttribute("data-instagram-cta");
      var store = storeMap[storeId];
      if (store && store.instagramUrl) {
        el.setAttribute("href", store.instagramUrl);
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

  /* 予約投稿(小出し配信)用: 閲覧者の端末のローカル日付を YYYY-MM-DD で返す。
     data/news.json に未来の日付でitemを仕込んでおくと、その日を迎えるまで
     非表示になる(コード修正・再デプロイ不要)。 */
  function todayIsoDate() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
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
        var today = todayIsoDate();
        var items = (data.items || [])
          .filter(function (item) {
            return item.date <= today;
          })
          .slice()
          .sort(function (a, b) {
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

    function openReservationModal(triggerEl) {
      if (reservationFormStep) reservationFormStep.hidden = false;
      if (reservationSuccessStep) reservationSuccessStep.hidden = true;
      openModal(reservationModal, triggerEl);
    }

    function closeReservationModal() {
      closeModal(reservationModal);
    }

    document.querySelectorAll("[data-open-reservation]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openReservationModal(el);
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

  /* ------------------------------------------------------------------ */
  /* Plan(料金プラン)タブ切替 + 描画                                        */
  /* [data-plans-source] 配下の [data-plan-panel="<storeId>"] それぞれに、  */
  /* data/plans.json のカテゴリ/プランをカード形式で描画する。               */
  /* プランに "stores" 指定がなければ全タブ共通、指定があればそのタブのみ表示。*/
  /* storeId が "online" の場合は data.online.categories(一律月額プラン)を  */
  /* 使う。各カードの「詳細を見る」ボタンは、おすすめの人・セッション風景を    */
  /* plan-detail-modal に表示する。                                        */
  /* ------------------------------------------------------------------ */
  var planTabs = document.querySelectorAll("[data-plan-tab]");
  var planPanelsRoot = document.querySelector("[data-plans-source]");

  if (planTabs.length && planPanelsRoot) {
    var planById = {};

    function formatYen(amount) {
      return "¥" + amount.toLocaleString("ja-JP");
    }

    function buildPlanCardHtml(plan) {
      planById[plan.id] = plan;

      var priceHtml;
      if (plan.price === null || plan.price === undefined) {
        priceHtml = '<span class="plan-card-price-main plan-card-price-tbd">' + (plan.note || "料金未定") + "</span>";
      } else {
        priceHtml =
          '<span class="plan-card-price-main">' + formatYen(plan.price) +
          '<span class="plan-card-price-unit">/' + plan.priceUnit + "</span></span>" +
          (plan.unitPrice
            ? '<span class="plan-card-price-sub">単価 ' + formatYen(plan.unitPrice) + "</span>"
            : "");
      }

      return (
        '<div class="plan-card">' +
          '<div class="plan-card-head">' +
            '<span class="plan-card-name">' + plan.name + "</span>" +
            (plan.frequency ? '<span class="plan-card-freq">' + plan.frequency + "</span>" : "") +
          "</div>" +
          '<div class="plan-card-price">' + priceHtml + "</div>" +
          (plan.note && plan.price !== null && plan.price !== undefined
            ? '<p class="plan-card-note">' + plan.note + "</p>"
            : "") +
          '<button type="button" class="plan-card-detail-btn" data-plan-detail="' + plan.id + '">詳細を見る</button>' +
        "</div>"
      );
    }

    function planAppliesToStore(plan, storeId) {
      return !plan.stores || plan.stores.indexOf(storeId) !== -1;
    }

    var SCHEDULE_TIME_CLASS = { "朝": "is-morning", "昼": "is-noon", "夜": "is-night" };

    function buildScheduleRowHtml(label, times) {
      var timeClass = SCHEDULE_TIME_CLASS[label] || "";
      return (
        '<div class="plan-schedule-row ' + timeClass + '">' +
          '<span class="plan-schedule-label">' + label + "</span>" +
          '<div class="plan-schedule-times">' +
            times.map(function (t) {
              return '<span class="plan-schedule-chip">' + t + "</span>";
            }).join("") +
          "</div>" +
        "</div>"
      );
    }

    function buildScheduleHtml(schedule) {
      if (!schedule) return "";
      return (
        '<div class="plan-schedule">' +
          '<h4 class="plan-schedule-title">時間割</h4>' +
          Object.keys(schedule).map(function (label) {
            return buildScheduleRowHtml(label, schedule[label]);
          }).join("") +
        "</div>"
      );
    }

    function buildPanelHtml(categories, storeId) {
      var html = "";
      categories.forEach(function (category) {
        var plans = category.plans.filter(function (plan) {
          return planAppliesToStore(plan, storeId);
        });
        if (!plans.length) return;
        html +=
          '<div class="plan-category">' +
            '<h3 class="plan-category-title">' + category.name + "</h3>" +
            buildScheduleHtml(category.schedule) +
            '<div class="plan-cards">' + plans.map(buildPlanCardHtml).join("") + "</div>" +
          "</div>";
      });
      return html || '<p class="plan-loading">現在この店舗のプランは準備中です。</p>';
    }

    fetch(planPanelsRoot.getAttribute("data-plans-source"))
      .then(function (res) {
        return res.ok ? res.json() : { categories: [] };
      })
      .then(function (data) {
        var defaultCategories = data.categories || [];
        var onlineCategories = data.online && data.online.categories ? data.online.categories : defaultCategories;

        planPanelsRoot.querySelectorAll("[data-plan-panel]").forEach(function (panel) {
          var storeId = panel.getAttribute("data-plan-panel");
          var categories = storeId === "online" ? onlineCategories : defaultCategories;
          panel.innerHTML = buildPanelHtml(categories, storeId);
        });
      })
      .catch(function () {
        planPanelsRoot.querySelectorAll("[data-plan-panel]").forEach(function (panel) {
          panel.innerHTML = '<p class="plan-loading">料金プランの読み込みに失敗しました。</p>';
        });
      });

    planTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-plan-tab");

        planTabs.forEach(function (t) {
          var isActive = t === tab;
          t.classList.toggle("is-active", isActive);
          t.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        planPanelsRoot.querySelectorAll("[data-plan-panel]").forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-plan-panel") !== target;
        });
      });
    });

    /* Plan detail modal(どんな人におすすめか / セッション風景) */
    var planDetailModal = document.getElementById("plan-detail-modal");
    var planDetailBody = document.getElementById("plan-detail-modal-body");

    if (planDetailModal && planDetailBody) {
      function openPlanDetailModal(plan, triggerEl, storeId) {
        var priceLine =
          plan.price === null || plan.price === undefined
            ? plan.note || "料金未定"
            : formatYen(plan.price) + " / " + plan.priceUnit + (plan.unitPrice ? "(単価 " + formatYen(plan.unitPrice) + ")" : "");

        var store = storeMapCache[storeId];
        var fitkarteLinkHtml =
          store && store.fitkarteUrl
            ? '<a href="' + store.fitkarteUrl + '" class="btn btn-line btn-small plan-detail-fitkarte-link" target="_blank" rel="noopener noreferrer">フィットカルテで予約する</a>'
            : "";

        planDetailBody.innerHTML =
          '<span class="section-eyebrow">Plan Detail</span>' +
          '<h2 id="plan-detail-modal-title" class="section-title">' + plan.name + "</h2>" +
          '<p class="plan-detail-price">' + priceLine + "</p>" +
          '<div class="plan-detail-photo">' + PHOTO_PLACEHOLDER_ICON + (plan.photoNote || "セッション風景") + "</div>" +
          '<h3 class="plan-detail-subhead">こんな方におすすめ</h3>' +
          '<p class="plan-detail-recommend">' + (plan.recommendedFor || "準備中です。") + "</p>" +
          fitkarteLinkHtml;

        openModal(planDetailModal, triggerEl);
      }

      function closePlanDetailModal() {
        closeModal(planDetailModal);
      }

      planPanelsRoot.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-plan-detail]");
        if (!btn) return;
        var plan = planById[btn.getAttribute("data-plan-detail")];
        var panel = btn.closest("[data-plan-panel]");
        var storeId = panel ? panel.getAttribute("data-plan-panel") : null;
        if (plan) openPlanDetailModal(plan, btn, storeId);
      });

      planDetailModal.querySelectorAll("[data-close-plan-detail]").forEach(function (el) {
        el.addEventListener("click", closePlanDetailModal);
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && planDetailModal.classList.contains("is-open")) {
          closePlanDetailModal();
        }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Trainer                                                               */
  /* [data-trainers-source] に data/trainers.json を読み込み、店舗(store)     */
  /* ごとにグルーピングして横スライドのカードで表示する。                       */
  /* カードをタップすると経歴・実績・想いをモーダル展開する。                    */
  /* トレーナーの追加・編集は data/trainers.json を編集するだけでよい。        */
  /* ------------------------------------------------------------------ */
  var trainerGroups = document.querySelector("[data-trainers-source]");

  function trainerRoleLine(trainer) {
    var storeLabel = trainer.store === "online" ? trainer.storeName : trainer.storeName + "店";
    return storeLabel + " / " + trainer.role;
  }

  if (trainerGroups) {
    var trainerById = {};

    function buildTrainerCardHtml(trainer) {
      trainerById[trainer.id] = trainer;
      return (
        '<button type="button" class="trainer-card" data-trainer-detail="' + trainer.id + '">' +
          '<span class="trainer-card-photo">' + PHOTO_PLACEHOLDER_ICON + (trainer.photoNote || "トレーナー写真") + "</span>" +
          '<span class="trainer-card-body">' +
            '<span class="trainer-card-name">' + trainer.name + "</span>" +
            '<span class="trainer-card-role">' + trainer.role + "</span>" +
            '<span class="trainer-card-summary">' + trainer.summary + "</span>" +
            '<span class="trainer-card-link">タップして詳細を見る →</span>' +
          "</span>" +
        "</button>"
      );
    }

    function buildTrainerGroupHtml(group) {
      return (
        '<div class="trainer-group">' +
          '<h3 class="trainer-group-title">' + group.storeName + "</h3>" +
          '<div class="trainer-cards">' + group.trainers.map(buildTrainerCardHtml).join("") + "</div>" +
        "</div>"
      );
    }

    fetch(trainerGroups.getAttribute("data-trainers-source"))
      .then(function (res) {
        return res.ok ? res.json() : { trainers: [] };
      })
      .then(function (data) {
        var trainers = data.trainers || [];

        if (!trainers.length) {
          trainerGroups.innerHTML = '<p class="plan-loading">現在準備中です。</p>';
          return;
        }

        var groupOrder = [];
        var groupsByStore = {};
        trainers.forEach(function (trainer) {
          var key = trainer.store || trainer.storeName || "";
          if (!groupsByStore[key]) {
            groupsByStore[key] = { storeName: trainer.storeName, trainers: [] };
            groupOrder.push(key);
          }
          groupsByStore[key].trainers.push(trainer);
        });

        trainerGroups.innerHTML = groupOrder.map(function (key) {
          return buildTrainerGroupHtml(groupsByStore[key]);
        }).join("");
      })
      .catch(function () {
        trainerGroups.innerHTML = '<p class="plan-loading">トレーナー情報の読み込みに失敗しました。</p>';
      });

    var trainerDetailModal = document.getElementById("trainer-detail-modal");
    var trainerDetailBody = document.getElementById("trainer-detail-modal-body");

    if (trainerDetailModal && trainerDetailBody) {
      var ALL_WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

      function buildTrainerDaysHtml(trainer) {
        var activeDays = trainer.days || [];
        if (!activeDays.length) {
          return (
            '<div class="trainer-detail-days">' +
              '<span class="trainer-detail-days-label">担当曜日</span>' +
              '<p class="trainer-detail-days-note">曜日は確定次第掲載します。</p>' +
            "</div>"
          );
        }
        return (
          '<div class="trainer-detail-days">' +
            '<span class="trainer-detail-days-label">担当曜日</span>' +
            '<div class="trainer-detail-days-list">' +
              ALL_WEEKDAYS.map(function (day) {
                var isActive = activeDays.indexOf(day) !== -1;
                return '<span class="trainer-day' + (isActive ? " is-active" : "") + '">' + day + "</span>";
              }).join("") +
            "</div>" +
          "</div>"
        );
      }

      function openTrainerDetailModal(trainer, triggerEl) {
        trainerDetailBody.innerHTML =
          '<span class="section-eyebrow">Trainer</span>' +
          '<h2 id="trainer-detail-modal-title" class="section-title">' + trainer.name + "</h2>" +
          '<p class="trainer-detail-role">' + trainerRoleLine(trainer) + "</p>" +
          buildTrainerDaysHtml(trainer) +
          '<div class="plan-detail-photo">' + PHOTO_PLACEHOLDER_ICON + (trainer.photoNote || "トレーナー写真") + "</div>" +
          '<h3 class="plan-detail-subhead">経歴・実績</h3>' +
          '<p class="plan-detail-recommend">' + trainer.career + "</p>" +
          '<h3 class="plan-detail-subhead" style="margin-top: 20px;">トレーナーとしての想い</h3>' +
          '<p class="plan-detail-recommend">' + trainer.message + "</p>";

        openModal(trainerDetailModal, triggerEl);
      }

      function closeTrainerDetailModal() {
        closeModal(trainerDetailModal);
      }

      trainerGroups.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-trainer-detail]");
        if (!btn) return;
        var trainer = trainerById[btn.getAttribute("data-trainer-detail")];
        if (trainer) openTrainerDetailModal(trainer, btn);
      });

      trainerDetailModal.querySelectorAll("[data-close-trainer-detail]").forEach(function (el) {
        el.addEventListener("click", closeTrainerDetailModal);
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && trainerDetailModal.classList.contains("is-open")) {
          closeTrainerDetailModal();
        }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 汎用の横スライダー(矢印+ドット)セットアップ。                          */
  /* Why Roots・口コミなど、同じ操作性のスライダーを複数箇所で使うための共通処理。*/
  /* ------------------------------------------------------------------ */
  function setupCardSlider(cardsEl, prevBtn, nextBtn, dotsEl) {
    var cardEls = Array.prototype.slice.call(cardsEl.children);
    var dotEls = dotsEl ? Array.prototype.slice.call(dotsEl.querySelectorAll("[data-slider-dot]")) : [];

    function step() {
      return cardEls[0] ? cardEls[0].getBoundingClientRect().width + 14 : cardsEl.clientWidth;
    }

    function currentIndex() {
      return Math.round(cardsEl.scrollLeft / step());
    }

    function scrollToIndex(index) {
      var clamped = Math.max(0, Math.min(index, cardEls.length - 1));
      cardsEl.scrollTo({ left: clamped * step(), behavior: "smooth" });
    }

    function setActiveDot(index) {
      dotEls.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        scrollToIndex(currentIndex() - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        scrollToIndex(currentIndex() + 1);
      });
    }

    dotEls.forEach(function (dot, index) {
      dot.addEventListener("click", function () {
        scrollToIndex(index);
      });
    });

    var scrollTimer = null;
    cardsEl.addEventListener("scroll", function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        setActiveDot(currentIndex());
      }, 100);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Googleマップの口コミ(店舗ごとに星平均+件数を表示し、実際の口コミ本文が    */
  /* あれば横スライドのカードで、なければ「Googleで見る」リンクのみ表示する)。 */
  /* [data-reviews-source] に data/reviews.json を読み込んで描画する。        */
  /* ------------------------------------------------------------------ */
  var reviewGroups = document.querySelector("[data-reviews-source]");

  if (reviewGroups) {
    function buildStarsHtml(rating) {
      var filled = Math.round(rating || 0);
      var html = "";
      for (var i = 0; i < 5; i++) {
        html += '<span class="review-star' + (i < filled ? " is-filled" : "") + '">★</span>';
      }
      return html;
    }

    function buildReviewCardHtml(review) {
      return (
        '<div class="review-card">' +
          '<div class="review-card-head">' +
            '<span class="review-card-avatar">' + (review.author ? review.author.charAt(0) : "") + "</span>" +
            '<span class="review-card-head-body">' +
              '<span class="review-card-author">' + review.author + "</span>" +
              '<span class="review-card-date">' + review.date + "</span>" +
            "</span>" +
          "</div>" +
          '<div class="review-card-stars">' + buildStarsHtml(review.rating) + "</div>" +
          '<p class="review-card-text">' + review.text + "</p>" +
          (review.photo
            ? '<img class="review-card-photo" src="' + review.photo + '" alt="' + (review.photoAlt || "口コミに添付された写真") + '" loading="lazy">'
            : "") +
          '<span class="review-card-source">(Googleのクチコミから引用)</span>' +
        "</div>"
      );
    }

    function buildReviewGroupHtml(store, groupIndex) {
      var reviews = store.reviews || [];
      var sliderId = "review-cards-" + store.id;

      var bodyHtml;
      if (reviews.length) {
        bodyHtml =
          '<div class="review-slider">' +
            '<button type="button" class="review-slider-arrow review-slider-arrow-prev" data-review-prev="' + groupIndex + '" aria-label="前の口コミへ">‹</button>' +
            '<div class="review-cards" id="' + sliderId + '">' +
              reviews.map(buildReviewCardHtml).join("") +
            "</div>" +
            '<button type="button" class="review-slider-arrow review-slider-arrow-next" data-review-next="' + groupIndex + '" aria-label="次の口コミへ">›</button>' +
          "</div>" +
          '<div class="review-slider-dots" data-review-dots="' + groupIndex + '">' +
            reviews.map(function (r, i) {
              return '<button type="button" class="review-slider-dot' + (i === 0 ? " is-active" : "") + '" data-slider-dot data-review-dot="' + i + '" aria-label="' + (i + 1) + '件目"></button>';
            }).join("") +
          "</div>";
      } else {
        bodyHtml = '<p class="review-group-note">個別の口コミは準備中です。</p>';
      }

      return (
        '<div class="review-group">' +
          '<div class="review-summary">' +
            '<h3 class="review-summary-store">' + store.storeName + "</h3>" +
            '<div class="review-summary-stars">' +
              buildStarsHtml(store.rating) +
              '<span class="review-summary-score">' + store.rating.toFixed(1) + "</span>" +
              '<span class="review-summary-count">(' + store.reviewCount + "件)</span>" +
            "</div>" +
          "</div>" +
          bodyHtml +
          (store.mapsUrl
            ? '<a class="link-line review-summary-link" href="' + store.mapsUrl + '" target="_blank" rel="noopener noreferrer">Googleで口コミをすべて見る ↗</a>'
            : "") +
        "</div>"
      );
    }

    fetch(reviewGroups.getAttribute("data-reviews-source"))
      .then(function (res) {
        return res.ok ? res.json() : { stores: [] };
      })
      .then(function (data) {
        var stores = data.stores || [];

        if (!stores.length) {
          reviewGroups.innerHTML = '<p class="plan-loading">現在準備中です。</p>';
          return;
        }

        reviewGroups.innerHTML = stores.map(buildReviewGroupHtml).join("");

        stores.forEach(function (store, groupIndex) {
          if (!(store.reviews || []).length) return;
          var cardsEl = document.getElementById("review-cards-" + store.id);
          var prevBtn = document.querySelector('[data-review-prev="' + groupIndex + '"]');
          var nextBtn = document.querySelector('[data-review-next="' + groupIndex + '"]');
          var dotsEl = document.querySelector('[data-review-dots="' + groupIndex + '"]');
          if (cardsEl) setupCardSlider(cardsEl, prevBtn, nextBtn, dotsEl);
        });
      })
      .catch(function () {
        reviewGroups.innerHTML = '<p class="plan-loading">口コミの読み込みに失敗しました。</p>';
      });
  }

  /* ------------------------------------------------------------------ */
  /* FAQ(カテゴリタグ + アコーディオン)                                    */
  /* [data-faq-source] に data/faq.json を読み込み、カテゴリ(categories)     */
  /* ごとにタグボタンを生成する。タグをタップすると、そのカテゴリの質問だけを     */
  /* ネイティブの<details>/<summary>アコーディオンで表示する。                */
  /* 質問の追加・編集はdata/faq.jsonを編集するだけでよい。                    */
  /* ------------------------------------------------------------------ */
  var faqList = document.querySelector("[data-faq-source]");
  var faqTabs = document.getElementById("faq-tabs");

  function buildFaqItemHtml(item) {
    return (
      '<details class="faq-item">' +
        "<summary>" + item.q + "</summary>" +
        '<div class="faq-answer">' + item.a + "</div>" +
      "</details>"
    );
  }

  function buildFaqTabHtml(category, index) {
    return (
      '<button type="button" class="faq-tab' + (index === 0 ? " is-active" : "") + '" role="tab" ' +
        'aria-selected="' + (index === 0 ? "true" : "false") + '" data-faq-tab="' + index + '">' +
        category.name +
      "</button>"
    );
  }

  function renderFaqCategory(category) {
    faqList.innerHTML = category && (category.items || []).length
      ? category.items.map(buildFaqItemHtml).join("")
      : '<p class="plan-loading">現在準備中です。</p>';
  }

  if (faqList && faqTabs) {
    fetch(faqList.getAttribute("data-faq-source"))
      .then(function (res) {
        return res.ok ? res.json() : { categories: [] };
      })
      .then(function (data) {
        var categories = data.categories || [];

        if (!categories.length) {
          faqTabs.innerHTML = "";
          faqList.innerHTML = '<p class="plan-loading">現在準備中です。</p>';
          return;
        }

        faqTabs.innerHTML = categories.map(buildFaqTabHtml).join("");
        renderFaqCategory(categories[0]);

        faqTabs.addEventListener("click", function (e) {
          var tab = e.target.closest("[data-faq-tab]");
          if (!tab) return;

          faqTabs.querySelectorAll("[data-faq-tab]").forEach(function (t) {
            var isActive = t === tab;
            t.classList.toggle("is-active", isActive);
            t.setAttribute("aria-selected", isActive ? "true" : "false");
          });

          renderFaqCategory(categories[Number(tab.getAttribute("data-faq-tab"))]);
        });
      })
      .catch(function () {
        faqTabs.innerHTML = "";
        faqList.innerHTML = '<p class="plan-loading">FAQの読み込みに失敗しました。</p>';
      });
  }
})();

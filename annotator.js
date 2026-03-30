/**
 * Prototype Annotator
 *
 * 프로토타입 위에 어노테이션(핀)을 추가할 수 있는 오버레이 도구.
 * - 화면(Screen)별로 어노테이션 분리 가능
 * - 사용법: <script src="annotator.js"></script> 한 줄 추가
 */
(function () {
  "use strict";

  var PIN_TYPES = {
    announcement: { label: "Announcement", color: "#e17055", icon: "!" },
    ui: { label: "UI 정보", color: "#636e72", icon: "i" },
    question: { label: "Question", color: "#fdcb6e", icon: "?" },
    policy: { label: "정책", color: "#6c5ce7", icon: "P" },
  };

  var STORAGE_KEY = "annotator_v2_" + location.pathname;

  // ── 데이터 구조 ──
  // { screens: ["기본", ...], current: "기본", pins: { "기본": [...], ... } }
  var data = loadData();
  var annotateMode = false;
  var selectedType = "announcement";
  var pinElements = [];
  var activePopup = null;

  // ── 스타일 ──
  var style = document.createElement("style");
  style.textContent =
    '#ann-toolbar{position:fixed;top:12px;right:12px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;gap:6px;align-items:center;background:#2d3436;padding:8px 12px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);user-select:none;flex-wrap:wrap;max-width:calc(100vw - 24px);}' +
    "#ann-toolbar *{margin:0;padding:0;box-sizing:border-box;}" +
    "#ann-toolbar .ann-btn{padding:6px 12px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;color:#fff;display:flex;align-items:center;gap:4px;white-space:nowrap;}" +
    "#ann-toolbar .ann-btn:hover{filter:brightness(1.1);}" +
    "#ann-toolbar .ann-btn.active{box-shadow:0 0 0 2px #fff;}" +
    "#ann-toolbar .ann-toggle{padding:6px 14px;border:2px solid #636e72;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;background:transparent;color:#b2bec3;}" +
    "#ann-toolbar .ann-toggle.on{border-color:#00b894;background:#00b894;color:#fff;}" +
    "#ann-toolbar .ann-divider{width:1px;height:20px;background:#636e72;}" +
    "#ann-toolbar .ann-count{font-size:11px;color:#b2bec3;min-width:20px;text-align:center;}" +
    "#ann-toolbar .ann-small{padding:6px 8px;border:none;border-radius:6px;font-size:11px;cursor:pointer;background:#3d3d3d;color:#b2bec3;transition:all .15s;}" +
    "#ann-toolbar .ann-small:hover{background:#555;color:#fff;}" +
    // Screen selector
    "#ann-screen-bar{display:flex;gap:4px;align-items:center;}" +
    "#ann-screen-bar .ann-screen-tab{padding:4px 10px;border:1px solid #555;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:transparent;color:#b2bec3;transition:all .15s;white-space:nowrap;}" +
    "#ann-screen-bar .ann-screen-tab.active{border-color:#74b9ff;background:rgba(116,185,255,0.15);color:#74b9ff;}" +
    "#ann-screen-bar .ann-screen-tab:hover{border-color:#74b9ff;}" +
    "#ann-screen-bar .ann-screen-add{padding:4px 8px;border:1px dashed #555;border-radius:6px;font-size:11px;cursor:pointer;background:transparent;color:#636e72;transition:all .15s;}" +
    "#ann-screen-bar .ann-screen-add:hover{border-color:#74b9ff;color:#74b9ff;}" +
    // Pins
    ".ann-pin{position:absolute;z-index:99992;cursor:pointer;transition:transform .15s;}" +
    ".ann-pin:hover{transform:scale(1.15);}" +
    ".ann-pin-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;}" +
    ".ann-pin-label{position:absolute;top:-6px;right:-6px;background:#2d3436;color:#fff;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;}" +
    // Popup
    '.ann-popup{position:absolute;z-index:99995;width:320px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);border:1px solid #eee;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;}' +
    ".ann-popup-header{padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f2f6;}" +
    ".ann-popup-type{font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;color:#fff;}" +
    ".ann-popup-actions{display:flex;gap:6px;}" +
    ".ann-popup-actions button{background:none;border:none;cursor:pointer;font-size:14px;padding:4px;border-radius:4px;}" +
    ".ann-popup-actions button:hover{background:#f1f2f6;}" +
    ".ann-popup-body{padding:12px 16px;}" +
    ".ann-popup-body textarea{width:100%;min-height:80px;border:1px solid #dfe6e9;border-radius:8px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;line-height:1.5;}" +
    ".ann-popup-body textarea:focus{outline:none;border-color:#6c5ce7;}" +
    ".ann-popup-footer{padding:8px 16px;border-top:1px solid #f1f2f6;display:flex;justify-content:flex-end;gap:6px;}" +
    ".ann-popup-footer button{padding:6px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;}" +
    ".ann-popup-save{background:#6c5ce7;color:#fff;}" +
    ".ann-popup-cancel{background:#f1f2f6;color:#636e72;}" +
    ".ann-popup-content{padding:12px 16px;font-size:13px;line-height:1.6;color:#2d3436;white-space:pre-wrap;word-break:break-word;}" +
    ".ann-crosshair{cursor:crosshair !important;}" +
    ".ann-crosshair *{cursor:crosshair !important;}" +
    ".ann-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99991;}";
  document.head.appendChild(style);

  // ── 현재 화면 핀 가져오기 ──
  function currentPins() {
    return data.pins[data.current] || [];
  }
  function setCurrentPins(pins) {
    data.pins[data.current] = pins;
  }

  // ── 툴바 ──
  var toolbar = document.createElement("div");
  toolbar.id = "ann-toolbar";
  document.body.appendChild(toolbar);

  function renderToolbar() {
    var pins = currentPins();
    toolbar.innerHTML =
      '<button class="ann-toggle' + (annotateMode ? " on" : "") + '" id="annToggle">' +
      (annotateMode ? "Annotating..." : "Annotate") + "</button>" +
      '<div class="ann-divider"></div>' +
      // Screen tabs
      '<div id="ann-screen-bar" class="ann-screen-bar"></div>' +
      '<div class="ann-divider"></div>' +
      // Type buttons (annotate mode only)
      (annotateMode ? '<div id="annTypes" style="display:flex;gap:4px;"></div><div class="ann-divider"></div>' : "") +
      '<span class="ann-count">' + pins.length + "</span>" +
      '<button class="ann-small" id="annExport" title="JSON Export">Export</button>' +
      '<button class="ann-small" id="annClear" title="현재 화면 핀 삭제">Clear</button>';

    // Screen tabs
    var screenBar = document.getElementById("ann-screen-bar");
    data.screens.forEach(function (name) {
      var tab = document.createElement("button");
      tab.className = "ann-screen-tab" + (name === data.current ? " active" : "");
      tab.textContent = name;

      // 더블클릭으로 이름 변경
      tab.addEventListener("dblclick", function (e) {
        e.stopPropagation();
        var newName = prompt("화면 이름 변경:", name);
        if (!newName || newName === name) return;
        if (data.screens.indexOf(newName) !== -1) { alert("이미 존재하는 이름입니다."); return; }
        var idx = data.screens.indexOf(name);
        data.screens[idx] = newName;
        data.pins[newName] = data.pins[name];
        delete data.pins[name];
        if (data.current === name) data.current = newName;
        saveData();
        renderToolbar();
        renderPins();
      });

      // 클릭으로 전환
      tab.addEventListener("click", function () {
        data.current = name;
        saveData();
        renderToolbar();
        renderPins();
      });

      // 우클릭으로 삭제 (화면이 2개 이상일 때만)
      tab.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        if (data.screens.length <= 1) return;
        if (!confirm('"' + name + '" 화면을 삭제할까요? (핀도 삭제됩니다)')) return;
        data.screens = data.screens.filter(function (s) { return s !== name; });
        delete data.pins[name];
        if (data.current === name) data.current = data.screens[0];
        saveData();
        renderToolbar();
        renderPins();
      });

      screenBar.appendChild(tab);
    });

    // + 버튼
    var addBtn = document.createElement("button");
    addBtn.className = "ann-screen-add";
    addBtn.textContent = "+";
    addBtn.addEventListener("click", function () {
      var name = prompt("새 화면 이름:");
      if (!name) return;
      if (data.screens.indexOf(name) !== -1) { alert("이미 존재하는 이름입니다."); return; }
      data.screens.push(name);
      data.pins[name] = [];
      data.current = name;
      saveData();
      renderToolbar();
      renderPins();
    });
    screenBar.appendChild(addBtn);

    // Type buttons
    if (annotateMode) {
      var typesContainer = document.getElementById("annTypes");
      Object.keys(PIN_TYPES).forEach(function (key) {
        var t = PIN_TYPES[key];
        var btn = document.createElement("button");
        btn.className = "ann-btn" + (key === selectedType ? " active" : "");
        btn.style.background = t.color;
        btn.innerHTML = t.icon + " " + t.label;
        btn.dataset.type = key;
        btn.addEventListener("click", function () {
          selectedType = key;
          typesContainer.querySelectorAll(".ann-btn").forEach(function (b) {
            b.classList.toggle("active", b.dataset.type === key);
          });
        });
        typesContainer.appendChild(btn);
      });
    }

    // Event listeners
    document.getElementById("annToggle").addEventListener("click", function () {
      annotateMode = !annotateMode;
      document.body.classList.toggle("ann-crosshair", annotateMode);
      if (annotateMode) { addClickOverlay(); } else { removeClickOverlay(); }
      renderToolbar();
    });

    document.getElementById("annExport").addEventListener("click", function () {
      var exportData = JSON.stringify(data, null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(exportData);
      alert("Exported (clipboard)");
    });

    document.getElementById("annClear").addEventListener("click", function () {
      var pins = currentPins();
      if (!pins.length || !confirm(pins.length + "개 어노테이션을 삭제할까요?")) return;
      setCurrentPins([]);
      saveData();
      renderToolbar();
      renderPins();
    });
  }

  // ── 클릭 오버레이 ──
  var overlay = null;

  function addClickOverlay() {
    removeClickOverlay();
    overlay = document.createElement("div");
    overlay.className = "ann-overlay";
    overlay.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var pin = {
        id: Date.now(),
        type: selectedType,
        x: e.pageX,
        y: e.pageY,
        text: "",
        created: new Date().toISOString(),
      };
      var pins = currentPins();
      pins.push(pin);
      setCurrentPins(pins);
      saveData();
      renderPins();
      renderToolbar();
      openEditPopup(pin);
    });
    document.body.appendChild(overlay);
  }

  function removeClickOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  // ── 핀 렌더링 ──
  function renderPins() {
    pinElements.forEach(function (el) { el.remove(); });
    pinElements = [];
    var pins = currentPins();
    pins.forEach(function (pin, idx) {
      var t = PIN_TYPES[pin.type] || PIN_TYPES.ui;
      var el = document.createElement("div");
      el.className = "ann-pin";
      el.style.left = pin.x - 12 + "px";
      el.style.top = pin.y - 12 + "px";
      el.innerHTML =
        '<div class="ann-pin-dot" style="background:' + t.color + '">' + t.icon + "</div>" +
        '<div class="ann-pin-label">' + (idx + 1) + "</div>";
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        openViewPopup(pin);
      });
      document.body.appendChild(el);
      pinElements.push(el);
    });
  }

  // ── 팝업: 보기 ──
  function openViewPopup(pin) {
    closePopup();
    var t = PIN_TYPES[pin.type] || PIN_TYPES.ui;
    var popup = document.createElement("div");
    popup.className = "ann-popup";
    popup.style.left = pin.x + 20 + "px";
    popup.style.top = pin.y - 10 + "px";
    popup.innerHTML =
      '<div class="ann-popup-header">' +
      '<span class="ann-popup-type" style="background:' + t.color + '">' + t.label + "</span>" +
      '<div class="ann-popup-actions">' +
      '<button class="ann-edit" title="수정">✏️</button>' +
      '<button class="ann-delete" title="삭제">🗑️</button>' +
      '<button class="ann-close" title="닫기">✕</button>' +
      "</div></div>" +
      '<div class="ann-popup-content">' + escapeHtml(pin.text || "(내용 없음)") + "</div>";
    popup.querySelector(".ann-close").addEventListener("click", closePopup);
    popup.querySelector(".ann-edit").addEventListener("click", function () { closePopup(); openEditPopup(pin); });
    popup.querySelector(".ann-delete").addEventListener("click", function () {
      setCurrentPins(currentPins().filter(function (p) { return p.id !== pin.id; }));
      saveData(); renderPins(); renderToolbar(); closePopup();
    });
    document.body.appendChild(popup);
    activePopup = popup;
    clampPopup(popup);
  }

  // ── 팝업: 편집 ──
  function openEditPopup(pin) {
    closePopup();
    var typeButtons = Object.keys(PIN_TYPES).map(function (key) {
      var pt = PIN_TYPES[key];
      var sel = key === pin.type ? "box-shadow:0 0 0 2px #333;" : "opacity:0.5;";
      return '<button data-type="' + key + '" style="padding:3px 8px;border:none;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;color:#fff;background:' + pt.color + ";" + sel + '">' + pt.label + "</button>";
    }).join("");
    var popup = document.createElement("div");
    popup.className = "ann-popup";
    popup.style.left = pin.x + 20 + "px";
    popup.style.top = pin.y - 10 + "px";
    popup.innerHTML =
      '<div class="ann-popup-header">' +
      '<div style="display:flex;gap:4px;">' + typeButtons + "</div>" +
      '<button class="ann-close" style="background:none;border:none;cursor:pointer;font-size:14px;">✕</button>' +
      "</div>" +
      '<div class="ann-popup-body"><textarea placeholder="어노테이션 내용을 작성하세요...">' + (pin.text || "") + "</textarea></div>" +
      '<div class="ann-popup-footer">' +
      '<button class="ann-popup-cancel">취소</button>' +
      '<button class="ann-popup-save">저장</button>' +
      "</div>";
    popup.querySelectorAll("[data-type]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        pin.type = btn.dataset.type;
        popup.querySelectorAll("[data-type]").forEach(function (b) {
          b.style.opacity = b.dataset.type === pin.type ? "1" : "0.5";
          b.style.boxShadow = b.dataset.type === pin.type ? "0 0 0 2px #333" : "none";
        });
      });
    });
    popup.querySelector(".ann-popup-save").addEventListener("click", function () {
      pin.text = popup.querySelector("textarea").value;
      saveData(); renderPins(); renderToolbar(); closePopup();
    });
    var cancelFn = function () {
      if (!pin.text) {
        setCurrentPins(currentPins().filter(function (p) { return p.id !== pin.id; }));
        saveData(); renderPins(); renderToolbar();
      }
      closePopup();
    };
    popup.querySelector(".ann-popup-cancel").addEventListener("click", cancelFn);
    popup.querySelector(".ann-close").addEventListener("click", cancelFn);
    document.body.appendChild(popup);
    activePopup = popup;
    clampPopup(popup);
    setTimeout(function () { popup.querySelector("textarea").focus(); }, 50);
  }

  function clampPopup(popup) {
    var rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth - 12) popup.style.left = window.innerWidth - rect.width - 12 + "px";
    if (rect.bottom > window.innerHeight - 12) popup.style.top = window.innerHeight - rect.height - 12 + "px";
    if (rect.left < 12) popup.style.left = "12px";
    if (rect.top < 12) popup.style.top = "12px";
  }

  function closePopup() {
    if (activePopup) { activePopup.remove(); activePopup = null; }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  }

  // ── 저장/로드 ──
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.screens) return parsed;
      }
    } catch (e) {}
    return { screens: ["기본"], current: "기본", pins: { "기본": [] } };
  }

  // ── 키보드 ──
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (activePopup) { closePopup(); }
      else if (annotateMode) { document.getElementById("annToggle").click(); }
    }
  });

  // ── 초기화 ──
  renderToolbar();
  renderPins();
})();

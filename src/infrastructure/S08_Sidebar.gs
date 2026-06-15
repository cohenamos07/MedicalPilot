<!--
  MedicalPilot — S08_Sidebar.html
  @version 1.0.8 | @updated 14/06/2026 22:07 | @service S08
  @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S08_Sidebar.html
  @description ממשק Dialog לאימות ידני ולמידה — S08.
               מציג מסמך מקורי + טקסט TXT + שדות עריכה לכותרת/מנפיק/תאריך/קטגוריה.
               כפתורים: אישור, עדכון ולמידה, למידה יזומה, מחיקה.
               תלוי ב: S08_Validate.gs — כל הלוגיקה מתבצעת שם.
  @impacts     נקרא מ-S08_Validate.gs דרך HtmlService.
               כל פעולות הכתיבה לגליון מתבצעות ב-S08_Validate.gs בלבד.
  @callers     S08_Validate.gs (showMainSidebar)
  @changes     [v1.0.8] תיקון Tasks 12,13 — עדכון @git ל-GitHub API URL + @changes מלא
               [v1.0.7] הוספת @impacts וכותרת מלאה לפי סטנדרט
               [v1.0.6-ד] Dialog מוגדל ל-1100×750
               [v1.0.6-ג] ?rm=minimal בpreview URL
               [v1.0.6-ב] עמודה R מוצגת מתחת לזיהוי + כפתור קפיצה
               [v1.0.6-א] TXT מוצג כטקסט בתוך pre — עוקף הרשאת iframe
-->
-->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base target="_top">
<title>S08 — אימות ידני</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    font-size: 14px;
    background: #fff;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ════ כותרת ════ */
  .dialog-header {
    background: #1a237e;
    color: #fff;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    gap: 8px;
  }

  .header-title { font-size: 12px; font-weight: 700; white-space: nowrap; }

  .header-nav { display: flex; align-items: center; gap: 4px; direction: ltr; }

  .nav-btn {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.35);
    color: #fff; border-radius: 4px;
    width: 28px; height: 26px;
    font-size: 13px; font-weight: 700;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; padding: 0;
  }
  .nav-btn:hover    { background: rgba(255,255,255,0.28); }
  .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .row-jump-input {
    width: 52px; height: 26px; padding: 2px 5px;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 4px;
    font-size: 12px; font-weight: 700; text-align: center;
    background: rgba(255,255,255,0.12); color: #fff;
  }
  .row-jump-input:focus { outline: none; background: rgba(255,255,255,0.22); }

  .nav-go-btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.4);
    color: #fff; border-radius: 4px;
    padding: 0 8px; height: 26px;
    font-size: 11px; font-weight: 700;
    cursor: pointer; transition: background 0.15s;
  }
  .nav-go-btn:hover { background: rgba(255,255,255,0.32); }

  .close-btn {
    background: rgba(198,40,40,0.75);
    border: 1px solid rgba(255,255,255,0.4);
    color: #fff; border-radius: 4px;
    padding: 0 10px; height: 26px;
    font-size: 12px; font-weight: 700;
    cursor: pointer; transition: background 0.15s; white-space: nowrap;
  }
  .close-btn:hover { background: rgba(198,40,40,1); }

  .header-meta { font-size: 10px; opacity: 0.7; font-weight: 400; white-space: nowrap; }

  /* ════ גוף ════ */
  .dialog-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1; overflow: hidden; min-height: 0;
  }

  .col {
    padding: 10px 12px;
    overflow-y: auto;
    display: flex; flex-direction: column;
    gap: 6px; min-height: 0;
  }

  .col-right { border-left: 1px solid #e0e0e0; }

  .col-left {
    padding: 10px 12px;
    display: flex; flex-direction: column;
    gap: 6px; min-height: 0; overflow-y: auto;
  }

  .section-title {
    font-size: 10px; font-weight: 700;
    color: #1a237e; text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 3px;
    border-bottom: 1px solid #c5cae9;
    flex-shrink: 0;
  }

  /* ════ זיהוי ════ */
  .meta-row {
    display: flex; gap: 6px;
    align-items: center; flex-wrap: wrap; flex-shrink: 0;
  }

  .meta-badge {
    background: #e8eaf6;
    border: 1px solid #c5cae9;
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 11px; color: #333;
  }
  .meta-badge span { color: #1a237e; font-weight: 700; }

  .status-badge {
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 11px; font-weight: 700;
    border: 1px solid #c5cae9;
    background: #f5f5f5; color: #555;
    max-width: 180px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* [v1.0.6-ב] כרטיס כפול/לוגו מתחת לזיהוי */
  .dup-inline-card {
    background: #fff3e0;
    border: 1px solid #ffb74d;
    border-right: 4px solid #f57c00;
    border-radius: 6px;
    padding: 7px 10px;
    flex-shrink: 0;
    display: none;
    gap: 6px;
    flex-direction: column;
  }
  .dup-inline-card.visible { display: flex; }

  .dup-flag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .dup-flag-text {
    font-size: 11px; font-weight: 700;
    color: #e65100;
    flex: 1;
  }

  .dup-jump-btn {
    background: #e65100; color: #fff;
    border: none; border-radius: 4px;
    padding: 4px 10px; font-size: 11px; font-weight: 700;
    cursor: pointer; white-space: nowrap;
    transition: opacity 0.15s; height: 26px;
    display: none;
  }
  .dup-jump-btn.visible { display: inline-flex; align-items: center; }
  .dup-jump-btn:hover { opacity: 0.85; }

  .dup-details-grid {
    display: none;
    grid-template-columns: auto 1fr;
    gap: 2px 8px; font-size: 11px;
  }
  .dup-details-grid.visible { display: grid; }
  .dup-key  { color: #795548; font-weight: 600; }
  .dup-val  { color: #333; }

  /* [v1.0.9] כרטיס כפול מגיליון למידה */
  .learn-dup-card {
    background: #f3e5f5;
    border: 1px solid #ce93d8;
    border-right: 4px solid #7b1fa2;
    border-radius: 6px;
    padding: 7px 10px;
    flex-shrink: 0;
    display: none;
    gap: 6px;
    flex-direction: column;
  }
  .learn-dup-card.visible { display: flex; }
  .learn-dup-title { font-size: 11px; font-weight: 700; color: #4a148c; }
  .learn-dup-grid  { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; }

  /* ════ שדות ════ */
  .field-group { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }

  .field-label-row {
    display: flex; align-items: center;
    justify-content: space-between; gap: 4px;
  }

  .field-label { font-size: 10px; color: #666; font-weight: 600; }

  .paste-btn {
    background: #e8eaf6;
    border: 1px solid #9fa8da;
    color: #1a237e; border-radius: 3px;
    padding: 0 5px; height: 18px;
    font-size: 10px; font-weight: 700;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 2px;
    transition: background 0.12s; flex-shrink: 0;
  }
  .paste-btn:hover { background: #c5cae9; }

  .field-input, .field-select {
    padding: 4px 8px;
    border: 1px solid #c5cae9;
    border-radius: 4px;
    font-size: 13px; background: #fff;
    height: 32px; width: 100%;
    transition: border-color 0.15s, background 0.15s;
  }
  .field-input:focus, .field-select:focus {
    outline: none; border-color: #1a237e; background: #f5f8ff;
  }
  .field-input.drag-over {
    border-color: #43a047; background: #f1f8e9; border-style: dashed;
  }
  .field-input.flash-ok { border-color: #43a047; }

  /* ════ הערת למידה ════ */
  .note-input {
    padding: 4px 8px;
    border: 1px solid #c5cae9;
    border-radius: 4px;
    font-size: 12px; background: #fffde7;
    height: 30px; width: 100%;
  }

  /* ════ עמודה שמאלית ════ */
  .preview-header {
    display: flex; justify-content: space-between;
    align-items: center; flex-shrink: 0; gap: 6px;
  }

  .preview-left-title {
    display: flex; flex-direction: column; gap: 1px;
  }

  .preview-mode-label { font-size: 10px; color: #888; font-style: italic; }

  .preview-btn-group { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }

  .toggle-btn {
    border: 1px solid #1a237e; border-radius: 4px;
    padding: 0 8px; height: 26px;
    font-size: 11px; font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    background: #fff; color: #1a237e;
  }
  .toggle-btn.active  { background: #1a237e; color: #fff; }
  .toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .open-btn {
    background: #fff; border: 1px solid #1a237e;
    color: #1a237e; padding: 0 8px;
    border-radius: 4px; font-size: 11px;
    cursor: pointer; display: inline-flex;
    align-items: center; gap: 4px;
    height: 26px; flex-shrink: 0; text-decoration: none;
  }

  /* iframe מקורי */
  .file-preview {
    flex: 1; min-height: 0;
    border: 1px solid #c5cae9;
    border-radius: 4px; background: #f5f5f5; width: 100%;
  }

  /* [v1.0.6-א] תצוגת TXT כטקסט */
  .txt-content-box {
    flex: 1; min-height: 0;
    border: 1px solid #c5cae9;
    border-radius: 4px; background: #fafafa;
    overflow-y: auto; display: none;
    padding: 10px 12px;
  }
  .txt-content-box.visible { display: block; }

  .txt-content-box pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; color: #333;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    direction: ltr;
    text-align: left;
  }

  .txt-loading {
    display: flex; align-items: center;
    justify-content: center;
    height: 100%; color: #888; font-size: 12px; gap: 8px;
  }

  .preview-fallback {
    flex: 1; min-height: 0;
    border: 1px solid #c5cae9; border-radius: 4px;
    background: #f5f5f5; display: none;
    align-items: center; justify-content: center;
    flex-direction: column; gap: 10px;
    color: #666; font-size: 12px;
    text-align: center; padding: 20px;
  }
  .preview-fallback.visible { display: flex; }

  .fallback-open-btn {
    background: #1a237e; color: #fff;
    border: none; border-radius: 6px;
    padding: 10px 20px; font-size: 13px; font-weight: 700;
    cursor: pointer; text-decoration: none;
    display: inline-block; min-height: 40px; line-height: 20px;
  }

  /* ════ פוטר ════ */
  .dialog-footer { flex-shrink: 0; background: #f5f5f5; border-top: 1px solid #e0e0e0; }

  .btn-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 6px; padding: 7px 12px;
  }

  .action-btn {
    padding: 6px 4px; border: none;
    border-radius: 5px; font-size: 12px; font-weight: 700;
    cursor: pointer; min-height: 34px; transition: opacity 0.15s;
  }
  .action-btn:hover    { opacity: 0.85; }
  .action-btn:active   { transform: scale(0.98); }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-approve { background: #2e7d32; color: #fff; }
  .btn-update  { background: #1565c0; color: #fff; }
  .btn-learn   { background: #6a1b9a; color: #fff; }
  .btn-delete  { background: #c62828; color: #fff; }

  .status-bar {
    padding: 5px 12px; font-size: 12px; font-weight: 600;
    border-top: 1px solid #e0e0e0; min-height: 28px;
    display: flex; align-items: center; gap: 8px;
    transition: background 0.3s;
  }
  .status-bar.idle    { background: #f9f9f9; color: #888; }
  .status-bar.success { background: #e8f5e9; color: #2e7d32; }
  .status-bar.error   { background: #ffebee; color: #c62828; }
  .status-bar.info    { background: #e3f2fd; color: #1565c0; }

  .spinner {
    display: none; width: 13px; height: 13px;
    border: 2px solid rgba(0,0,0,0.15);
    border-top-color: #1a237e; border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .spinner.visible { display: inline-block; }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>

<!-- ════ כותרת ════ -->
<div class="dialog-header">
  <span class="header-title">🔍 S08 — אימות ידני</span>

  <div class="header-nav">
    <button class="nav-btn" id="btnPrev" title="שורה קודמת" onclick="prevRow()">▲</button>
    <input class="row-jump-input" id="rowJump" type="number" min="2"
      title="מספר שורה" onkeydown="if(event.key==='Enter') jumpToRow()">
    <button class="nav-btn" id="btnNext" title="שורה הבאה" onclick="nextRow()">▼</button>
    <button class="nav-go-btn" onclick="jumpToRow()">עבור</button>
  </div>

  <small class="header-meta" id="headerMeta">טוען...</small>
  <button class="close-btn" onclick="closeDialog()">✖ סגור</button>
</div>

<!-- ════ גוף ════ -->
<div class="dialog-body">

  <!-- עמודה ימנית — נתונים ועריכה -->
  <div class="col col-right">

    <div class="section-title">זיהוי</div>
    <div class="meta-row">
      <div class="meta-badge"><span>ID:</span> <span id="fileId">—</span></div>
      <div class="meta-badge"><span>גודל:</span> <span id="fileSize">—</span></div>
      <div class="status-badge" id="pipelineStatus" style="display:none;"></div>
    </div>

    <!-- [v1.0.6-ב] כרטיס כפול/לוגו מתחת לזיהוי -->
    <div class="dup-inline-card" id="dupCard">
      <div class="dup-flag-row">
        <span class="dup-flag-text" id="dupFlagText">—</span>
        <button class="dup-jump-btn" id="dupJumpBtn" onclick="goToDupRow()">
          🔗 קפוץ לשורה <span id="dupRowNum">—</span>
        </button>
      </div>
      <div class="dup-details-grid" id="dupDetailsGrid">
        <span class="dup-key">גודל:</span>  <span class="dup-val" id="dupSize">—</span>
        <span class="dup-key">כותרת:</span> <span class="dup-val" id="dupTitle">—</span>
        <span class="dup-key">מנפיק:</span> <span class="dup-val" id="dupIssuer">—</span>
      </div>
    </div>

    <!-- [v1.0.9] כרטיס כפול מגיליון דוגמאות_למידה -->
    <div class="learn-dup-card" id="learnDupCard">
      <div class="learn-dup-title">⚠️ כפל חשוד — גיליון דוגמאות_למידה</div>
      <div class="learn-dup-grid">
        <span class="dup-key">שורה בגיליון:</span>   <span class="dup-val" id="learnDupRow">—</span>
        <span class="dup-key">מנפיק זוהה:</span>     <span class="dup-val" id="learnDupIssuer">—</span>
        <span class="dup-key">קטגוריה זוהתה:</span>  <span class="dup-val" id="learnDupCategory">—</span>
        <span class="dup-key">סיבת חשד:</span>       <span class="dup-val">מנפיק + קטגוריה זהים לשורה קיימת</span>
      </div>
    </div>

    <div class="section-title">נתוני AI — לאימות ועריכה</div>

    <div class="field-group">
      <div class="field-label-row">
        <label class="field-label">כותרת המסמך</label>
        <button class="paste-btn" onclick="pasteToField('docTitle')">📋 הדבק</button>
      </div>
      <input class="field-input" id="docTitle" type="text" placeholder="כותרת...">
    </div>

    <div class="field-group">
      <div class="field-label-row">
        <label class="field-label">מנפיק</label>
        <button class="paste-btn" onclick="pasteToField('docIssuer')">📋 הדבק</button>
      </div>
      <input class="field-input" id="docIssuer" type="text" placeholder="מנפיק...">
    </div>

    <div class="field-group">
      <div class="field-label-row">
        <label class="field-label">תאריך</label>
        <button class="paste-btn" onclick="pasteToField('docDate')">📋 הדבק</button>
      </div>
      <input class="field-input" id="docDate" type="text" placeholder="DD/MM/YYYY">
    </div>

    <div class="field-group">
      <div class="field-label-row">
        <label class="field-label">קטגוריה</label>
      </div>
      <select class="field-select" id="docCategory">
        <option value="רפואי">רפואי</option>
        <option value="חשבונאי">חשבונאי</option>
        <option value="משפטי">משפטי</option>
        <option value="ביטוחי">ביטוחי</option>
        <option value="אחר">אחר</option>
      </select>
    </div>

    <div class="section-title">הערת למידה (Notes)</div>
    <input class="note-input" id="noteInput" type="text" placeholder="סיבת התיקון — אופציונלי">

  </div>

  <!-- עמודה שמאלית — תצוגת קובץ -->
  <div class="col-left">

    <div class="preview-header">
      <div class="preview-left-title">
        <div class="section-title" style="border:none; padding:0;">📄 תצוגת קובץ</div>
        <span class="preview-mode-label" id="previewModeLabel">מקורי</span>
      </div>
      <div class="preview-btn-group">
        <!-- [v1.0.5] טוגל מקורי/TXT -->
        <button class="toggle-btn active" id="btnViewSource" onclick="switchView('source')">📄 מקורי</button>
        <button class="toggle-btn" id="btnViewTxt" onclick="switchView('txt')" disabled>📝 טקסט</button>
        <a class="open-btn" id="openSourceBtn" href="#" target="_blank" title="פתח בלשונית חדשה">↗</a>
      </div>
    </div>

    <!-- iframe — מסמך מקורי -->
    <iframe class="file-preview" id="filePreviewFrame"
      src="about:blank" frameborder="0" allowfullscreen></iframe>

    <!-- [v1.0.6-א] תצוגת TXT כטקסט -->
    <div class="txt-content-box" id="txtContentBox">
      <div class="txt-loading" id="txtLoading">
        <span>⏳ טוען תוכן טקסט...</span>
      </div>
      <pre id="txtContentPre" style="display:none;"></pre>
    </div>

    <!-- Fallback -->
    <div class="preview-fallback" id="previewFallback">
      <span>⚠️ לא ניתן להציג את הקובץ ישירות</span>
      <span style="font-size:11px; color:#999">(הדפדפן חסם את התצוגה המוטמעת)</span>
      <a class="fallback-open-btn" id="fallbackOpenBtn" href="#" target="_blank">
        📄 פתח בלשונית חדשה
      </a>
    </div>

  </div>
</div>

<!-- ════ פוטר ════ -->
<div class="dialog-footer">
  <div class="btn-row">
    <button class="action-btn btn-approve" onclick="doApprove()">✅ אישור</button>
    <button class="action-btn btn-update"  onclick="doUpdate()">✏️ עדכון ולמידה</button>
    <button class="action-btn btn-learn"   onclick="doLearn()">🧠 למידה יזומה</button>
    <button class="action-btn btn-delete"  onclick="doDelete()">🗑️ מחיקה</button>
  </div>
  <div class="status-bar idle" id="statusBar">
    <span class="spinner" id="spinner"></span>
    <span id="statusText">טוען נתונים...</span>
  </div>
</div>

<script>
  var ROW        = 0;
  var MAX_ROW    = 9999;
  var DUPROW     = 0;
  var SOURCE_URL = '';
  var TXT_URL    = '';
  var VIEW_MODE  = 'source';
  var TXT_LOADED = false;

  // ════ טעינה ראשונית ════
  window.onload = function() {
    initDragDrop();
    google.script.run
      .withSuccessHandler(initUI)
      .withFailureHandler(function(e) {
        setStatus('error', 'שגיאת טעינה: ' + e.message);
      })
      .s08_loadRowData();
  };

  // ════ אתחול ממשק ════
  function initUI(payload) {
    if (!payload) { setStatus('error', 'לא ניתן לטעון נתוני שורה'); return; }

    var d   = payload.data;
    ROW     = payload.row;
    TXT_URL = d.txtUrl || '';
    TXT_LOADED = false;

    if (payload.lastRow) MAX_ROW = payload.lastRow;

    document.getElementById('rowJump').value    = ROW;
    document.getElementById('btnPrev').disabled = (ROW <= 2);
    document.getElementById('btnNext').disabled = (ROW >= MAX_ROW);
    document.getElementById('headerMeta').textContent = 'שורה ' + ROW + ' / ' + MAX_ROW;

    document.getElementById('fileId').textContent   = d.fileId   || '';
    document.getElementById('fileSize').textContent = d.fileSize || '';

    // סטטוס Pipeline
    var psBadge = document.getElementById('pipelineStatus');
    if (d.pipelineStatus) {
      psBadge.textContent    = d.pipelineStatus;
      psBadge.style.display  = '';
    } else {
      psBadge.style.display  = 'none';
    }

    // [v1.0.6-ב] כרטיס כפול
    DUPROW = 0;
    document.getElementById('dupCard').classList.remove('visible');
    document.getElementById('dupJumpBtn').classList.remove('visible');
    document.getElementById('dupDetailsGrid').classList.remove('visible');
    // [v1.0.9] איפוס כרטיס כפול למידה
    document.getElementById('learnDupCard').classList.remove('visible');
    if (d.duplicateFlag) { loadDuplicateData(d.duplicateFlag); }

    document.getElementById('docTitle').value  = d.docTitle  || '';
    document.getElementById('docIssuer').value = d.docIssuer || '';
    document.getElementById('docDate').value   = d.docDate   || '';
    document.getElementById('noteInput').value = '';
    setSelectValue('docCategory', d.docCategory);

    // טוגל TXT
    document.getElementById('btnViewTxt').disabled = !TXT_URL;

    SOURCE_URL = d.sourceUrl || '';
    VIEW_MODE  = 'source';
    showSourceView();

    if (payload.noTxt) {
      setStatus('info', 'שורה ' + ROW + ' — אין TXT_URL');
    } else {
      setStatus('idle', 'שורה ' + ROW + ' — מוכן לאימות');
    }

    disableBtns(false);
  }

  // ════ [v1.0.6-א+ג] החלפת תצוגה מקורי/TXT ════
  function switchView(mode) {
    if (mode === 'txt' && !TXT_URL) return;
    if (mode === 'source' && !SOURCE_URL) return;
    VIEW_MODE = mode;

    if (mode === 'source') {
      showSourceView();
    } else {
      showTxtView();
    }

    document.getElementById('btnViewSource').classList.toggle('active', mode === 'source');
    document.getElementById('btnViewTxt').classList.toggle('active',    mode === 'txt');
    document.getElementById('previewModeLabel').textContent =
      (mode === 'txt') ? 'טקסט (TXT)' : 'מקורי';
  }

  function showSourceView() {
    var frame    = document.getElementById('filePreviewFrame');
    var txtBox   = document.getElementById('txtContentBox');
    var fallback = document.getElementById('previewFallback');

    txtBox.classList.remove('visible');
    fallback.classList.remove('visible');
    frame.style.display = '';

    if (SOURCE_URL) {
      // [v1.0.6-ג] ?rm=minimal להקטנת סרגל Google Drive
      frame.src = buildPreviewUrl(SOURCE_URL);
      document.getElementById('openSourceBtn').href   = SOURCE_URL;
      document.getElementById('fallbackOpenBtn').href = SOURCE_URL;
      setTimeout(checkIframeLoaded, 4000);
    } else {
      frame.style.display = 'none';
      fallback.classList.add('visible');
    }
  }

  function showTxtView() {
    var frame  = document.getElementById('filePreviewFrame');
    var txtBox = document.getElementById('txtContentBox');

    frame.style.display = 'none';
    document.getElementById('previewFallback').classList.remove('visible');
    txtBox.classList.add('visible');

    document.getElementById('openSourceBtn').href = TXT_URL || '#';

    if (TXT_LOADED) return;

    // הצגת מחוון טעינה
    document.getElementById('txtLoading').style.display = 'flex';
    document.getElementById('txtContentPre').style.display = 'none';

    // שליפת תוכן דרך GAS
    google.script.run
      .withSuccessHandler(function(res) {
        document.getElementById('txtLoading').style.display = 'none';
        var pre = document.getElementById('txtContentPre');
        if (res && res.success) {
          pre.textContent    = res.content;
          pre.style.display  = '';
          TXT_LOADED = true;
        } else {
          pre.textContent    = '⚠️ לא ניתן לטעון את הטקסט: ' + (res ? res.msg : 'שגיאה לא ידועה');
          pre.style.display  = '';
          pre.style.color    = '#c62828';
        }
      })
      .withFailureHandler(function(e) {
        document.getElementById('txtLoading').style.display = 'none';
        var pre = document.getElementById('txtContentPre');
        pre.textContent   = '❌ שגיאה: ' + (e.message || e);
        pre.style.display = '';
        pre.style.color   = '#c62828';
      })
      .s08_fetchTxtContent(TXT_URL);
  }

  // ════ [v1.0.6-ב] כרטיס כפול ════
  function loadDuplicateData(flag) {
    if (!flag) return;

    var card = document.getElementById('dupCard');
    document.getElementById('dupFlagText').textContent = '⚠️ ' + flag;
    card.classList.add('visible');

    google.script.run
      .withSuccessHandler(function(dupData) {
        if (!dupData) {
          // לוגו/ריק — ללא ניווט
          document.getElementById('dupJumpBtn').classList.remove('visible');
          document.getElementById('dupDetailsGrid').classList.remove('visible');
          return;
        }
        // כפול עם שורה — מציג ניווט ופרטים
        DUPROW = dupData.row;
        document.getElementById('dupRowNum').textContent      = dupData.row;
        document.getElementById('dupJumpBtn').classList.add('visible');
        document.getElementById('dupDetailsGrid').classList.add('visible');
        document.getElementById('dupSize').textContent   = dupData.fileSize || '—';
        document.getElementById('dupTitle').textContent  = dupData.title    || '—';
        document.getElementById('dupIssuer').textContent = dupData.issuer   || '—';
      })
      .s08_getDuplicateRowData(flag);
  }

  // ════ [v1.0.5] הדבקה מהלוח ════
  function pasteToField(fieldId) {
    var el = document.getElementById(fieldId);
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then(function(text) {
          if (text) { el.value = text.trim(); el.focus(); flashField(el); }
        })
        .catch(function() { el.focus(); el.select(); setStatus('info', 'לחץ Ctrl+V להדבקה ידנית'); });
    } else {
      el.focus(); el.select(); setStatus('info', 'לחץ Ctrl+V להדבקה ידנית');
    }
  }

  function flashField(el) {
    el.classList.add('flash-ok');
    setTimeout(function() { el.classList.remove('flash-ok'); }, 900);
  }

  // ════ [v1.0.5] Drag & Drop ════
  function initDragDrop() {
    ['docTitle', 'docIssuer', 'docDate'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('dragover', function(e) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', function() { el.classList.remove('drag-over'); });
      el.addEventListener('drop', function(e) {
        e.preventDefault(); el.classList.remove('drag-over');
        var text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
        if (text) { el.value = text.trim(); el.focus(); flashField(el); }
      });
    });
  }

  // ════ ניווט בין שורות ════
  function goToDupRow() { if (DUPROW >= 2) navigateTo(DUPROW); }
  function prevRow()    { if (ROW > 2)       navigateTo(ROW - 1); }
  function nextRow()    { if (ROW < MAX_ROW) navigateTo(ROW + 1); }

  function jumpToRow() {
    var val = parseInt(document.getElementById('rowJump').value, 10);
    if (isNaN(val) || val < 2) { setStatus('error', 'מספר שורה לא תקין (מינימום 2)'); return; }
    navigateTo(val);
  }

  function navigateTo(row) {
    setStatus('info', 'טוען שורה ' + row + '...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(function(payload) {
        disableBtns(false);
        if (!payload || payload.error) {
          setStatus('error', (payload && payload.msg) || 'שגיאה בטעינת שורה');
          return;
        }
        initUI(payload);
      })
      .withFailureHandler(function(e) {
        disableBtns(false);
        setStatus('error', 'שגיאה: ' + (e.message || e));
      })
      .s08_loadRowByNumber(row);
  }

  // ════ כפתורי פעולה ════
  function closeDialog() { google.script.host.close(); }

  function doApprove() {
    setStatus('info', 'מבצע אישור...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(handleResult)
      .withFailureHandler(handleError)
      .s08_approve(ROW);
  }

  // [v1.0.9] כרטיס כפול מגיליון למידה
  function showLearnDup(res) {
    disableBtns(false);
    document.getElementById('learnDupRow').textContent      = res.dupRow          || '—';
    document.getElementById('learnDupIssuer').textContent   = res.matchedIssuer   || '—';
    document.getElementById('learnDupCategory').textContent = res.matchedCategory || '—';
    document.getElementById('learnDupCard').classList.add('visible');
    setStatus('info', res.msg);
  }

  function doUpdate() {
    setStatus('info', 'שומר ושולח ללמידה...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(function(res) {
        disableBtns(false);
        if (res && res.isDuplicate) { showLearnDup(res); }
        else { handleResult(res); }
      })
      .withFailureHandler(handleError)
      .s08_updateAndLearn(ROW,
        document.getElementById('docTitle').value,
        document.getElementById('docIssuer').value,
        document.getElementById('docDate').value,
        document.getElementById('docCategory').value,
        document.getElementById('noteInput').value);
  }

  function doLearn() {
    setStatus('info', 'יוצר דוגמת למידה...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(function(res) {
        disableBtns(false);
        if (res && res.isDuplicate) { showLearnDup(res); }
        else { handleResult(res); }
      })
      .withFailureHandler(handleError)
      .s08_learnOnly(ROW,
        document.getElementById('docTitle').value,
        document.getElementById('docIssuer').value,
        document.getElementById('docDate').value,
        document.getElementById('docCategory').value,
        document.getElementById('noteInput').value);
  }

  function doDelete() {
    var msg = 'האם למחוק את השורה הנוכחית (שורה ' + ROW + ') ואת קבציה מ-Drive?\n\nפעולה זו בלתי הפיכה.';
    if (DUPROW) {
      msg += '\n\nזוהה כפול בשורה ' + DUPROW + '.';
      if (!window.confirm(msg)) return;
      var which = window.confirm('OK = מחק נוכחית (שורה ' + ROW + ')\nביטול = מחק מקורית (שורה ' + DUPROW + ')');
      runDelete(which ? 'current' : 'original');
    } else {
      if (!window.confirm(msg)) return;
      runDelete('current');
    }
  }

  function runDelete(which) {
    setStatus('info', 'מוחק...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.success) {
          setStatus('success', res.msg);
          setTimeout(function() { google.script.host.close(); }, 1500);
        } else { handleResult(res); }
      })
      .withFailureHandler(handleError)
      .s08_delete(ROW, which);
  }

  function handleResult(res) {
    if (!res) return;
    disableBtns(false);
    if (res.success) { setStatus('success', res.msg); }
    else             { setStatus('error',   res.msg); }
  }

  function handleError(e) {
    setStatus('error', 'שגיאה: ' + (e.message || e));
    disableBtns(false);
  }

  // ════ פונקציות עזר ════
  // [v1.0.6-ג] ?rm=minimal להקטנת סרגל Google Drive
  function buildPreviewUrl(url) {
    var id = extractDriveId(url);
    if (id) return 'https://drive.google.com/file/d/' + id + '/preview?rm=minimal';
    return url;
  }

  function extractDriveId(url) {
    if (!url) return null;
    var m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    var m2 = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return null;
  }

  function checkIframeLoaded() {
    var frame = document.getElementById('filePreviewFrame');
    try {
      if (!frame.contentDocument && !frame.contentWindow) { showFallback(); }
    } catch (e) {}
  }

  function showFallback() {
    document.getElementById('filePreviewFrame').style.display = 'none';
    document.getElementById('txtContentBox').classList.remove('visible');
    document.getElementById('previewFallback').classList.add('visible');
  }

  function setSelectValue(id, val) {
    var sel = document.getElementById(id);
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === val) { sel.selectedIndex = i; break; }
    }
  }

  function setStatus(type, text) {
    var bar = document.getElementById('statusBar');
    bar.className = 'status-bar ' + type;
    document.getElementById('statusText').textContent = text;
    document.getElementById('spinner').className =
      'spinner' + (type === 'info' ? ' visible' : '');
  }

  function disableBtns(state) {
    document.querySelectorAll('.action-btn').forEach(function(b) { b.disabled = state; });
    document.getElementById('btnPrev').disabled = state || (ROW <= 2);
    document.getElementById('btnNext').disabled = state || (ROW >= MAX_ROW);
  }
</script>
</body>
</html>
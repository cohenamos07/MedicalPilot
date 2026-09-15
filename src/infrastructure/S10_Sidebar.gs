<!--
  MedicalPilot — S10_Sidebar.html
  @version 1.2.0 | @updated 01/09/2026 20:57 | @service S10
  @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S10_Sidebar.html
  @description ממשק Dialog לאימות ידני של אירועים רפואיים שחולצו על ידי S09.
               מציג אירוע מחולץ (יומן_אירועים_רפואי בלבד, ברמת תת-אירוע)
               לעריכה ואישור לפני שמירה כדוגמת למידה.
  @impacts כפתורים: אישור, עדכון ולמידה, למידה יזומה, מחיקה, עדכון קודי
           אירוע (כפתור נפרד, כותב למיפוי_קודים בלבד — Task #209).
           תלוי ב: S10_Validate.gs — כל הלוגיקה מתבצעת שם.
  @callers S10_Validate.gs (showS10Sidebar)
  @functions initUI, buildFields, collectFields, switchView,
             showSourceView, showTxtView, prevSibling, goNextSibling,
             navigateToSibling, prevRow, nextRow, jumpToRow,
             navigateTo, closeDialog, doApprove, doUpdate,
             doLearn, doDelete, doSaveEventCode, handleResult, handleError
  @changes [v1.2.0] Task #209 (בקשת עמוס) — הפרדה מוחלטת בין קטלוג קודי
                    אירוע לבין אישור/עדכון-ולמידה/למידה-יזומה: doApprove/
                    doUpdate/doLearn חזרו לצורתם המקורית (ללא פרמטרי קוד
                    אירוע). נוספה doSaveEventCode + כפתור ייעודי "עדכון
                    קודי אירוע". ווידג'ט הקטלוג: יחס רוחב עמודות מותאם
                    (משפחות/תו-קוד/תיאור) וגבהים מוקטנים כדי שהכפתור
                    יוצג ללא גלילה.
           [v1.1.0] Task 185 (בקשת עמוס) — שינוי שם nextSibling ל-goNextSibling:
                    "nextSibling" הוא שם תכונת DOM מובנית (Node.nextSibling),
                    התנגשות שם גרמה ל-TypeError כשנקרא מתוך onclick בתוך תג
                    הכפתור — באג קיים-מקודם, התגלה רק בבדיקה קצה-לקצה בפועל.
           [v1.0.2] Tasks 15+16 — תיקון @git לAPI URL, המרת "שינוי:" ל-@changes,
                    הוספת @description/@callers/@functions לכותרת.
           [v1.0.1] הוספת @impacts וכותרת מלאה לפי סטנדרט.
           [v1.0.0] גרסה ראשונה.
-->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base target="_top">
<title>S10 — אימות אירועים</title>
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

  /* ════ כותרת — שתי שורות ════ */
  .dialog-header {
    background: #880e4f;
    color: #fff;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .header-row1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .header-row2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .header-title { font-size: 12px; font-weight: 700; white-space: nowrap; }

  .header-meta  { font-size: 10px; opacity: 0.75; font-weight: 400; white-space: nowrap; }

  /* סטטוס badge */
  .status-badge {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.35);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px; font-weight: 600;
    white-space: nowrap;
  }

  /* Complexity badge */
  .complexity-badge {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    display: flex; align-items: center; gap: 5px;
  }

  .complexity-select {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 11px; font-weight: 700;
    cursor: pointer;
    outline: none;
    padding: 0 2px;
  }
  .complexity-select option { color: #333; background: #fff; }

  /* ניווט Split X/Y */
  .split-nav {
    display: flex; align-items: center; gap: 4px; direction: ltr;
  }

  .split-label {
    font-size: 11px; font-weight: 700;
    background: rgba(255,255,255,0.18);
    border-radius: 4px;
    padding: 2px 8px;
    white-space: nowrap;
  }

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

  /* ניווט מסמכים */
  .doc-nav {
    display: flex; align-items: center; gap: 4px; direction: ltr;
  }

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
    color: #880e4f; text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 3px;
    border-bottom: 1px solid #f8bbd0;
    flex-shrink: 0;
  }

  /* זיהוי */
  .meta-row {
    display: flex; gap: 6px;
    align-items: center; flex-wrap: wrap; flex-shrink: 0;
  }

  .meta-badge {
    background: #fce4ec;
    border: 1px solid #f48fb1;
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 11px; color: #333;
  }
  .meta-badge span { color: #880e4f; font-weight: 700; }

  /* שדות */
  .field-group { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }

  .field-label-row {
    display: flex; align-items: center;
    justify-content: space-between; gap: 4px;
  }

  .field-label { font-size: 10px; color: #666; font-weight: 600; }

  .paste-btn {
    background: #fce4ec;
    border: 1px solid #f48fb1;
    color: #880e4f; border-radius: 3px;
    padding: 0 5px; height: 18px;
    font-size: 10px; font-weight: 700;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 2px;
    transition: background 0.12s; flex-shrink: 0;
  }
  .paste-btn:hover { background: #f48fb1; }

  .field-input {
    padding: 4px 8px;
    border: 1px solid #f48fb1;
    border-radius: 4px;
    font-size: 13px; background: #fff;
    height: 32px; width: 100%;
    transition: border-color 0.15s, background 0.15s;
  }
  .field-input:focus {
    outline: none; border-color: #880e4f; background: #fff8fa;
  }
  .field-input.drag-over {
    border-color: #43a047; background: #f1f8e9; border-style: dashed;
  }
  .field-input.flash-ok { border-color: #43a047; }

  .note-input {
    padding: 4px 8px;
    border: 1px solid #f48fb1;
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
    border: 1px solid #880e4f; border-radius: 4px;
    padding: 0 8px; height: 26px;
    font-size: 11px; font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    background: #fff; color: #880e4f;
  }
  .toggle-btn.active  { background: #880e4f; color: #fff; }
  .toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .open-btn {
    background: #fff; border: 1px solid #880e4f;
    color: #880e4f; padding: 0 8px;
    border-radius: 4px; font-size: 11px;
    cursor: pointer; display: inline-flex;
    align-items: center; gap: 4px;
    height: 26px; flex-shrink: 0; text-decoration: none;
  }

  .file-preview {
    flex: 1; min-height: 0;
    border: 1px solid #f48fb1;
    border-radius: 4px; background: #f5f5f5; width: 100%;
  }

  .txt-content-box {
    flex: 1; min-height: 0;
    border: 1px solid #f48fb1;
    border-radius: 4px; background: #fafafa;
    overflow-y: auto; display: none;
    padding: 10px 12px;
  }
  .txt-content-box.visible { display: block; }

  .txt-content-box pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; color: #333;
    white-space: pre-wrap; word-break: break-word;
    line-height: 1.6; direction: ltr; text-align: left;
  }

  .txt-loading {
    display: flex; align-items: center;
    justify-content: center;
    height: 100%; color: #888; font-size: 12px; gap: 8px;
  }

  .preview-fallback {
    flex: 1; min-height: 0;
    border: 1px solid #f48fb1; border-radius: 4px;
    background: #f5f5f5; display: none;
    align-items: center; justify-content: center;
    flex-direction: column; gap: 10px;
    color: #666; font-size: 12px;
    text-align: center; padding: 20px;
  }
  .preview-fallback.visible { display: flex; }

  .fallback-open-btn {
    background: #880e4f; color: #fff;
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
  .status-bar.info    { background: #fce4ec; color: #880e4f; }

  .spinner {
    display: none; width: 13px; height: 13px;
    border: 2px solid rgba(0,0,0,0.15);
    border-top-color: #880e4f; border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .spinner.visible { display: inline-block; }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>

<!-- ════ כותרת ════ -->
<div class="dialog-header">

  <!-- שורה 1 — קטגוריה + סטטוס + סגור -->
  <div class="header-row1">
    <span class="header-title" id="headerTitle">⏳ טוען...</span>
    <span class="status-badge" id="headerStatus">—</span>
    <small class="header-meta" id="headerMeta"></small>
    <button class="close-btn" onclick="closeDialog()">✖ סגור</button>
  </div>

  <!-- שורה 2 — Complexity + ניווט X/Y + ניווט מסמכים -->
  <div class="header-row2">

    <!-- Complexity -->
    <div class="complexity-badge">
      <span>מורכבות:</span>
      <select class="complexity-select" id="complexitySelect">
        <option value="1">1 — פשוט</option>
        <option value="2">2</option>
        <option value="3" selected>3 — בינוני</option>
        <option value="4">4</option>
        <option value="5">5 — מורכב</option>
      </select>
    </div>

    <!-- ניווט X/Y — אירועים מאותו מסמך -->
    <div class="split-nav">
      <span style="font-size:10px; opacity:0.8;">אירוע:</span>
      <button class="nav-btn" id="btnSiblingPrev" title="אירוע קודם" onclick="prevSibling()">◀</button>
      <span class="split-label" id="splitLabel">—</span>
    <button class="nav-btn" id="btnSiblingNext" title="אירוע הבא" onclick="goNextSibling()">▶</button>
    </div>

    <!-- ניווט מסמכים (שורות) -->
    <div class="doc-nav">
      <span style="font-size:10px; opacity:0.8;">שורה:</span>
      <button class="nav-btn" id="btnPrev" onclick="prevRow()">▲</button>
      <input class="row-jump-input" id="rowJump" type="number" min="2"
        onkeydown="if(event.key==='Enter') jumpToRow()">
      <button class="nav-btn" id="btnNext" onclick="nextRow()">▼</button>
      <button class="nav-go-btn" onclick="jumpToRow()">עבור</button>
    </div>

  </div>
</div>

<!-- ════ גוף ════ -->
<div class="dialog-body">

  <!-- עמודה ימנית — שדות אימות -->
  <div class="col col-right">

    <div class="section-title">זיהוי</div>
    <div class="meta-row">
      <div class="meta-badge"><span>ID:</span> <span id="fileId">—</span></div>
      <div class="meta-badge"><span>גליון:</span> <span id="sheetName">—</span></div>
    </div>

    <div class="section-title">נתוני אירוע — לאימות ועריכה</div>

    <!-- שדות דינמיים — נוצרים ב-JS -->
    <div id="fieldsContainer"></div>

        <div class="section-title">הערת למידה</div>
    <input class="note-input" id="noteInput" type="text"
      placeholder="מה Gemini טעה ולמה — אופציונלי">

    <div class="section-title">קטלוג קודי אירוע קיימים (מיפוי_קודים)</div>
           <div style="display:flex; gap:6px;">
      <div style="flex:0.6; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700; color:#555; margin-bottom:2px;">
          <span>משפחות</span>
          <button type="button" onclick="addNewFamily()" title="הוסף משפחה חדשה"
            style="border:none; background:#e3f2fd; border-radius:3px; width:16px; height:16px; cursor:pointer; font-weight:700; line-height:1; padding:0;">+</button>
        </div>
        <div id="eventFamilyList" style="max-height:45px; overflow-y:auto; border:1px solid #ddd; border-radius:6px; padding:4px; font-size:11px;"></div>
      </div>
      <div style="flex:1.8; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700; color:#555; margin-bottom:2px;">
          <span id="selectedFamilyLabel">תו קוד — בחר משפחה</span>
          <button type="button" onclick="addNewCodeInFamily()" title="הוסף תו קוד חדש למשפחה הנבחרת"
            style="border:none; background:#e3f2fd; border-radius:3px; width:16px; height:16px; cursor:pointer; font-weight:700; line-height:1; padding:0;">+</button>
        </div>
        <div id="eventCodeCatalog" style="max-height:45px; overflow-y:auto; border:1px solid #ddd; border-radius:6px; padding:4px; font-size:11px;"></div>
      </div>
      <div style="flex:1.6; min-width:0;">
        <div style="font-size:10px; font-weight:700; color:#555; margin-bottom:2px;">תיאור מנורמל</div>
        <textarea id="newEventNameInput" placeholder="תיאור מנורמל לקוד החדש..."
          style="width:100%; height:40px; box-sizing:border-box; border:1px solid #ddd; border-radius:6px; padding:4px; font-size:11px; font-family:inherit; resize:none; overflow-y:auto;"></textarea>
      </div>
      </div>

    <button type="button" onclick="doSaveEventCode()" style="width:100%; margin-top:6px; padding:6px; background:#1976d2; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">💾 עדכון קודי אירוע</button>

  </div>

  <!-- עמודה שמאלית — תצוגת קובץ -->
  <div class="col-left">

    <div class="preview-header">
      <div class="preview-left-title">
        <div class="section-title" style="border:none; padding:0;">📄 תצוגת קובץ</div>
        <span class="preview-mode-label" id="previewModeLabel">מקורי</span>
      </div>
      <div class="preview-btn-group">
        <button class="toggle-btn active" id="btnViewSource" onclick="switchView('source')">📄 מקורי</button>
        <button class="toggle-btn" id="btnViewTxt" onclick="switchView('txt')" disabled>📝 טקסט</button>
        <a class="open-btn" id="openSourceBtn" href="#" target="_blank" title="פתח בלשונית חדשה">↗</a>
      </div>
    </div>

    <iframe class="file-preview" id="filePreviewFrame"
      src="about:blank" frameborder="0" allowfullscreen></iframe>

    <div class="txt-content-box" id="txtContentBox">
      <div class="txt-loading" id="txtLoading"><span>⏳ טוען תוכן טקסט...</span></div>
      <pre id="txtContentPre" style="display:none;"></pre>
    </div>

    <div class="preview-fallback" id="previewFallback">
      <span>⚠️ לא ניתן להציג את הקובץ ישירות</span>
      <span style="font-size:11px; color:#999">(הדפדפן חסם את התצוגה המוטמעת)</span>
      <a class="fallback-open-btn" id="fallbackOpenBtn" href="#" target="_blank">📄 פתח בלשונית חדשה</a>
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
  var ROW          = 0;
  var MAX_ROW      = 9999;
  var SOURCE_URL   = '';
  var TXT_URL      = '';
  var VIEW_MODE    = 'source';
  var TXT_LOADED   = false;
  var SIBLING_ROWS = [];
  var SPLIT_X      = 1;
  var FIELDS_DEF   = [];
  var EVENT_TYPE_MAP        = {}; // [Task #209] {rawText:{code,name}} ממיפוי_קודים
  var MEDICAL_SYSTEM_OPTIONS = []; // [Task #209] רשימה סגורה, להצעה בלבד
  var SELECTED_FAMILY        = null; // [Task #209] משפחת הקוד הנבחרת כרגע בקטלוג
  
  // ════ טעינה ראשונית ════
  window.onload = function() {
    initDragDrop();
    google.script.run
      .withSuccessHandler(initUI)
      .withFailureHandler(function(e) {
        setStatus('error', 'שגיאת טעינה: ' + e.message);
      })
      .s10_loadRowData();
  };

  // ════ אתחול ממשק ════
  function initUI(payload) {
    if (!payload) { setStatus('error', 'לא ניתן לטעון נתוני שורה'); return; }

    ROW          = payload.row;
    MAX_ROW      = payload.lastRow || 9999;
    SOURCE_URL   = payload.sourceUrl || '';
    TXT_URL      = payload.txtUrl    || '';
    TXT_LOADED   = false;
    SIBLING_ROWS = payload.siblingRows || [ROW];
    SPLIT_X      = payload.splitX || 1;
    FIELDS_DEF   = payload.fields || [];
    EVENT_TYPE_MAP        = payload.eventTypeMap || {};
    MEDICAL_SYSTEM_OPTIONS = payload.medicalSystemOptions || [];

    // שורה 1 — כותרת
    document.getElementById('headerTitle').textContent =
      (payload.icon || '') + ' S10 — ' + (payload.sheetName || '');
    document.getElementById('headerStatus').textContent =
      'גליון: ' + (payload.sheetName || '');
    document.getElementById('headerMeta').textContent =
      'שורה ' + ROW + ' / ' + MAX_ROW;

    // שורה 2 — Split
    document.getElementById('splitLabel').textContent  = payload.splitLabel || '1/1';
    document.getElementById('btnSiblingPrev').disabled = (SPLIT_X <= 1);
    document.getElementById('btnSiblingNext').disabled = (SPLIT_X >= (payload.splitY || 1));

    // ניווט שורות
    document.getElementById('rowJump').value    = ROW;
    document.getElementById('btnPrev').disabled = (ROW <= 2);
    document.getElementById('btnNext').disabled = (ROW >= MAX_ROW);

    // זיהוי
    document.getElementById('fileId').textContent   = payload.fileId   || '—';
    document.getElementById('sheetName').textContent = payload.sheetName || '—';

    // [Task #209] datalists הצעה — לפני buildFields, כדי שה-list יהיה קיים
    buildCodeDatalists();
       SELECTED_FAMILY = null;
    buildEventFamilyList();
    buildEventCodeCatalog();
    var nameEl0 = document.getElementById('newEventNameInput');
    if (nameEl0) nameEl0.value = '';

    // שדות דינמיים
    buildFields(FIELDS_DEF);
    checkEventTypeCode();

    // טוגל TXT
    document.getElementById('btnViewTxt').disabled = !TXT_URL;

    VIEW_MODE = 'source';
    showSourceView();

    setStatus('idle', 'שורה ' + ROW + ' — מוכן לאימות');
    disableBtns(false);
  }

  // ════ [Task #209] datalists הצעה ממיפוי_קודים ════
  function buildCodeDatalists() {
    var msList = document.getElementById('medicalSystemList');
    if (!msList) {
      msList = document.createElement('datalist');
      msList.id = 'medicalSystemList';
      document.body.appendChild(msList);
    }
    msList.innerHTML = '';
    MEDICAL_SYSTEM_OPTIONS.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v;
      msList.appendChild(opt);
    });

    var etList = document.getElementById('eventTypeList');
    if (!etList) {
      etList = document.createElement('datalist');
      etList.id = 'eventTypeList';
      document.body.appendChild(etList);
    }
    etList.innerHTML = '';
    Object.keys(EVENT_TYPE_MAP).forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v;
      etList.appendChild(opt);
    });
  }

  // ════ [Task #209] קטלוג קודי אירוע — משפחות (2 תווים) + קודים בתוך משפחה ════
   function buildEventFamilyList() {
    var box = document.getElementById('eventFamilyList');
    if (!box) return;
    box.innerHTML = '';

    var families = {};
    Object.keys(EVENT_TYPE_MAP).forEach(function(rawText) {
      var code = EVENT_TYPE_MAP[rawText].code || '';
      if (code.length >= 2) families[code.substring(0, 2)] = true;
    });
    var list = Object.keys(families).sort();

    if (SELECTED_FAMILY && list.indexOf(SELECTED_FAMILY) === -1) {
      list.push(SELECTED_FAMILY);
      list.sort();
    }

    if (!list.length) {
      box.innerHTML = '<div style="opacity:0.6; padding:2px;">אין עדיין משפחות</div>';
      return;
    }

    list.forEach(function(fam) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:3px 4px; cursor:pointer; border-bottom:1px solid #f5f5f5;'
        + (fam === SELECTED_FAMILY ? ' background-color:#e3f2fd; font-weight:700;' : '');
      row.textContent = fam;
      row.onmouseover = function() { if (fam !== SELECTED_FAMILY) row.style.backgroundColor = '#f0f0f0'; };
      row.onmouseout  = function() { if (fam !== SELECTED_FAMILY) row.style.backgroundColor = ''; };
      row.onclick = function() {
        SELECTED_FAMILY = fam;
        buildEventFamilyList();
        buildEventCodeCatalog();
      };
      box.appendChild(row);
    });
  }

  function buildEventCodeCatalog() {
    var box   = document.getElementById('eventCodeCatalog');
    var label = document.getElementById('selectedFamilyLabel');
    if (!box) return;
    box.innerHTML = '';
    if (label) label.textContent = SELECTED_FAMILY ? ('תו קוד — משפחה ' + SELECTED_FAMILY) : 'תו קוד — בחר משפחה';

    if (!SELECTED_FAMILY) {
      box.innerHTML = '<div style="opacity:0.6; padding:2px;">בחר משפחה מימין</div>';
      return;
    }

    var seen = {};
    var rows = [];
    Object.keys(EVENT_TYPE_MAP).forEach(function(rawText) {
      var m = EVENT_TYPE_MAP[rawText];
      var code = m.code || '';
      if (code.substring(0, 2) !== SELECTED_FAMILY) return;
      var suffix = code.substring(2);
      if (!suffix || seen[suffix]) return;
      seen[suffix] = true;
      rows.push({ suffix: suffix, code: code, name: m.name || '' });
    });
    rows.sort(function(a, b) { return a.suffix.localeCompare(b.suffix); });

    if (!rows.length) {
      box.innerHTML = '<div style="opacity:0.6; padding:2px;">אין עדיין תווים במשפחה זו</div>';
      return;
    }

    rows.forEach(function(r) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:3px 4px; cursor:pointer; border-bottom:1px solid #f5f5f5;';
      row.textContent = r.suffix + (r.name ? ' — ' + r.name : '');
      row.onmouseover = function() { row.style.backgroundColor = '#e3f2fd'; };
      row.onmouseout  = function() { row.style.backgroundColor = ''; };
      row.onclick = function() {
        var codeEl = document.getElementById('newEventCodeInput');
        var nameEl = document.getElementById('newEventNameInput');
        if (codeEl) codeEl.value = r.code;
        if (nameEl) nameEl.value = r.name;
      };
      box.appendChild(row);
    });
  }

  function addNewFamily() {
    var val = window.prompt('הקלד קוד משפחה חדש (2 תווים, לדוגמה A2):', '');
    if (val === null) return;
    val = val.trim();
    if (!val) return;
    SELECTED_FAMILY = val;
    buildEventFamilyList();
    buildEventCodeCatalog();
  }

  function addNewCodeInFamily() {
    if (!SELECTED_FAMILY) {
      window.alert('קודם בחר או הוסף משפחה מימין (+)');
      return;
    }
    var val = window.prompt('הקלד את תו הקוד (יתווסף אחרי "' + SELECTED_FAMILY + '"):', '');
    if (val === null) return;
    val = val.trim();
    if (!val) return;
    var codeEl = document.getElementById('newEventCodeInput');
    if (codeEl) codeEl.value = SELECTED_FAMILY + val;
    var nameEl = document.getElementById('newEventNameInput');
    if (nameEl) nameEl.focus();
  }
    // ════ [Task #209] בדיקת התאמת "סוג אירוע" מול מיפוי_קודים ════
  // live=true  → נקרא בזמן הקלדה (input) — מעדכן רמז בלבד, לא נועל את השדה
  // live=false/undefined → נקרא ב-blur ובטעינה ראשונית — קובע סופית האם לנעול את השדה באדום
  function checkEventTypeCode(live) {
    var input = document.getElementById('field_2');
    var hint  = document.getElementById('eventCodeHint');
    var group = document.getElementById('newEventCodeGroup');
    if (!input || !hint || !group) return;

    var val = input.value.trim();

    function unlockField() {
      input.readOnly         = false;
      input.style.color      = '';
      input.style.fontWeight = '';
      input.style.backgroundColor = '';
      input.style.cursor     = '';
    }

    if (!val) {
      hint.textContent = '';
      group.style.display = 'none';
      if (!live) unlockField();
      return;
    }

    var match = EVENT_TYPE_MAP[val];
    if (match) {
      hint.textContent = '✓ קוד קיים: ' + match.code + (match.name ? ' — ' + match.name : '');
      hint.style.color = '#2e7d32';
      group.style.display = 'none';
      document.getElementById('newEventCodeInput').value = '';
      document.getElementById('newEventNameInput').value = '';
      if (!live) unlockField();
    } else {
      hint.textContent = '⚠️ קוד חדש — נא למלא קוד ותיאור מנורמל למיפוי_קודים';
      hint.style.color = '#e65100';
      group.style.display = 'flex';
      if (!live) {
        input.readOnly              = true;
        input.style.color           = '#c62828';
        input.style.fontWeight      = '700';
        input.style.backgroundColor = '#ffebee';
        input.style.cursor          = 'not-allowed';
      }
    }
  }
  // ════ בניית שדות דינמיים ════
  function buildFields(fields) {
    var container = document.getElementById('fieldsContainer');
    container.innerHTML = '';

    fields.forEach(function(f) {
      var group = document.createElement('div');
      group.className = 'field-group';

      var labelRow = document.createElement('div');
      labelRow.className = 'field-label-row';

      var label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = f.label;

      var pasteBtn = document.createElement('button');
      pasteBtn.className = 'paste-btn';
      pasteBtn.textContent = '📋 הדבק';
      pasteBtn.setAttribute('data-field', 'field_' + f.col);
      pasteBtn.onclick = function() { pasteToField('field_' + f.col); };

      labelRow.appendChild(label);
      labelRow.appendChild(pasteBtn);

      var input = document.createElement('input');
      input.className = 'field-input';
      input.id        = 'field_' + f.col;
      input.type      = 'text';
      input.value     = f.value || '';
      input.setAttribute('data-col', f.col);
      input.setAttribute('placeholder', f.label + '...');

      // [Task #209] datalist הצעה — מערכת רפואית (סגור) / סוג אירוע (פתוח+למידה)
      if (f.col === 3) { input.setAttribute('list', 'medicalSystemList'); }
      if (f.col === 2) { input.setAttribute('list', 'eventTypeList'); }

      // Drag & Drop
      input.addEventListener('dragover', function(e) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
        input.classList.add('drag-over');
      });
      input.addEventListener('dragleave', function() { input.classList.remove('drag-over'); });
      input.addEventListener('drop', function(e) {
        e.preventDefault(); input.classList.remove('drag-over');
        var text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
        if (text) { input.value = text.trim(); input.focus(); flashField(input); }
      });

      group.appendChild(labelRow);
      group.appendChild(input);

      // [Task #209] "סוג אירוע" — רמז התאמה + שדות קוד חדש כשאין התאמה
      if (f.col === 2) {
        input.addEventListener('input', function() { checkEventTypeCode(true); });
        input.addEventListener('blur',  function() { checkEventTypeCode(false); });

        var hint = document.createElement('div');
        hint.id = 'eventCodeHint';
        hint.style.cssText = 'font-size:11px; font-weight:600; margin-top:2px;';
        group.appendChild(hint);

        var newCodeGroup = document.createElement('div');
        newCodeGroup.id = 'newEventCodeGroup';
        newCodeGroup.style.cssText = 'display:none; gap:6px; margin-top:4px;';

        var codeInput = document.createElement('input');
        codeInput.id = 'newEventCodeInput';
        codeInput.className = 'field-input';
        codeInput.style.cssText = 'flex:1;';
        codeInput.setAttribute('placeholder', 'קוד (A00)');

        newCodeGroup.appendChild(codeInput);
        group.appendChild(newCodeGroup);
      }

      container.appendChild(group);
    });
  }

  // ════ איסוף ערכי שדות ל-JSON ════
  function collectFields() {
    return FIELDS_DEF.map(function(f) {
      var el = document.getElementById('field_' + f.col);
      return { label: f.label, col: f.col, value: el ? el.value : (f.value || '') };
    });
  }

  // ════ החלפת תצוגה מקורי/TXT ════
  function switchView(mode) {
    if (mode === 'txt' && !TXT_URL)    return;
    if (mode === 'source' && !SOURCE_URL) return;
    VIEW_MODE = mode;

    if (mode === 'source') { showSourceView(); }
    else                   { showTxtView();    }

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

    document.getElementById('txtLoading').style.display = 'flex';
    document.getElementById('txtContentPre').style.display = 'none';

    google.script.run
      .withSuccessHandler(function(res) {
        document.getElementById('txtLoading').style.display = 'none';
        var pre = document.getElementById('txtContentPre');
        if (res && res.success) {
          pre.textContent   = res.content;
          pre.style.display = '';
          TXT_LOADED = true;
        } else {
          pre.textContent   = '⚠️ ' + (res ? res.msg : 'שגיאה לא ידועה');
          pre.style.display = '';
          pre.style.color   = '#c62828';
        }
      })
      .withFailureHandler(function(e) {
        document.getElementById('txtLoading').style.display = 'none';
        var pre = document.getElementById('txtContentPre');
        pre.textContent   = '❌ שגיאה: ' + (e.message || e);
        pre.style.display = '';
        pre.style.color   = '#c62828';
      })
      .s10_fetchTxtContent(TXT_URL);
  }

  // ════ ניווט אירועים אחים (Split X/Y) ════
  function prevSibling() {
    if (SPLIT_X <= 1) return;
    var targetRow = SIBLING_ROWS[SPLIT_X - 2];
    if (targetRow) navigateToSibling(targetRow);
  }

  // [Task 185] שונה שם מ-nextSibling ל-goNextSibling — "nextSibling" הוא שם
  // תכונת DOM מובנית (Node.nextSibling), והתנגשות שם גרמה ל-TypeError
  // כשנקרא מתוך onclick בתוך תג הכפתור (הפונקציה הגלובלית לא הייתה נגישה).
  function goNextSibling() {
    if (SPLIT_X >= SIBLING_ROWS.length) return;
    var targetRow = SIBLING_ROWS[SPLIT_X];
    if (targetRow) navigateToSibling(targetRow);
  }

  function navigateToSibling(targetRow) {
    setStatus('info', 'טוען אירוע...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(function(payload) {
        disableBtns(false);
        if (!payload || payload.error) {
          setStatus('error', (payload && payload.msg) || 'שגיאה');
          return;
        }
        initUI(payload);
      })
      .withFailureHandler(function(e) {
        disableBtns(false);
        setStatus('error', 'שגיאה: ' + (e.message || e));
      })
      .s10_loadSiblingRow(targetRow);
  }

  // ════ ניווט מסמכים ════
  function prevRow()  { if (ROW > 2)       navigateTo(ROW - 1); }
  function nextRow()  { if (ROW < MAX_ROW) navigateTo(ROW + 1); }

  function jumpToRow() {
    var val = parseInt(document.getElementById('rowJump').value, 10);
    if (isNaN(val) || val < 2) { setStatus('error', 'מספר שורה לא תקין'); return; }
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
      .s10_loadRowByNumber(row);
  }

  // ════ כפתורי פעולה ════
  function closeDialog() { google.script.host.close(); }

      function doApprove() {
    setStatus('info', 'מבצע אישור...');
    disableBtns(true);
    google.script.run
      .withSuccessHandler(handleResult)
      .withFailureHandler(handleError)
      .s10_approve(ROW);
  }

  function doUpdate() {
    setStatus('info', 'שומר ושולח ללמידה...');
    disableBtns(true);
    var fieldsJson      = JSON.stringify(collectFields());
    var complexity      = document.getElementById('complexitySelect').value;
    var correctionNote  = document.getElementById('noteInput').value;
    google.script.run
      .withSuccessHandler(function(res) {
        disableBtns(false);
        if (res && res.isDuplicate) { setStatus('info', res.msg); }
        else { handleResult(res); }
      })
      .withFailureHandler(handleError)
      .s10_updateAndLearn(ROW, fieldsJson, complexity, correctionNote);
  }

  function doLearn() {
    setStatus('info', 'יוצר דוגמת למידה...');
    disableBtns(true);
    var fieldsJson     = JSON.stringify(collectFields());
    var complexity     = document.getElementById('complexitySelect').value;
    var correctionNote = document.getElementById('noteInput').value;
    google.script.run
      .withSuccessHandler(function(res) {
        disableBtns(false);
        if (res && res.isDuplicate) { setStatus('info', res.msg); }
        else { handleResult(res); }
      })
      .withFailureHandler(handleError)
      .s10_learnOnly(ROW, fieldsJson, complexity, correctionNote);
  }

  function doSaveEventCode() {
    var codeEl      = document.getElementById('newEventCodeInput');
    var nameEl      = document.getElementById('newEventNameInput');
    var eventField  = document.getElementById('field_2');
    var code        = codeEl ? codeEl.value.trim() : '';
    var name        = nameEl ? nameEl.value.trim() : '';
    var rawText     = eventField ? eventField.value.trim() : '';

    if (!rawText) {
      setStatus('error', '⚠️ אין טקסט "סוג אירוע" לקטלוג');
      return;
    }
    if (!code) {
      setStatus('error', '⚠️ יש למלא קוד לפני השמירה');
      return;
    }

    setStatus('info', 'שומר קוד אירוע...');
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.success) {
          EVENT_TYPE_MAP[rawText] = { code: code, name: name };
          buildEventFamilyList();
          buildEventCodeCatalog();
          checkEventTypeCode(false);
          setStatus('success', res.updated ? '🔄 קוד האירוע עודכן בהצלחה' : '💾 קוד האירוע נשמר בהצלחה');
        } else {
          setStatus('error', (res && res.msg) || '❌ שמירת הקוד נכשלה');
        }
      })
      .withFailureHandler(handleError)
      .s10_saveEventCode(rawText, code, name);
  }

  function doDelete() {
    var msg = 'האם למחוק את האירוע בשורה ' + ROW + '?\n\nפעולה זו בלתי הפיכה.';
    if (!window.confirm(msg)) return;
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
      .s10_delete(ROW);
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

  function initDragDrop() {
    // Drag & Drop מוגדר בבניית השדות הדינמיים
  }

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

  function setStatus(type, text) {
    var bar = document.getElementById('statusBar');
    bar.className = 'status-bar ' + type;
    document.getElementById('statusText').textContent = text;
    document.getElementById('spinner').className =
      'spinner' + (type === 'info' ? ' visible' : '');
  }

  function disableBtns(state) {
    document.querySelectorAll('.action-btn').forEach(function(b) { b.disabled = state; });
    document.getElementById('btnPrev').disabled         = state || (ROW <= 2);
    document.getElementById('btnNext').disabled         = state || (ROW >= MAX_ROW);
    document.getElementById('btnSiblingPrev').disabled  = state || (SPLIT_X <= 1);
    document.getElementById('btnSiblingNext').disabled  = state || (SPLIT_X >= SIBLING_ROWS.length);
  }
</script>
</body>
</html>
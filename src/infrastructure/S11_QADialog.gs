<!--
  MedicalPilot — S11_QADialog.html
  @version 1.32.0 | @updated 28/07/2026 21:53 | @service S11
  @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QADialog.html
  @description ממשק HTML לדוח ממצאי QA — פתיחה מיידית, סריקה הדרגתית קוד-
               אחרי-קוד (ללא באצ'ים), עצירה על ממצא עם אפשרות תיקון-מיידי
               או דילוג, טבלת סיכום סופית עם צ'קבוקסים, סינון לפי קוד
               שגיאה, קיבוץ E11 לפי הפניה, כפתור תקן נבחרים.
  @callers    S11_QArun.gs (runQAViewMain, template.evaluate)
  @functions  runNextStep, runSingleStep, runBatchesForStep (מושבתת),
              _renderStepReview, _stepResume, _stepSkip, _stepApplySelected,
              finishScan, initFindings, buildFilterButtons, filterBy,
              renderTable, toggleSelectAll, updateSelectedCount, applySelected,
              closeDeleteE17Modal, doDeleteE17Rows
  @changes [v1.32.0] Task 158 — נסגר סופית: runBatchesForStep הושבתה (קוד מת, הבאצ'ים לא היו השורש — S11_QArun.gs v1.34.0 מפרט את השורש האמיתי). נוספה עצירה-על-ממצא: כשקוד מוצא ממצאים, מוצג חלון-ביניים (_renderStepReview) עם טבלה וכפתורים "תקן נבחרים והמשך"/"דלג לקוד הבא" — מה שמתוקן לא נכנס לדוח הסופי, מה שנשאר/דולג כן. אומת מקצה-לקצה: 79 ממצאים סופיים (E11:1, E25:8, E31:5, E32:65). כל שאריות ה-DEBUG הזמניות (כותרת חלון, checkSteps.length) הוסרו.
-->
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    background: #f5f7fa;
    color: #1a1a2e;
    direction: rtl;
  }

  .header {
    background: #1a3a5c;
    color: #fff;
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header h2 { font-size: 14px; font-weight: 600; }
  .header .count { font-size: 12px; opacity: 0.8; }

  .toolbar {
    padding: 8px 14px;
    background: #fff;
    border-bottom: 1px solid #dde3ea;
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    position: sticky;
    top: 38px;
    z-index: 9;
  }

  .filter-btn {
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid #ccd3dc;
    background: #f0f4f8;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s;
  }

  .filter-btn.active {
    background: #1a3a5c;
    color: #fff;
    border-color: #1a3a5c;
  }

  .select-all-wrap {
    margin-right: auto;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #555;
  }

  .table-wrap {
    overflow-y: auto;
    max-height: calc(100vh - 130px);
    padding: 8px 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  thead th {
    background: #eef2f7;
    padding: 7px 8px;
    font-weight: 600;
    font-size: 12px;
    color: #444;
    border-bottom: 1px solid #dde3ea;
    text-align: right;
  }

  tbody tr { border-bottom: 1px solid #f0f0f0; transition: background 0.1s; }
  tbody tr:hover { background: #f7faff; }
  tbody tr.e11-sub { background: #fafbff; }
  tbody tr.e11-sub td:first-child { padding-right: 28px; }

  td { padding: 6px 8px; vertical-align: middle; }

  .code-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
  }

  .badge-E01 { background: #FFF3CD; color: #856404; }
  .badge-E02 { background: #D1ECF1; color: #0C5460; }
  .badge-E03 { background: #F8D7DA; color: #721C24; }
  .badge-E04 { background: #FCE8B2; color: #664D03; }
  .badge-E05 { background: #FCE8B2; color: #664D03; }
  .badge-E06 { background: #FCE8B2; color: #664D03; }
  .badge-E07 { background: #D4EDDA; color: #155724; }
  .badge-E08 { background: #F8D7DA; color: #721C24; }
  .badge-E09 { background: #F8D7DA; color: #721C24; }
  .badge-E10 { background: #FFF3CD; color: #856404; }
  .badge-E11 { background: #E2D9F3; color: #4A1C8C; }
  .badge-E12 { background: #F8D7DA; color: #721C24; }
  .badge-E13 { background: #F8D7DA; color: #721C24; }
  /* [v1.2.0] Tasks 94+98 — השלמת badges שהיו חסרים + קודים חדשים */
  .badge-E14 { background: #FFF3CD; color: #856404; }
  .badge-E15 { background: #F8D7DA; color: #721C24; }
  .badge-E16 { background: #F5C2C7; color: #58151C; }
  .badge-E17 { background: #E2E3E5; color: #41464B; }
  .badge-E18 { background: #D1ECF1; color: #0C5460; }
  .badge-E19 { background: #F8D7DA; color: #721C24; }
  .badge-E20 { background: #F8D7DA; color: #721C24; }
  .badge-E21 { background: #D1ECF1; color: #0C5460; }
  .badge-E22 { background: #F5C2C7; color: #58151C; }
  /* [v1.6.0] Task 155 — badges חסרים ל-7 קודים שנוספו מ-07/07 עד 16/07 */
  .badge-E25 { background: #F5C2C7; color: #58151C; }
  .badge-E26 { background: #FFF3CD; color: #856404; }
  .badge-E27 { background: #FFF3CD; color: #856404; }
  .badge-E28 { background: #FFF3CD; color: #856404; }
  .badge-E30 { background: #D1ECF1; color: #0C5460; }
  .badge-E31 { background: #F5C2C7; color: #58151C; }
  .badge-E32 { background: #E2D9F3; color: #4A1C8C; }

  .fix-label  { font-size: 11px; color: #666; }
  .fix-auto   { color: #1a7a3c; font-weight: 600; }
  .fix-clear  { color: #c06000; font-weight: 600; }
  .fix-flag   { color: #c00000; font-weight: 600; }
  .fix-note   { color: #0C5460; font-weight: 600; }
  .fix-delete { color: #8b0000; font-weight: 700; }

  .footer {
    position: sticky;
    bottom: 0;
    background: #fff;
    border-top: 1px solid #dde3ea;
    padding: 8px 14px;
    display: flex;
    gap: 8px;
    justify-content: flex-start;
    align-items: center;
  }

  .btn-fix {
    background: #1a3a5c;
    color: #fff;
    border: none;
    padding: 7px 18px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }

  .btn-fix:disabled { background: #aaa; cursor: default; }
  .btn-cancel { background: none; border: 1px solid #ccc; padding: 7px 14px; border-radius: 5px; cursor: pointer; font-size: 13px; }

  .selected-count { font-size: 12px; color: #555; margin-right: 8px; }

 .spinner { display: none; font-size: 12px; color: #888; }
  .spinner.visible { display: inline; }

  /* [v1.5.0] בקשת עמוס — מודל אישור מחיקת שורות E17 שהוסלמו */
  .modal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    align-items: center; justify-content: center; z-index: 50;
  }
  .modal-overlay.visible { display: flex; }
  .modal-box {
    background: #fff; border-radius: 8px; padding: 18px;
    width: 420px; max-height: 70vh; overflow-y: auto;
    display: flex; flex-direction: column; gap: 10px;
  }
  .modal-title { font-size: 14px; font-weight: 700; color: #c62828; }
  .modal-text  { font-size: 12px; color: #444; line-height: 1.5; white-space: pre-wrap; }
  .modal-actions { display: flex; gap: 6px; }
  .modal-btn {
    border: none; border-radius: 5px; padding: 8px 14px;
    font-size: 12px; font-weight: 700; cursor: pointer; color: #fff;
  }
  .modal-btn-delete { background: #c62828; }
  .modal-btn-cancel { background: #999; }

  /* [v1.29.0] בקשת עמוס — דיאלוג התקדמות, מוצג מיד עם פתיחת החלון */
  .progress-overlay {
    display: flex; position: fixed; inset: 0;
    background: #fff; align-items: center; justify-content: center;
    z-index: 100; flex-direction: column; gap: 14px;
  }
  .progress-overlay.hidden { display: none; }
  .progress-box { width: 80%; max-width: 420px; text-align: center; }
  .progress-title  { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 6px; }
  .progress-status { font-size: 13px; color: #555; margin-bottom: 10px; min-height: 18px; }
  .progress-bar-wrap {
    width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%; width: 0%; background: #1976d2; transition: width 0.2s ease;
  }
  .progress-count { font-size: 11px; color: #999; margin-top: 6px; }
</style>
</head>
<body>

 <div class="progress-overlay" id="progressOverlay">
  <div class="progress-box">
    <div class="progress-title">🔍 S11 QA — סורק</div>
    <div class="progress-status" id="progressStatus">מתחיל…</div>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" id="progressBarFill"></div></div>
    <div class="progress-count" id="progressCount"></div>
  </div>
</div>

<!-- [שלב C — Task 158, 28/07/2026] חלון-ביניים: עצירה כשקוד מסוים מוצא ממצאים -->
<div class="progress-overlay hidden" id="stepReviewOverlay" style="align-items:flex-start; padding-top:30px;">
  <div style="background:#fff; border-radius:8px; width:92%; max-width:680px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 4px 20px rgba(0,0,0,0.2);">
    <div style="padding:12px 16px; border-bottom:1px solid #dde3ea; font-weight:700; font-size:14px; color:#1a3a5c;" id="stepReviewTitle"></div>
    <div style="overflow-y:auto; padding:8px 16px; flex:1;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="width:30px; text-align:right; font-size:12px; color:#444; padding:6px 4px;">☑</th>
            <th style="width:50px; text-align:right; font-size:12px; color:#444; padding:6px 4px;">שורה</th>
            <th style="text-align:right; font-size:12px; color:#444; padding:6px 4px;">תיאור</th>
          </tr>
        </thead>
        <tbody id="stepReviewBody"></tbody>
      </table>
    </div>
    <div style="padding:10px 16px; border-top:1px solid #dde3ea; display:flex; gap:8px;">
      <button class="btn-fix" onclick="_stepApplySelected()">תקן נבחרים והמשך</button>
      <button class="btn-cancel" onclick="_stepSkip()">דלג לקוד הבא</button>
    </div>
  </div>
</div>

<div class="header">
  <h2>S11 QA — דוח ממצאים</h2>
  <span class="count" id="totalCount"></span>
</div>

<div class="toolbar">
  <button class="filter-btn active" onclick="filterBy('all')">כולם</button>
  <div id="filterBtns"></div>
  <div class="select-all-wrap">
    <input type="checkbox" id="selectAll" onchange="toggleSelectAll(this.checked)">
    <label for="selectAll">בחר הכול</label>
  </div>
</div>

<div class="table-wrap">
  <table id="findingsTable">
    <thead>
      <tr>
        <th style="width:30px">☑</th>
        <th style="width:50px">שורה</th>
        <th style="width:50px">קוד</th>
        <th>תיאור</th>
        <th style="width:100px">תיקון</th>
      </tr>
    </thead>
    <tbody id="tableBody"></tbody>
  </table>
</div>

<div class="footer">
  <button class="btn-fix" id="btnFix" onclick="applySelected()">תקן נבחרים</button>
  <button class="btn-cancel" onclick="google.script.host.close()">סגור</button>
  <span class="selected-count" id="selectedCount">0 נבחרו</span>
  <span class="spinner" id="spinner">⏳ מתקן...</span>
</div>

<!-- ════ [v1.5.0] בקשת עמוס — מודל אישור מחיקת שורות E17 שהוסלמו ════ -->
<div class="modal-overlay" id="deleteE17Modal">
  <div class="modal-box">
    <div class="modal-title">⚠️ מחיקת שורות E17 — מקור אבד לצמיתות</div>
    <div class="modal-text" id="deleteE17ModalText"></div>
    <div class="modal-actions" id="deleteE17ModalActions">
      <button class="modal-btn modal-btn-delete" onclick="doDeleteE17Rows()">🗑️ מחק שורות אלה</button>
      <button class="modal-btn modal-btn-cancel" onclick="closeDeleteE17Modal()">ביטול</button>
    </div>
  </div>
</div>
<script>
  var allFindings   = [];
  var activeFilter  = 'all';

  // קבלת נתונים מ-GAS
  window.initFindings = function(findings) {
    allFindings = findings;
    buildFilterButtons();
    renderTable(findings);
    document.getElementById('totalCount').textContent = findings.length + ' ממצאים';
  };

  function buildFilterButtons() {
    var codes = {};
    allFindings.forEach(function(f) {
      codes[f.code] = (codes[f.code] || 0) + 1;
    });
    var html = '';
    Object.keys(codes).sort().forEach(function(code) {
      html += '<button class="filter-btn" onclick="filterBy(\'' + code + '\')">' +
              code + ' (' + codes[code] + ')</button>';
    });
    document.getElementById('filterBtns').innerHTML = html;
  }

  function filterBy(code) {
    activeFilter = code;
    document.querySelectorAll('.filter-btn').forEach(function(b) {
      b.classList.toggle('active', b.textContent.startsWith(code) || (code === 'all' && b.textContent === 'כולם'));
    });
    var filtered = code === 'all' ? allFindings : allFindings.filter(function(f) { return f.code === code; });
    renderTable(filtered);
  }

  function renderTable(findings) {
    var tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    var selected = 0;

    findings.forEach(function(f, idx) {
      var isE11Sub = f.isE11Sub;
      var tr = document.createElement('tr');
      if (isE11Sub) tr.className = 'e11-sub';

      var fixLabel = '';
      var fixClass = '';
      if (f.fix === 'write')      { fixLabel = '→ כתיבה אוטומטית'; fixClass = 'fix-auto';   }
      if (f.fix === 'clear_u')    { fixLabel = '→ ניקוי U';         fixClass = 'fix-clear';  }
      if (f.fix === 'clear')      { fixLabel = '→ ניקוי עמודה';    fixClass = 'fix-clear';  }
      if (f.fix === 'clear_st')   { fixLabel = '→ ניקוי S+T';      fixClass = 'fix-clear';  }
      if (f.fix === 'flag')       { fixLabel = '→ דגל U';           fixClass = 'fix-flag';   }
      // [v1.2.0] Task 98 — עדכון Note בלבד (E18)
      if (f.fix === 'set_note')   { fixLabel = '→ עדכון Note';      fixClass = 'fix-note';   }
      // [v1.2.0] Task 94 — מחיקת שורה מלאה (E16), תווית מזהירה
      if (f.fix === 'delete_row') { fixLabel = '🗑 מחיקת שורה';     fixClass = 'fix-delete'; }

      // [v1.2.0] Task 94 — שמרנות: E16 (מחיקה הרסנית) לא מסומן כברירת מחדל
      var checkedAttr = (f.fix === 'delete_row') ? '' : 'checked';

      tr.innerHTML =
        '<td><input type="checkbox" class="row-cb" data-idx="' + f.origIdx + '" ' + checkedAttr + '></td>' +
        '<td>' + (isE11Sub ? '↳' : f.row) + (isE11Sub ? ' שורה ' + f.row : '') + '</td>' +
        '<td><span class="code-badge badge-' + f.code + '">' + f.code + '</span></td>' +
        '<td>' + f.desc + '</td>' +
        '<td><span class="fix-label ' + fixClass + '">' + fixLabel + '</span></td>';

      tbody.appendChild(tr);
      selected++;
    });

    updateSelectedCount();
    document.querySelectorAll('.row-cb').forEach(function(cb) {
      cb.addEventListener('change', updateSelectedCount);
    });
  }

  function toggleSelectAll(checked) {
    document.querySelectorAll('.row-cb').forEach(function(cb) { cb.checked = checked; });
    updateSelectedCount();
  }

function updateSelectedCount() {
    var n = document.querySelectorAll('.row-cb:checked').length;
    document.getElementById('selectedCount').textContent = n + ' נבחרו';
    document.getElementById('btnFix').disabled = (n === 0);
  }

var checkSteps  = <?!= checkStepsJson ?>;
  var isSingleRow = <?= isSingleRow ?>;
  var activeRow   = <?= activeRow ?>;
  var lastRow     = <?= lastRow ?>;
var accumulated = [];
  var debugErrors = [];
  var stepIdx     = 0;

  function runNextStep() {
    if (stepIdx >= checkSteps.length) {
      finishScan();
      return;
    }
    var step = checkSteps[stepIdx];
    var pct  = Math.round((stepIdx / checkSteps.length) * 100);

    document.getElementById('progressBarFill').style.width = pct + '%';
    document.getElementById('progressCount').textContent =
      (stepIdx + 1) + ' מתוך ' + checkSteps.length;

    runSingleStep(step);
  }

  // [v1.34.0] Task 158 — שלב 3/6: בוטל חיתוך הבאצ'ים (BATCH_SIZE_HEAVY/
  // LIGHT, startIdx/nextIdx) — היה מחזיר 0 ממצאים בכל הקודים הכבדים
  // (E32, E25-E31, E17-E22, E30) למרות נתונים תקינים ואפס שגיאות; סיבת-
  // שורש טרם אותרה. קריאה יחידה מלאה לכל קוד, זהה במבנה ל-s11_runSingleCheck
  // (הפונקציה הלא-מחולקת), שהוכחה כעובדת בהרצת runTest_S11_BatchScan
  // (batchSize=100000 = מקביל לקריאה יחידה על כל הגליון). פס הטעינה
  // ממשיך להתקדם צעד-צעד (X מתוך 22) בלי שינוי חזותי — רק בלי תת-
  // ההתקדמות שהייתה בתוך קוד בודד.
  function runSingleStep(step) {
    document.getElementById('progressStatus').textContent =
      '🔍 בודק ' + step.code + (step.heavy ? ' (Drive — עשוי לקחת רגע)' : '') + ' — ' + step.label;

   google.script.run
      .withSuccessHandler(function(result) {
        if (result && result.error) {
          debugErrors.push(step.code + ':' + result.msg);
          stepIdx++;
          runNextStep();
          return;
        }
        // [שלב C — Task 158, 28/07/2026] נמצאו ממצאים בקוד הזה — עוצרים
        // ומציגים אותם, במקום להמשיך אוטומטית לקוד הבא.
        if (result && result.findings && result.findings.length > 0) {
          _renderStepReview(step, result.findings);
          return;
        }
        stepIdx++;
        runNextStep();
      })
      .withFailureHandler(function(err) {
        console.error('[S11 QA] שלב ' + step.code + ' נכשל: ', err);
        debugErrors.push(step.code + ':FAIL:' + (err && err.message ? err.message : err));
        stepIdx++;
        runNextStep(); // ממשיכים גם אם שלב בודד נכשל
      })
      .s11_runSingleCheck(step.code, isSingleRow, activeRow, lastRow);
  }

  // [שלב C — Task 158, 28/07/2026] תמיכה בעצירה-על-ממצא: מציג את ממצאי
  // הקוד הנוכחי בחלון-ביניים, ומאפשר לתקן חלק מהם עכשיו או לדלג הלאה.
  // מה שמתוקן לא נכנס לדוח הסופי (כבר טופל); מה שנשאר לא-מסומן/דולג
  // נכנס לדוח הסופי (accumulated) כרגיל.
  var _stepPendingFindings = [];

  function _renderStepReview(step, findings) {
    _stepPendingFindings = findings.map(function(f, i) { f._stepIdx = i; return f; });
    document.getElementById('stepReviewTitle').textContent =
      '⚠️ נמצאו ' + findings.length + ' ממצאים בקוד ' + step.code + ' — ' + step.label;
    var tbody = document.getElementById('stepReviewBody');
    tbody.innerHTML = '';
    findings.forEach(function(f, i) {
      var checkedAttr = (f.fix === 'delete_row') ? '' : 'checked';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="padding:6px 4px;"><input type="checkbox" class="step-review-cb" data-idx="' + i + '" ' + checkedAttr + '></td>' +
        '<td style="padding:6px 4px;">' + f.row + '</td>' +
        '<td style="padding:6px 4px;">' + f.desc + '</td>';
      tbody.appendChild(tr);
    });
    document.getElementById('progressOverlay').classList.add('hidden');
    document.getElementById('stepReviewOverlay').classList.remove('hidden');
  }

  function _stepResume() {
    document.getElementById('stepReviewOverlay').classList.add('hidden');
    document.getElementById('progressOverlay').classList.remove('hidden');
    stepIdx++;
    runNextStep();
  }

  function _stepSkip() {
    accumulated = accumulated.concat(_stepPendingFindings);
    _stepResume();
  }

  function _stepApplySelected() {
    var checkedIdxs = [];
    document.querySelectorAll('.step-review-cb:checked').forEach(function(cb) {
      checkedIdxs.push(parseInt(cb.getAttribute('data-idx')));
    });
    var toFix   = _stepPendingFindings.filter(function(f) { return checkedIdxs.indexOf(f._stepIdx) !== -1; });
    var toDefer = _stepPendingFindings.filter(function(f) { return checkedIdxs.indexOf(f._stepIdx) === -1; });

    if (toFix.length === 0) {
      accumulated = accumulated.concat(_stepPendingFindings);
      _stepResume();
      return;
    }

    google.script.run
      .withSuccessHandler(function(result) {
        accumulated = accumulated.concat(toDefer);
        _stepResume();
      })
      .withFailureHandler(function(err) {
        console.error('[S11 QA] _stepApplySelected נכשלה: ', err);
        accumulated = accumulated.concat(_stepPendingFindings); // fail-safe — לא לאבד ממצאים
        _stepResume();
      })
      .qa_applySelectedFixes(JSON.stringify(toFix));
  }
 // [שלב A — Task 158, 28/07/2026] מושבתת — קוד מת, לא נקראת משום מקום.
  // הבאצ'ים בוטלו (ראה הערה מעל runSingleStep) — נשמרת כאן להתייחסות
  // בלבד, לא לחבר מחדש בלי בדיקה חוזרת. תלויה גם ב-s11_runSingleCheckBatch
  // (S11_QArun.gs) שהושבתה באותו שלב.
  /*
  function runBatchesForStep(step, startIdx, stepFindings) {
    var batchSize = step.heavy ? BATCH_SIZE_HEAVY : BATCH_SIZE_LIGHT;

    document.getElementById('progressStatus').textContent =
      '🔍 בודק ' + step.code + (step.heavy ? ' (Drive — עשוי לקחת רגע)' : '') + ' — ' + step.label;

    google.script.run
     .withSuccessHandler(function(result) {
        if (result && result.error) {
          debugErrors.push(step.code + ':' + result.msg);
        }
        if (result && !result.error && result.findings) {
          stepFindings = stepFindings.concat(result.findings);
        }
        if (step.heavy && result && !result.error && !result.isDone) {
          document.getElementById('progressStatus').textContent =
            '🔍 בודק ' + step.code + ' (Drive) — נסרקו ' + result.nextIdx + ' מתוך ' + result.totalRows + ' שורות';
        }
        if (!result || result.error || result.isDone) {
          accumulated = accumulated.concat(stepFindings);
          stepIdx++;
          runNextStep();
        } else {
          runBatchesForStep(step, result.nextIdx, stepFindings);
        }
      })
      .withFailureHandler(function(err) {
        console.error('[S11 QA] שלב ' + step.code + ' נכשל: ', err);
        debugErrors.push(step.code + ':FAIL:' + (err && err.message ? err.message : err));
        accumulated = accumulated.concat(stepFindings);
        stepIdx++;
        runNextStep(); // ממשיכים גם אם שלב בודד נכשל
      })
      .s11_runSingleCheckBatch(step.code, isSingleRow, activeRow, lastRow, startIdx, batchSize);
  }
  */

function finishScan() {
    document.getElementById('progressBarFill').style.width = '100%';
    google.script.run
      .withSuccessHandler(function(result) {
        document.getElementById('progressOverlay').classList.add('hidden');
        var finalFindings = (result && result.findings) ? result.findings : [];
        if (finalFindings.length === 0) {
          document.getElementById('totalCount').textContent = '✅ הכול תקין — אין ממצאים';
        }
        window.initFindings(finalFindings);
      })
      .withFailureHandler(function(err) {
        document.getElementById('progressOverlay').classList.add('hidden');
        document.getElementById('totalCount').textContent =
          'שגיאה בשמירת ממצאים: ' + (err && err.message ? err.message : err);
      })
      .s11_storeFindings(JSON.stringify(accumulated));
  }

 runNextStep();

function applySelected() {
    var checkedIdxs = [];
    document.querySelectorAll('.row-cb:checked').forEach(function(cb) {
      checkedIdxs.push(parseInt(cb.getAttribute('data-idx')));
    });
    if (checkedIdxs.length === 0) return;

    // בנה מערך ממצאים נבחרים לשליחה ל-GAS
    var selectedFindings = allFindings.filter(function(f) {
      return checkedIdxs.indexOf(f.origIdx) !== -1;
    });

    // [v1.4.0] אבחון — לוג מלא של מה שבאמת נשלח, לפני השליחה
    console.log('[S11 QA] checkedIdxs:', checkedIdxs);
    console.log('[S11 QA] selectedFindings (' + selectedFindings.length + '):', selectedFindings);

    document.getElementById('btnFix').disabled = true;
    document.getElementById('spinner').classList.add('visible');

    google.script.run
      .withSuccessHandler(function(result) {
        console.log('[S11 QA] qa_applySelectedFixes result:', result);
        document.getElementById('spinner').classList.remove('visible');
        // [v1.4.0] תיקון קריטי — result נבדק בפועל, לא רק מוצג טקסט קבוע.
        // qa_applySelectedFixes (S11_QArun.gs v1.16.0) מחזירה כעת
        // {success, appliedCount, totalRequested, msg} — מציגים msg אמיתי.
        if (result && typeof result === 'object') {
          document.getElementById('totalCount').textContent = result.msg;
          document.getElementById('btnFix').textContent = result.success ? 'הושלם' : 'תקן שוב';
          document.getElementById('btnFix').disabled = result.success; // נשאר לחיץ אם נכשל חלקית

          // [v1.5.0] בקשת עמוס — אם היו ממצאי E17 שהוסלמו בפועל (fix="write"
          // ל-R, לא רק "flag" ראשוני) — מציעים מחיקה מיידית, מאחורי מודל
          // אישור נפרד. לא נוגע בשום ממצא אחר (E16/E22/E25 וכו').
          if (result.e17Rows && result.e17Rows.length > 0) {
            showDeleteE17Modal(result.e17Rows);
          }
        } else {
          // תאימות לאחור אם השרת עדיין ישן (boolean) — לא אמור לקרות אחרי ההדבקה
          console.error('[S11 QA] result אינו אובייקט — יתכן שהשרת לא עודכן ל-v1.16.0');
          document.getElementById('totalCount').textContent = '⚠️ תשובה לא צפויה מהשרת — בדוק שS11_QArun.gs עודכן';
          document.getElementById('btnFix').disabled = false;
        }
      })
      .withFailureHandler(function(err) {
        console.error('[S11 QA] qa_applySelectedFixes נכשלה:', err);
        document.getElementById('spinner').classList.remove('visible');
        document.getElementById('btnFix').disabled = false;
        alert('שגיאה: ' + err.message);
      })
      .qa_applySelectedFixes(JSON.stringify(selectedFindings));
  }

  // ══════════════════════════════════════════════════════════════
  // [v1.5.0] בקשת עמוס — מחיקת שורות E17 שהוסלמו, מאחורי אישור נפרד.
  // קורא ל-qa_deleteE17Findings (S11_QArun.gs) שקוראת בתורה ל-
  // s08_deleteSpecificRows (S08_Validate.gs) — row-only, ללא Drive.
  // ══════════════════════════════════════════════════════════════

  var _e17RowsPendingDelete = [];

  function showDeleteE17Modal(e17Rows) {
    _e17RowsPendingDelete = e17Rows;

    var rowsList = e17Rows.map(function (r) {
      return 'שורה ' + r.row + ' — ' + r.reason;
    }).join('\n');

    document.getElementById('deleteE17ModalText').textContent =
      'הוסלמו כעת ' + e17Rows.length + ' שורות E17 (מקור אבד לצמיתות):\n\n' + rowsList +
      '\n\n⚠️ מחיקה כאן היא שורה בלבד מהגליון — בלי נגיעה ב-Drive (אין קובץ מקור קיים למחוק ב-E17). ' +
      'לא ניתן לבטל. האם למחוק את השורות האלה עכשיו?';

    document.getElementById('deleteE17Modal').classList.add('visible');
  }

  function closeDeleteE17Modal() {
    document.getElementById('deleteE17Modal').classList.remove('visible');
    _e17RowsPendingDelete = [];
  }

  function doDeleteE17Rows() {
    if (!_e17RowsPendingDelete.length) { closeDeleteE17Modal(); return; }

    var rowNumbers = _e17RowsPendingDelete.map(function (r) { return r.row; });
    var actions = document.getElementById('deleteE17ModalActions');
    var text    = document.getElementById('deleteE17ModalText');
    text.textContent = '⏳ מוחק...';
    actions.innerHTML = '';

    google.script.run
      .withSuccessHandler(function (res) {
        text.textContent = res.msg;
        actions.innerHTML =
          '<button class="modal-btn modal-btn-cancel" onclick="closeDeleteE17Modal()">סגור</button>';
        _e17RowsPendingDelete = [];
      })
      .withFailureHandler(function (err) {
        text.textContent = '❌ ' + ((err && err.message) || err);
        actions.innerHTML =
          '<button class="modal-btn modal-btn-cancel" onclick="closeDeleteE17Modal()">סגור</button>';
      })
      .qa_deleteE17Findings(JSON.stringify(rowNumbers));
  }
</script>
</body>
</html>
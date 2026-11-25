<!--
  MedicalPilot — S02_AccessDialog.html
  @version 2.0.0 | @updated 24/11/2026 20:30 | @service S02
  @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S02_AccessDialog.html
  @description דיאלוג מודלי לבדיקת הרשאות S02 — טבלת 5 שירותים (Gmail, Drive,
               Docs, GitHub, Apps Script API). Gmail/Drive/Docs — כשל מציג
               כפתור "תקן הרשאה" (הפעלת פונקציית אילוץ OAuth + רענון מיידי).
               GitHub/Apps Script API — כשל תלוי בטוקן/הגדרת חשבון שאינם
               ניתנים לתיקון תכנותי; מציג הנחיה סטטית + כפתור "בדוק שוב"
               (רענון בלבד, ללא ניסיון תיקון).
               [v2.0.0] "S02 — בדיקת הרשאות גוגל": 9 שורות מהשרת (checkUserAccess),
               פס סיכום (ירוק — הכול תקין; כתום — כמה נכשלו ומה לעשות). כפתורי
               "תקן הרשאה" הוסרו — לכל שורה שנכשלה הוראה (hint מהשרת) וכפתור
               "בדוק שוב". האישור עצמו — באייקון S02 / תפריט כלי הפיתוח (authorizeAllScopes).
  @callers    ViewEngine.gs (runAccessCheckIcon, showModalDialog)
              [v2.0.0] Auth_Check.gs (showGoogleAccessDialog — מאייקון S02, מתפריט ומהעורך)
  @functions  loadReport, renderTable, buildRow, buildStatusCell,
              buildActionCell, runFix, runRecheck, updateRow, showError
              [v2.0.0] runFix הוסרה; נוספה renderSummary
  @changes    [v2.0.0] Task #255 — כותרת "בדיקת הרשאות גוגל", פס סיכום, הסרת כפתורי התיקון
              (google.script.run מתוך חלון אינו יכול להציג מסך הסכמה — תועד 03/09/2026),
              הוראה + "בדוק שוב" בכל שורה שנכשלה. אומת: diff מדויק, בדיקת תחביר, הדמיה
              ובדיקה בפועל (9/9 ✅).
              [v1.0.0] Task 162 — יצירה ראשונית. מחליף את checkUserAccess()
              הישן (alert טקסטואלי) בטבלה אינטראקטיבית עם תיקון/רענון לפי
              שורה. שרת: Auth_Check.gs (checkUserAccess, _recheckAccessItem,
              runAccessFixAndRecheck).
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
    padding: 14px;
  }

  h2 {
    font-size: 15px;
    color: #1a3a5c;
    margin-bottom: 10px;
  }

  /* [Task #255] פס סיכום מעל הטבלה */
  .summary {
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
    font-size: 13px;
    line-height: 1.6;
  }
  .summary.ok   { background: #e8f5e9; border: 1px solid #a5d6a7; color: #1b5e20; }
  .summary.fail { background: #fff3e0; border: 1px solid #ffb74d; color: #7a4100; }

  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  th, td {
    padding: 7px 10px;
    text-align: right;
    border-bottom: 1px solid #eef2f7;
    vertical-align: middle;
  }

  th {
    background: #eef2f7;
    font-size: 12px;
    color: #444;
  }

  .status-ok   { color: #1a8a4a; font-weight: 600; white-space: nowrap; }
  .status-fail { color: #c62828; font-weight: 600; white-space: nowrap; }

  .hint {
    font-size: 11px;
    color: #777;
    display: block;
    margin-bottom: 4px;
  }

  button.recheck-btn {
    padding: 3px 10px;
    border-radius: 5px;
    border: 1px solid #1a3a5c;
    background: #fff;
    color: #1a3a5c;
    cursor: pointer;
    font-size: 12px;
  }

  button.recheck-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .loading {
    padding: 20px;
    text-align: center;
    color: #777;
  }
</style>
</head>
<body>

  <h2>S02 — בדיקת הרשאות גוגל</h2>

  <div id="summary" class="summary" style="display:none;"></div>
  <div id="loadingMsg" class="loading">טוען בדיקות...</div>
  <table id="accessTable" style="display:none;">
    <thead>
      <tr>
        <th>שירות</th>
        <th>סטטוס</th>
        <th>פעולה</th>
      </tr>
    </thead>
    <tbody id="accessTbody"></tbody>
  </table>

<script>
  // [Task #255] אין כפתורי תיקון — google.script.run מתוך חלון אינו יכול להציג מסך
  // הסכמה (תועד 03/09/2026). האישור נעשה באייקון S02 / תפריט כלי הפיתוח; כאן —
  // דוח בלבד, הוראה לכל שורה שנכשלה וכפתור "בדוק שוב".
  var currentItems = {};

  function loadReport() {
    google.script.run
      .withSuccessHandler(renderTable)
      .withFailureHandler(showError)
      .checkUserAccess();
  }

  function renderTable(items) {
    currentItems = {};
    var tbody = document.getElementById('accessTbody');
    tbody.innerHTML = '';
    items.forEach(function(item) {
      currentItems[item.key] = item;
      tbody.appendChild(buildRow(item));
    });
    document.getElementById('loadingMsg').style.display = 'none';
    document.getElementById('accessTable').style.display = '';
    renderSummary();
  }

  function renderSummary() {
    var keys = Object.keys(currentItems);
    var failed = keys.filter(function(k) { return !currentItems[k].ok; });
    var googleFailed = failed.filter(function(k) { return currentItems[k].google; });
    var box = document.getElementById('summary');
    if (failed.length === 0) {
      box.className = 'summary ok';
      box.textContent = '✅ כל ' + keys.length + ' הבדיקות תקינות.';
    } else {
      box.className = 'summary fail';
      box.textContent = '⚠️ ' + failed.length + ' מתוך ' + keys.length + ' בדיקות נכשלו.' +
        (googleFailed.length
          ? ' חסרות הרשאות גוגל — סגור את החלון, לחץ שוב על אייקון S02 ובחר "בחירת הכול" במסך של Google.'
          : ' ההוראה מופיעה בכל שורה שנכשלה.');
    }
    box.style.display = '';
  }

  function buildRow(item) {
    var tr = document.createElement('tr');
    tr.id = 'row-' + item.key;

    var tdLabel = document.createElement('td');
    tdLabel.textContent = item.label;
    tr.appendChild(tdLabel);

    var tdStatus = document.createElement('td');
    tdStatus.appendChild(buildStatusCell(item));
    tr.appendChild(tdStatus);

    var tdAction = document.createElement('td');
    tdAction.appendChild(buildActionCell(item));
    tr.appendChild(tdAction);

    return tr;
  }

  function buildStatusCell(item) {
    var span = document.createElement('span');
    span.className = item.ok ? 'status-ok' : 'status-fail';
    span.textContent = item.ok ? 'תקין ✓' : 'נכשל ✗';
    return span;
  }

  function buildActionCell(item) {
    var wrap = document.createElement('div');

    if (item.ok) {
      wrap.textContent = '—';
      return wrap;
    }

    var hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = item.error ? ('שגיאה: ' + item.error) : (item.hint || '');
    wrap.appendChild(hint);

    var recheckBtn = document.createElement('button');
    recheckBtn.className = 'recheck-btn';
    recheckBtn.textContent = 'בדוק שוב';
    recheckBtn.onclick = function() { runRecheck(item.key, recheckBtn); };
    wrap.appendChild(recheckBtn);

    return wrap;
  }

  function runRecheck(key, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'בודק...';
    google.script.run
      .withSuccessHandler(function(updated) { updateRow(updated); })
      .withFailureHandler(function(err) { btnEl.disabled = false; btnEl.textContent = 'בדוק שוב'; showError(err); })
      ._recheckAccessItem(key);
  }

  function updateRow(updated) {
    var existing = currentItems[updated.key] || {};
    var merged = {
      key:    updated.key,
      label:  updated.label || existing.label,
      ok:     updated.ok,
      google: existing.google,
      hint:   updated.hint || existing.hint,
      error:  updated.error
    };
    currentItems[updated.key] = merged;

    var oldRow = document.getElementById('row-' + updated.key);
    var newRow = buildRow(merged);
    oldRow.parentNode.replaceChild(newRow, oldRow);
    renderSummary();
  }

  function showError(err) {
    alert('שגיאה: ' + (err && err.message ? err.message : err));
  }

  loadReport();
</script>

</body>
</html>
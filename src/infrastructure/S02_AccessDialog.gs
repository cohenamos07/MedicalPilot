<!--
  MedicalPilot — S02_AccessDialog.html
  @version 1.0.0 | @updated 05/08/2026 21:37 | @service S02
  @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S02_AccessDialog.html
  @description דיאלוג מודלי לבדיקת הרשאות S02 — טבלת 5 שירותים (Gmail, Drive,
               Docs, GitHub, Apps Script API). Gmail/Drive/Docs — כשל מציג
               כפתור "תקן הרשאה" (הפעלת פונקציית אילוץ OAuth + רענון מיידי).
               GitHub/Apps Script API — כשל תלוי בטוקן/הגדרת חשבון שאינם
               ניתנים לתיקון תכנותי; מציג הנחיה סטטית + כפתור "בדוק שוב"
               (רענון בלבד, ללא ניסיון תיקון).
  @callers    ViewEngine.gs (runAccessCheckIcon, showModalDialog)
  @functions  loadReport, renderTable, buildRow, buildStatusCell,
              buildActionCell, runFix, runRecheck, updateRow, showError
  @changes    [v1.0.0] Task 162 — יצירה ראשונית. מחליף את checkUserAccess()
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

  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  th, td {
    padding: 8px 10px;
    text-align: right;
    border-bottom: 1px solid #eef2f7;
    vertical-align: middle;
  }

  th {
    background: #eef2f7;
    font-size: 12px;
    color: #444;
  }

  .status-ok   { color: #1a8a4a; font-weight: 600; }
  .status-fail { color: #c62828; font-weight: 600; }

  .hint {
    font-size: 11px;
    color: #777;
    display: block;
    margin-top: 3px;
  }

  button.fix-btn, button.recheck-btn {
    padding: 4px 10px;
    border-radius: 5px;
    border: 1px solid #1a3a5c;
    background: #1a3a5c;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
  }

  button.fix-btn:disabled, button.recheck-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button.recheck-btn {
    background: #fff;
    color: #1a3a5c;
  }

  .loading {
    padding: 20px;
    text-align: center;
    color: #777;
  }
</style>
</head>
<body>

  <h2>S02 — בדיקת הרשאות</h2>

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

    if (item.fixable) {
      var fixBtn = document.createElement('button');
      fixBtn.className = 'fix-btn';
      fixBtn.textContent = 'תקן הרשאה';
      fixBtn.onclick = function() { runFix(item.key, fixBtn); };
      wrap.appendChild(fixBtn);
    } else {
      var hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = item.hint || '';
      wrap.appendChild(hint);

      var recheckBtn = document.createElement('button');
      recheckBtn.className = 'recheck-btn';
      recheckBtn.textContent = 'בדוק שוב';
      recheckBtn.style.marginTop = '5px';
      recheckBtn.style.display = 'block';
      recheckBtn.onclick = function() { runRecheck(item.key, recheckBtn); };
      wrap.appendChild(recheckBtn);
    }

    return wrap;
  }

  function runFix(key, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'מריץ...';
    google.script.run
      .withSuccessHandler(function(updated) { updateRow(updated); })
      .withFailureHandler(function(err) { btnEl.disabled = false; btnEl.textContent = 'תקן הרשאה'; showError(err); })
      .runAccessFixAndRecheck(key);
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
      key:     updated.key,
      label:   existing.label,
      ok:      updated.ok,
      fixable: existing.fixable,
      hint:    existing.hint
    };
    currentItems[updated.key] = merged;

    var oldRow = document.getElementById('row-' + updated.key);
    var newRow = buildRow(merged);
    oldRow.parentNode.replaceChild(newRow, oldRow);
  }

  function showError(err) {
    alert('שגיאה: ' + (err && err.message ? err.message : err));
  }

  loadReport();
</script>

</body>
</html>
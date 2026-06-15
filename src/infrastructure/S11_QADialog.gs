<!--
  MedicalPilot — S11_QADialog.html
  @version 1.0.0 | @updated 14/06/2026 20:51 | @service S11
  @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QADialog.html
  @description ממשק HTML לדוח ממצאי QA — טבלת ממצאים עם צ'קבוקסים,
               סינון לפי קוד שגיאה, קיבוץ E11 לפי הפניה, כפתור תקן נבחרים.
  @impacts נקרא מ-S11_QArun.gs דרך HtmlService — מציג ממצאים ומאשר תיקונים.
           שולח תיקונים חזרה ל-S11_QArun.gs דרך google.script.run.
  @callers S11_QArun.gs (runQAViewMain)
  @changes [v1.0.0] גרסה ראשונה — Dialog HTML במקום ui.alert
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

  .fix-label { font-size: 11px; color: #666; }
  .fix-auto  { color: #1a7a3c; font-weight: 600; }
  .fix-clear { color: #c06000; font-weight: 600; }
  .fix-flag  { color: #c00000; font-weight: 600; }

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
</style>
</head>
<body>

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
      if (f.fix === 'write')    { fixLabel = '→ כתיבה אוטומטית'; fixClass = 'fix-auto';  }
      if (f.fix === 'clear')    { fixLabel = '→ ניקוי עמודה';    fixClass = 'fix-clear'; }
      if (f.fix === 'clear_st') { fixLabel = '→ ניקוי S+T';      fixClass = 'fix-clear'; }
      if (f.fix === 'flag')     { fixLabel = '→ דגל U';           fixClass = 'fix-flag';  }

      tr.innerHTML =
        '<td><input type="checkbox" class="row-cb" data-idx="' + f.origIdx + '" checked></td>' +
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

  // טעינת נתונים מוזרקים ישירות מ-GAS
  document.getElementById('totalCount').textContent = 'RAW: ' + '<?= findingsJson ?>'.substring(0, 50);
  try {
    var raw    = '<?= findingsJson ?>';
    var parsed = JSON.parse(raw);
    window.initFindings(parsed);
  } catch(e) {
    document.getElementById('totalCount').textContent = 'שגיאת JSON: ' + e.message;
  }

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

    document.getElementById('btnFix').disabled = true;
    document.getElementById('spinner').classList.add('visible');

    google.script.run
      .withSuccessHandler(function(result) {
        document.getElementById('spinner').classList.remove('visible');
        document.getElementById('totalCount').textContent = '✅ תוקנו ' + selectedFindings.length + ' ממצאים';
        document.getElementById('btnFix').textContent = 'הושלם';
      })
      .withFailureHandler(function(err) {
        document.getElementById('spinner').classList.remove('visible');
        document.getElementById('btnFix').disabled = false;
        alert('שגיאה: ' + err.message);
      })
      .qa_applySelectedFixes(JSON.stringify(selectedFindings));
  }
</script>
</body>
</html>
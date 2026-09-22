<!--
  MedicalPilot — S16_Sidebar.html
  @version     2.0.0 | @updated 18/09/2026 17:45 | @service S16
  @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S16_Sidebar.html
  @description ממשק Dialog לאימות כל קודי הסיווג ביומן_מצב_רפואי (21 עמודות):
               קוד מערכת גוף (select סגור), קוד אירוע/התמחות/חומרה/אבחנה
               (קטלוג פתוח משותף — select + הוספת קוד חדש לכל שדה בנפרד),
               וודאות אבחנה (select סגור פשוט). פריסת שתי עמודות כמו
               S10_Sidebar.html: ימין — שדות אימות, שמאל — Event_Date/
               Doc_Issuer + תצוגת מסמך מקור (הוקטן על חשבון המעבר של שני
               השדות האלה לכאן, לפי החלטת 15/09/2026).
  @impacts     כפתורים: אשר, הוסף-קוד (4, אחד לכל שדה קטלוג פתוח), ניווט
               הקודם/הבא. תלוי ב: S16_ValidateMedicalStatus.gs — כל
               הלוגיקה מתבצעת שם.
  @callers     S16_ValidateMedicalStatus.gs (showS16Sidebar)
  @functions   initUI, render, renderCodeFieldHtml, esc, prevRow, nextRow,
               doApprove, doSaveCatalogCode, handleResult, handleError
  @changes     [v2.0.0] Task #214 — שכתוב מלא: הוחלף select+input בודד של
               "קוד אירוע" ב-4 שדות קטלוג פתוח זהים במבנה (eventCode/
               specialty/severity/diagnosis), כל אחד עם select של האפשרויות
               הקיימות + מיני-טופס "קוד חדש" נפרד (renderCodeFieldHtml,
               לולאה אחת במקום קוד כפול). נוסף select לוודאות אבחנה (לא
               היה קיים בגרסה הקודמת בכלל). Event_Date/Doc_Issuer עברו
               לעמודה השמאלית + נוספה תצוגת מסמך מקור (iframe) — לא היו
               מוצגים בגרסה הקודמת מעבר לקישור טקסטואלי בודד. הוסרו שדות
               etCodeInput/etNormInput/suggestionHint הישנים (מבנה 15
               עמודות). אומת מול הקוד החי (diff מדויק).
-->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base target="_top">
<title>S16 — אימות מצב רפואי</title>
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

  .dialog-header {
    background: #7E57C2;
    color: #fff;
    padding: 8px 14px;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .header-title { font-size: 13px; font-weight: 700; }
  .header-meta  { font-size: 11px; opacity: 0.85; }

  .status-badge {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.35);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
  }

  /* ════ גוף — שתי עמודות, כמו S10_Sidebar ════ */
  .dialog-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1; overflow: hidden; min-height: 0;
  }

  .col {
    padding: 10px 12px;
    overflow-y: auto;
    display: flex; flex-direction: column;
    gap: 10px; min-height: 0;
  }

  .col-right { border-left: 1px solid #e0e0e0; }

  .section {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
    flex-shrink: 0;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #7E57C2;
    margin-bottom: 8px;
  }

  .field-row { display: flex; gap: 10px; margin-bottom: 6px; }

  .field-label {
    font-size: 11px;
    color: #666;
    min-width: 80px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .field-value {
    font-size: 13px;
    color: #222;
    white-space: pre-wrap;
    word-break: break-word;
  }

  label.edit-label {
    display: block;
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }

  select, input[type="text"] {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
  }

  .hint { font-size: 11px; color: #888; margin-top: 4px; }

  .new-code-box {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    align-items: flex-end;
  }

  .new-code-box input { flex: 1; min-width: 0; }

  .btn-add {
    background: #1976d2; color: #fff;
    border: none; border-radius: 5px;
    padding: 6px 10px; font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
  }

  .source-link {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    color: #7E57C2;
    text-decoration: none;
  }

  .file-preview {
    flex: 1; min-height: 260px;
    border: 1px solid #d1c4e9;
    border-radius: 4px;
    background: #f5f5f5;
    width: 100%;
  }

  .btn-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 14px;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
    align-items: center;
  }

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-approve { background: #43A047; color: #fff; }
  .btn-nav     { background: #eceff1; color: #333; }
  .btn-row .spacer { flex: 1; }

  #statusMsg {
    font-size: 12px;
    padding: 0 14px 8px 14px;
    min-height: 16px;
  }

  #statusMsg.ok    { color: #2e7d32; }
  #statusMsg.error { color: #c62828; }
</style>
</head>
<body>

  <div class="dialog-header">
    <div>
      <div class="header-title">🩺 S16 — אימות מצב רפואי</div>
      <div class="header-meta" id="rowMeta">טוען…</div>
    </div>
    <div class="status-badge" id="statusBadge">—</div>
  </div>

  <div class="dialog-body">
    <div class="col col-right" id="rightCol">טוען נתוני שורה…</div>
    <div class="col col-left" id="leftCol"></div>
  </div>

  <div id="statusMsg"></div>

  <div class="btn-row">
    <button class="btn-nav" onclick="prevRow()">◀ הקודם</button>
    <button class="btn-nav" onclick="nextRow()">הבא ▶</button>
    <div class="spacer"></div>
    <button class="btn-approve" onclick="doApprove()">✅ אשר</button>
  </div>

<script>
  let currentPayload = null;

  function initUI() {
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowData();
  }

  function esc(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ════ בניית HTML לשדה קטלוג פתוח בודד (eventCode/specialty/severity/diagnosis) ════
  function renderCodeFieldHtml(field) {
    let optionsHtml = '<option value="">— בחר —</option>';
    field.options.forEach(function(opt) {
      const sel = (opt.code === field.currentCode) ? ' selected' : '';
      optionsHtml += '<option value="' + esc(opt.code) + '" data-name="' + esc(opt.name) + '"' + sel + '>' +
        esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    let hintHtml = '';
    if (field.suggestion) {
      hintHtml = '<div class="hint">הצעה מהקטלוג: ' + esc(field.suggestion.code) +
        (field.suggestion.name ? ' — ' + esc(field.suggestion.name) : '') + '</div>';
    }

    return (
      '<div class="section" data-field-key="' + field.key + '">' +
        '<div class="section-title">' + esc(field.label) + '</div>' +
        '<label class="edit-label">בחירה מהקטלוג</label>' +
        '<select id="sel_' + field.key + '">' + optionsHtml + '</select>' +
        hintHtml +
        '<div class="new-code-box">' +
          '<div><label class="edit-label">קוד חדש</label><input type="text" id="newCode_' + field.key + '"></div>' +
          '<div><label class="edit-label">שם מנורמל</label><input type="text" id="newName_' + field.key + '"></div>' +
          '<button type="button" class="btn-add" onclick="doSaveCatalogCode(\'' + field.key + '\')">+ הוסף</button>' +
        '</div>' +
      '</div>'
    );
  }

  function render(payload) {
    if (!payload || payload.error) {
      handleError(payload || { msg: "שגיאה בטעינה" });
      return;
    }
    currentPayload = payload;

    document.getElementById('rowMeta').textContent =
      'שורה ' + payload.row + ' מתוך ' + payload.lastRow;
    document.getElementById('statusBadge').textContent = payload.recordStatus || '—';

    // ═══ עמודה ימנית — שדות אימות ═══
    let sysOptionsHtml = '';
    payload.bodySystemOptions.forEach(function(opt) {
      const sel = (opt.code === payload.currentSysCode) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    let certOptionsHtml = '<option value="">— בחר —</option>';
    payload.certaintyOptions.forEach(function(opt) {
      const sel = (opt.code === payload.currentCertainty) ? ' selected' : '';
      certOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    let codeFieldsHtml = '';
    ['eventCode', 'specialty', 'severity', 'diagnosis'].forEach(function(key) {
      codeFieldsHtml += renderCodeFieldHtml(payload.fields[key]);
    });

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">תוכן האירוע (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">אבחנה עיקרית</div><div class="field-value">' + esc(payload.primaryDiagnosis) + '</div></div>' +
        '<div class="field-row"><div class="field-label">חומרה</div><div class="field-value">' + esc(payload.severityStatus) + '</div></div>' +
        '<div class="field-row"><div class="field-label">המלצות</div><div class="field-value">' + esc(payload.recommendations) + '</div></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד מערכת גוף</div>' +
        '<select id="sysCodeSelect">' + sysOptionsHtml + '</select>' +
      '</div>' +
      codeFieldsHtml +
      '<div class="section">' +
        '<div class="section-title">וודאות אבחנה</div>' +
        '<select id="certaintySelect">' + certOptionsHtml + '</select>' +
      '</div>';

    // ═══ עמודה שמאלית — Event_Date/Doc_Issuer + תצוגת מסמך מקור ═══
    const previewUrl = payload.sourceUrl ? payload.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = payload.sourceUrl
      ? '<a class="source-link" href="' + payload.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">תאריך</div><div class="field-value">' + esc(payload.eventDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(payload.docIssuer) + '</div></div>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  function prevRow() {
    if (!currentPayload) return;
    const target = currentPayload.row - 1;
    if (target < currentPayload.firstDataRow) return;
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(target);
  }

  function nextRow() {
    if (!currentPayload) return;
    const target = currentPayload.row + 1;
    if (target > currentPayload.lastRow) return;
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(target);
  }

  function doApprove() {
    if (!currentPayload) return;
    const sysCode   = document.getElementById('sysCodeSelect').value;
    const certCode  = document.getElementById('certaintySelect').value;

    const fieldValues = {};
    ['eventCode', 'specialty', 'severity', 'diagnosis'].forEach(function(key) {
      const sel  = document.getElementById('sel_' + key);
      const opt  = sel.options[sel.selectedIndex];
      fieldValues[key] = {
        code: sel.value || '',
        name: (opt && opt.getAttribute('data-name')) || ''
      };
    });

    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s16_approve(currentPayload.row, sysCode, certCode, fieldValues);
  }

  function doSaveCatalogCode(key) {
    if (!currentPayload) return;
    const field   = currentPayload.fields[key];
    const newCode = document.getElementById('newCode_' + key).value.trim();
    const newName = document.getElementById('newName_' + key).value.trim();
    if (!newCode) {
      handleError({ msg: "❌ חסר קוד חדש עבור " + field.label });
      return;
    }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s16_saveCatalogCode(key, field.rawText, newCode, newName);
  }

  function handleResult(result) {
    const el = document.getElementById('statusMsg');
    if (result && result.success) {
      el.className = 'ok';
      el.textContent = result.msg || '✅ בוצע';
      if (currentPayload) {
        google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(currentPayload.row);
      }
    } else {
      el.className = 'error';
      el.textContent = (result && result.msg) || '❌ שגיאה';
    }
  }

  function handleError(err) {
    const el = document.getElementById('statusMsg');
    el.className = 'error';
    el.textContent = (err && err.msg) ? err.msg : '❌ שגיאה לא צפויה';
  }

  initUI();
</script>
</body>
</html>
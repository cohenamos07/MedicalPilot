<!--
  MedicalPilot — S16_Sidebar.html
  @version     1.0.0 | @updated 03/09/2026 19:51 | @service S16
  @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S16_Sidebar.html
  @description ממשק Dialog לאימות קוד מערכת גוף (select סגור, S13_BODY_
               SYSTEMS) וקוד אירוע (מקטלוג מיפוי_קודים, עם מנגנון "קוד
               חדש") עבור שורה בודדת ביומן_מצב_רפואי. מציג את הקוד שGemini/
               S13 כבר קבעו, לאישור או תיקון.
  @impacts     כפתורים: אשר, עדכן קטלוג קוד אירוע, ניווט הקודם/הבא.
               תלוי ב: S16_ValidateMedicalStatus.gs — כל הלוגיקה מתבצעת שם.
  @callers     S16_ValidateMedicalStatus.gs (showS16Sidebar)
  @functions   initUI, render, prevRow, nextRow, doApprove, doSaveEventCode,
               handleResult, handleError
  @changes     [v1.0.0] Task #210 — גרסה ראשונה.
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

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #7E57C2;
    margin-bottom: 8px;
  }

  .field-row {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
  }

  .field-label {
    font-size: 11px;
    color: #666;
    min-width: 90px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .field-value {
    font-size: 13px;
    color: #222;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .edit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
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

  .hint {
    font-size: 11px;
    color: #888;
    margin-top: 4px;
  }

  .source-link {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    color: #7E57C2;
    text-decoration: none;
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

  .btn-approve   { background: #43A047; color: #fff; }
  .btn-savecode  { background: #FB8C00; color: #fff; }
  .btn-nav       { background: #eceff1; color: #333; }
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

  <div class="content" id="content">טוען נתוני שורה…</div>

  <div id="statusMsg"></div>

  <div class="btn-row">
    <button class="btn-nav" onclick="prevRow()">◀ הקודם</button>
    <button class="btn-nav" onclick="nextRow()">הבא ▶</button>
    <div class="spacer"></div>
    <button class="btn-savecode" onclick="doSaveEventCode()">💾 עדכן קטלוג קוד אירוע</button>
    <button class="btn-approve" onclick="doApprove()">✅ אשר</button>
  </div>

<script>
  let currentPayload = null;

  function initUI() {
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowData();
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

    const sourceLink = payload.sourceUrl
      ? '<a class="source-link" href="' + payload.sourceUrl + '" target="_blank">פתח מסמך מקור ↗</a>'
      : '';

    let optionsHtml = '';
    payload.bodySystemOptions.forEach(function(opt) {
      const sel = (opt.code === payload.currentSysCode) ? ' selected' : '';
      optionsHtml += '<option value="' + opt.code + '"' + sel + '>' + opt.code + ' — ' + opt.nameHe + '</option>';
    });

    let suggestionHint = '';
    if (payload.eventSuggestion && payload.eventSuggestion.code !== payload.currentEtCode) {
      suggestionHint = '<div class="hint">הצעה מהקטלוג: ' + payload.eventSuggestion.code +
        (payload.eventSuggestion.name ? ' — ' + payload.eventSuggestion.name : '') + '</div>';
    }

    document.getElementById('content').innerHTML =
      '<div class="section">' +
        '<div class="section-title">נתוני האירוע (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">תאריך</div><div class="field-value">' + esc(payload.eventDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">סוג אירוע</div><div class="field-value">' + esc(payload.eventType) + '</div></div>' +
        '<div class="field-row"><div class="field-label">אבחנה עיקרית</div><div class="field-value">' + esc(payload.primaryDiagnosis) + '</div></div>' +
        '<div class="field-row"><div class="field-label">חומרה</div><div class="field-value">' + esc(payload.severityStatus) + '</div></div>' +
        '<div class="field-row"><div class="field-label">המלצות</div><div class="field-value">' + esc(payload.recommendations) + '</div></div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(payload.docIssuer) + '</div></div>' +
        sourceLink +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">אימות קודים</div>' +
        '<div class="edit-grid">' +
          '<div>' +
            '<label class="edit-label">קוד מערכת גוף</label>' +
            '<select id="sysCodeSelect">' + optionsHtml + '</select>' +
          '</div>' +
          '<div>' +
            '<label class="edit-label">קוד אירוע</label>' +
            '<input type="text" id="etCodeInput" value="' + esc(payload.currentEtCode) + '">' +
            '<label class="edit-label" style="margin-top:6px;">שם מנורמל</label>' +
            '<input type="text" id="etNormInput" value="' + esc(payload.currentEtNorm) + '">' +
            suggestionHint +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function esc(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    const sysCode  = document.getElementById('sysCodeSelect').value;
    const etCode   = document.getElementById('etCodeInput').value.trim();
    const etNorm   = document.getElementById('etNormInput').value.trim();
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s16_approve(currentPayload.row, sysCode, etCode, etNorm);
  }

  function doSaveEventCode() {
    if (!currentPayload) return;
    const etCode = document.getElementById('etCodeInput').value.trim();
    const etNorm = document.getElementById('etNormInput').value.trim();
    if (!currentPayload.eventType || !etCode) {
      handleError({ msg: "❌ חסר סוג אירוע גולמי או קוד לשמירה בקטלוג" });
      return;
    }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s16_saveEventCode(currentPayload.eventType, etCode, etNorm);
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
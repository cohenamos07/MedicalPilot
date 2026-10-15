<!--
  MedicalPilot — S16_Sidebar.html
  @version     2.4.0 | @updated 15/10/2026 22:15 | @service S16
  @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S16_Sidebar.html
  @description ממשק Dialog לאימות כל קודי הסיווג ביומן_מצב_רפואי (21 עמודות):
               קוד מערכת גוף (select סגור), קוד אירוע/התמחות/חומרה/אבחנה
               (קטלוג פתוח משותף — select + הוספת קוד חדש לכל שדה בנפרד),
               וודאות אבחנה (select סגור פשוט). פריסת שתי עמודות כמו
               S10_Sidebar.html: ימין — שדות אימות, שמאל — Event_Date/
               Doc_Issuer + תצוגת מסמך מקור (הוקטן על חשבון המעבר של שני
               השדות האלה לכאן, לפי החלטת 15/09/2026).
               [v2.1.0] select של שדה קטלוג מוצג בקיבוץ היררכי: קוד שקיים
               קוד ארוך ממנו שמתחיל בו (A0-A4 בבלוק אירועים) מוצג ככותרת
               קבוצה שאינה ניתנת לבחירה, וקודי-העלה שלו תחתיה.
               [v2.2.0] שדה בחירה "איבר (אופציונלי)" מתחת לקוד מערכת הגוף —
               תת-קודי איבר (Organ_Code) של המערכת הנבחרת בלבד.
               [v2.3.0] הצעות אוטומטיות מסומנות מראש (כתום, "יש לאמת"),
               שדה המלצה לעריכה בעמודה השמאלית, ותצוגה קומפקטית ללא גלילה.
               [v2.4.0] תגית "🤖 Gemini — לאמת" לקודים שנכתבו ע"י S13 בשורה
               בסטטוס "חדש" (בשורת הכותרת), ו-"+ קוד חדש" גם לוודאות אבחנה.
  @impacts     כפתורים: אשר, הוסף-קוד (4, אחד לכל שדה קטלוג פתוח), ניווט
               הקודם/הבא. תלוי ב: S16_ValidateMedicalStatus.gs — כל
               הלוגיקה מתבצעת שם.
               [v2.1.0] שינוי תצוגה בלבד (renderCodeFieldHtml) — אין שינוי
               בערכים שנשלחים ל-s16_approve ואין שינוי בצד השרת.
               [v2.2.0] s16_approve מקבל פרמטר חמישי — קוד האיבר הנבחר.
               [v2.3.0] s16_approve מקבל פרמטר שישי — המלצה (null אם לא שונתה).
               [v2.4.0] כפתורי הוסף-קוד: 5 (נוספה וודאות — key="certainty").
               אין שינוי בפרמטרים של s16_approve.
  @callers     S16_ValidateMedicalStatus.gs (showS16Sidebar)
  @functions   initUI, render, renderCodeFieldHtml, esc, prevRow, nextRow,
               doApprove, doSaveCatalogCode, handleResult, handleError,
               fillOrganOptions, suggestionHintHtml, toggleNewCode, geminiHintHtml
  @changes     [v2.4.0] Task #220 שלב ב — סימון קודים מ-Gemini + קוד חדש לוודאות.
               geminiHintHtml (חדשה): תגית כתומה "🤖 Gemini — לאמת" (span
               בשורת הכותרת, בלי תוספת גובה) לכל שדה שיש בו קוד כשהרשומה
               בסטטוס "חדש" (payload.recordStatus) — מערכת, קוד אירוע,
               התמחות, חומרה, אבחנה, ודאות; באיבר — בתווית (organGemini)
               רק כל עוד האיבר השמור נבחר ושייך למערכת. רמזי ההצעה הקיימים
               (suggestionHintHtml) נשמרו כחוות דעת שנייה. ודאות: מבנה זהה
               לשדות הקטלוג — section-head עם "+ קוד חדש" ושורת הזנה
               מקופלת (newBox_certainty); doSaveCatalogCode — ברירת מחדל
               לוודאות (תווית קבועה, rawText ריק). אומת מול הקוד החי (diff
               מדויק), בהדמיית דפדפן בגובה 700 (585/585 — ללא גלילה, 6
               תגיות ב"חדש", 0 ב"מאומת"), ובבדיקת שטח: שורה 9 ביומן_מצב_
               רפואי וקוד ניסיון CRT9 שנכתב לקטלוג ונמחק.
  @changes     [v2.3.0] Task #220 שלב א' — הצעות אוטומטיות + המלצה + תצוגה
               קומפקטית. renderCodeFieldHtml: בחירה מראש של field.suggestion
               רק כשאין קוד שמור (selectedCode), כולל קוד כותרת-קטגוריה.
               suggestionHintHtml (חדשה): רמז כתום מודגש "🤖 הוצע אוטומטית —
               יש לאמת (לפי "מילה")" כשנבחר מראש, אחרת רמז אפור "הצעה
               מהקטלוג" (+ טקסט נוסף, למשל איבר ששייך למערכת אחרת). ודאות:
               בחירה מראש של certaintySuggestion כשהשדה ריק. איבר:
               fillOrganOptions מציג organHint; הצעה נבחרת מראש רק כשהיא
               שייכת למערכת הנבחרת (גם אחרי החלפת מערכת). המלצה: textarea
               (recoInput) בעמודה השמאלית מעל תצוגת המסמך — doApprove שולח
               אותה כפרמטר שישי רק אם שונתה (אחרת null). תצוגה: ריווח מצומצם
               (col/section/title/field-row/select), הוסרה התווית "בחירה
               מהקטלוג", שורת "קוד חדש" מוסתרת ונפתחת בקישור "+ קוד חדש"
               ליד כותרת השדה (toggleNewCode, חדשה). גובה העמודה הימנית ירד
               מ-1,133 ל-549 פיקסלים — ללא גלילה. אומת מול הקוד החי (diff
               מדויק), בסימולציית דפדפן, ובבדיקת שטח על שורות 7-8 ביומן_מצב_
               רפואי (בחירה מראש של איבר, רמז מערכת אחרת, כתיבת המלצה, תצוגה
               ללא גלילה).
  @changes     [v2.2.0] Task #219 — קוד איבר: render מוסיף select
               organSelect מתחת ל-sysCodeSelect, ממולא ע"י fillOrganOptions
               (חדשה) מתוך payload.organOptions — רק איברים שה-systemCode
               שלהם = המערכת הנבחרת, עם "— ללא איבר —" כברירת מחדל, ובחירה
               מוקדמת לפי currentOrganCode. שינוי מערכת (onchange) ממלא מחדש
               את הרשימה; איבר שלא שייך למערכת החדשה מתאפס. doApprove שולח
               organCode כפרמטר חמישי ל-s16_approve. אומת מול הקוד החי (diff
               מדויק) ובסימולציית דפדפן (סינון, איפוס, שליחה), ובבדיקת שטח:
               שורה 6 → V6 = SYS12A.
  @changes     [v2.1.0] Task #216 — renderCodeFieldHtml: ה-select של "קוד
               אירוע" הציג 41 שורות מעורבבות (5 כותרות קטגוריה A0-A4 לצד
               קודי-העלה) בלי הבחנה, עם סיכון לבחירת קטגוריה כקוד. כעת: קוד
               שקיים קוד ארוך ממנו שמתחיל בו = כותרת קטגוריה → optgroup
               (לא ניתן לבחירה), קודי-העלה שלו מוצגים תחתיו. קוד עצמאי (A5)
               ובלוקים שטוחים (התמחות/חומרה/אבחנה) — אפשרויות רגילות, ללא
               שינוי. כלל הזיהוי לפי קידומת ולא לפי Raw_Value ריק (רוב
               קודי-העלה בקטלוג ללא Raw_Value). מקרה קצה: קוד כותרת שכבר
               שמור בשורה מוצג גם כאפשרות רגילה, כדי שלא יימחק בשקט באישור.
               אומת מול הקוד החי (diff מדויק, node --check) ובבדיקת שטח על
               שורות 5-6 ביומן_מצב_רפואי (אישור וכתיבת קודים תקינים).
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
    padding: 6px 10px;
    overflow-y: auto;
    display: flex; flex-direction: column;
    gap: 6px; min-height: 0;
  }

  .col-right { border-left: 1px solid #e0e0e0; }

  .section {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 6px 10px;
    flex-shrink: 0;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #7E57C2;
    margin-bottom: 4px;
  }

  /* [Task #220] כותרת שדה + קישור "+ קוד חדש" באותה שורה */
  .section-head { display: flex; justify-content: space-between; align-items: baseline; }
  .link-new {
    background: none; border: none; color: #1976d2;
    font-size: 11px; cursor: pointer; padding: 0;
  }

  .field-row { display: flex; gap: 10px; margin-bottom: 3px; }

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
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
  }

  .hint { font-size: 11px; color: #888; margin-top: 4px; }

  .new-code-box {
    display: none;
    gap: 6px;
    margin-top: 6px;
    align-items: flex-end;
  }
  .new-code-box.open { display: flex; }

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
  // [Task #216] קיבוץ היררכי: קוד שקיים קוד ארוך ממנו שמתחיל בו (למשל A0 מול
  // A0A) הוא כותרת קטגוריה — מוצג ככותרת קבוצה שאי אפשר לבחור בה, והקודים
  // שמתחילים בו מוצגים תחתיה. קוד בלי קבוצה (למשל A5, וכל הבלוקים השטוחים —
  // התמחות/חומרה/אבחנה) מוצג כאפשרות רגילה. אם בשורה כבר שמור קוד של כותרת —
  // הוא מוצג גם כאפשרות רגילה, כדי שלא יימחק בשקט באישור.
  function renderCodeFieldHtml(field) {
    const allCodes = field.options.map(function(o) { return o.code; });

    const isCategory = {};
    allCodes.forEach(function(code) {
      isCategory[code] = allCodes.some(function(other) {
        return other.length > code.length && other.indexOf(code) === 0;
      });
    });

    const parentOf = {};
    allCodes.forEach(function(code) {
      let parent = '';
      allCodes.forEach(function(cand) {
        if (isCategory[cand] && cand !== code && code.indexOf(cand) === 0 && cand.length > parent.length) {
          parent = cand;
        }
      });
      if (parent) parentOf[code] = parent;
    });

    // [Task #220] בחירה מראש של ההצעה רק כשאין קוד שמור בשורה
    const preselect    = !field.currentCode && !!field.suggestion;
    const selectedCode = field.currentCode || (preselect ? field.suggestion.code : '');

    function optionHtml(opt) {
      const sel = (opt.code === selectedCode) ? ' selected' : '';
      return '<option value="' + esc(opt.code) + '" data-name="' + esc(opt.name) + '"' + sel + '>' +
        esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    }

    let optionsHtml = '<option value="">— בחר —</option>';
    field.options.forEach(function(opt) {
      if (parentOf[opt.code]) return;
      if (isCategory[opt.code]) {
        if (opt.code === selectedCode) optionsHtml += optionHtml(opt);
        let groupHtml = '';
        field.options.forEach(function(child) {
          if (parentOf[child.code] === opt.code) groupHtml += optionHtml(child);
        });
        optionsHtml += '<optgroup label="' + esc(opt.code) + ' — ' + esc(opt.name) + '">' + groupHtml + '</optgroup>';
        return;
      }
      optionsHtml += optionHtml(opt);
    });

    const hintHtml = suggestionHintHtml(field.suggestion, preselect);

    return (
      '<div class="section" data-field-key="' + field.key + '">' +
        '<div class="section-head">' +
          // [Task #220 שלב ב] קוד שנכתב ע"י S13 בשורה "חדש" — תגית כתומה בשורת הכותרת (בלי גובה נוסף)
          '<div class="section-title">' + esc(field.label) + geminiHintHtml(!!field.currentCode) + '</div>' +
          '<button type="button" class="link-new" onclick="toggleNewCode(\'' + field.key + '\')">+ קוד חדש</button>' +
        '</div>' +
        '<select id="sel_' + field.key + '">' + optionsHtml + '</select>' +
        hintHtml +
        '<div class="new-code-box" id="newBox_' + field.key + '">' +
          '<div><label class="edit-label">קוד חדש</label><input type="text" id="newCode_' + field.key + '"></div>' +
          '<div><label class="edit-label">שם מנורמל</label><input type="text" id="newName_' + field.key + '"></div>' +
          '<button type="button" class="btn-add" onclick="doSaveCatalogCode(\'' + field.key + '\')">+ הוסף</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ════ [Task #220] פתיחה/סגירה של שורת "קוד חדש" בשדה קטלוג ════
  function toggleNewCode(key) {
    document.getElementById('newBox_' + key).classList.toggle('open');
  }

  // ════ [Task #220] רמז הצעה: מסומנת מראש (כתום) או הצעה לשדה עם קוד קיים ════
  function suggestionHintHtml(sugg, preselected, extraText) {
    if (!sugg) return '';
    const byKeyword = sugg.keyword ? ' (לפי "' + esc(sugg.keyword) + '")' : '';
    if (preselected) {
      return '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הוצע אוטומטית — יש לאמת' + byKeyword + '</div>';
    }
    return '<div class="hint">הצעה מהקטלוג: ' + esc(sugg.code) + (sugg.name ? ' — ' + esc(sugg.name) : '') +
      byKeyword + (extraText ? ' — ' + esc(extraText) : '') + '</div>';
  }

  // ════ [Task #220 שלב ב] תגית לקוד שהוצע ע"י Gemini (S13) — רק בשורה בסטטוס "חדש" ════
  // מוצגת באותה שורה עם כותרת השדה (span) — לא מוסיפה גובה לחלון
  function geminiHintHtml(hasCode) {
    if (!hasCode || !currentPayload || currentPayload.recordStatus !== 'חדש') return '';
    return '<span style="color:#e65100; font-weight:bold; font-size:11px; margin-right:8px;">🤖 Gemini — לאמת</span>';
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

    // [Task #220] ודאות — בחירה מראש של ההצעה רק כשהשדה ריק
    const certPreselect = !payload.currentCertainty && !!payload.certaintySuggestion;
    const certSelected  = payload.currentCertainty || (certPreselect ? payload.certaintySuggestion.code : '');
    let certOptionsHtml = '<option value="">— בחר —</option>';
    payload.certaintyOptions.forEach(function(opt) {
      const sel = (opt.code === certSelected) ? ' selected' : '';
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
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד מערכת גוף' + geminiHintHtml(!!payload.currentSysCode) + '</div>' +
        '<select id="sysCodeSelect">' + sysOptionsHtml + '</select>' +
        '<label class="edit-label">איבר (אופציונלי)<span id="organGemini"></span></label>' +
        '<select id="organSelect"></select>' +
        '<div id="organHint"></div>' +
      '</div>' +
      codeFieldsHtml +
      // [Task #220 שלב ב] וודאות — "+ קוד חדש" בשורת הכותרת, שורת ההזנה מקופלת (כמו שדות הקטלוג)
      '<div class="section" data-field-key="certainty">' +
        '<div class="section-head">' +
          '<div class="section-title">וודאות אבחנה' + geminiHintHtml(!!payload.currentCertainty) + '</div>' +
          '<button type="button" class="link-new" onclick="toggleNewCode(\'certainty\')">+ קוד חדש</button>' +
        '</div>' +
        '<select id="certaintySelect">' + certOptionsHtml + '</select>' +
        suggestionHintHtml(payload.certaintySuggestion, certPreselect) +
        '<div class="new-code-box" id="newBox_certainty">' +
          '<div><label class="edit-label">קוד חדש</label><input type="text" id="newCode_certainty"></div>' +
          '<div><label class="edit-label">שם מנורמל</label><input type="text" id="newName_certainty"></div>' +
          '<button type="button" class="btn-add" onclick="doSaveCatalogCode(\'certainty\')">+ הוסף</button>' +
        '</div>' +
      '</div>';

    // [Task #219] רשימת האיברים מסוננת לפי המערכת שנבחרה, ומתעדכנת בכל
    // שינוי מערכת (איבר שלא שייך למערכת החדשה מתאפס ל"ללא איבר").
    // [Task #220] הצעת איבר נבחרת מראש רק כשאין איבר שמור והיא שייכת למערכת
    const organSugg = payload.organSuggestion;
    fillOrganOptions(payload.currentSysCode, payload.currentOrganCode ||
      (organSugg && organSugg.systemCode === payload.currentSysCode ? organSugg.code : ''));
    document.getElementById('sysCodeSelect').onchange = function() {
      const keep = document.getElementById('organSelect').value;
      fillOrganOptions(this.value, keep ||
        (organSugg && !payload.currentOrganCode && organSugg.systemCode === this.value ? organSugg.code : ''));
    };

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
      // [Task #220] המלצה — בעמודה השמאלית, מעל תצוגת המסמך (נשמרת ב"אשר" רק אם שונתה)
      '<div class="section">' +
        '<div class="section-title">המלצה <span style="font-weight:normal; color:#888; font-size:11px;">— נשמרת באישור רק אם שונתה</span></div>' +
        '<textarea id="recoInput" rows="3" style="width:100%; padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; font-family:inherit; resize:vertical;">' +
          esc(payload.recommendations) + '</textarea>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #219] מילוי רשימת האיברים של המערכת הנבחרת ════
  function fillOrganOptions(systemCode, selectedCode) {
    let html = '<option value="">— ללא איבר —</option>';
    (currentPayload.organOptions || []).forEach(function(opt) {
      if (opt.systemCode !== systemCode) return;
      const sel = (opt.code === selectedCode) ? ' selected' : '';
      html += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });
    document.getElementById('organSelect').innerHTML = html;

    // [Task #220] רמז הצעת איבר — מסומן מראש / הצעה / שייך למערכת אחרת
    const sugg = currentPayload.organSuggestion;
    // [Task #220 שלב ב] איבר שנכתב ע"י S13 — תגית כתומה בתווית האיבר, כל עוד הוא האיבר הנבחר
    const savedOrgan = currentPayload.currentOrganCode;
    document.getElementById('organGemini').innerHTML =
      (savedOrgan && selectedCode === savedOrgan && savedOrgan.indexOf(systemCode) === 0) ? geminiHintHtml(true) : '';
    let hint = '';
    if (sugg) {
      if (sugg.systemCode !== systemCode) {
        hint += suggestionHintHtml(sugg, false, 'שייך למערכת ' + sugg.systemCode + ', יש לבחור אותה קודם');
      } else {
        hint += suggestionHintHtml(sugg, !currentPayload.currentOrganCode && selectedCode === sugg.code);
      }
    }
    document.getElementById('organHint').innerHTML = hint;
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
    const organCode = document.getElementById('organSelect').value;
    // [Task #220] המלצה נשלחת רק אם שונתה בחלון (אחרת null — לא נכתבת)
    const recoValue = document.getElementById('recoInput').value;
    const recoToSend = (recoValue.trim() !== (currentPayload.recommendations || '').trim()) ? recoValue : null;

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
      .s16_approve(currentPayload.row, sysCode, certCode, fieldValues, organCode, recoToSend);
  }

   function doSaveCatalogCode(key) {
    if (!currentPayload) return;
    // [Task #220 שלב ב] וודאות אינה ב-fields — תווית קבועה וללא טקסט גולמי (לא נשמרות מילות מפתח)
    const field   = currentPayload.fields[key] || { label: 'וודאות אבחנה', rawText: '' };
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
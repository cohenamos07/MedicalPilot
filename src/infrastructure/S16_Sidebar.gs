<!--
  MedicalPilot — S16_Sidebar.html
  @version     2.7.0 | @updated 28/10/2026 19:45 | @service S16
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
               [v2.5.0] שני select זה לצד זה מתחת לאיבר — "מצב האיבר" ו"צד" —
               רק בשורת ניתוח או כשכבר שמור ערך (payload.organState.show).
               [v2.6.0] מצב תרופות (payload.mode="medication", מ-S15): אותו
               חלון מציג שורה מגליון תרופות_קבועות — נתוני המסמך (תצוגה), קוד
               ATC + נתוני קטלוג (נעולים כשהקוד מאומת), מינון ותדירות, סוג
               טיפול (חובה) וסיבה; שמאל — מטא-דאטה ותצוגת מסמך מקור.
               [v2.7.0] מצב הנחיות (payload.mode="instruction", מ-S15): אותו
               חלון מציג שורה מגליון הנחיות_רפואיות_ומשימות — ההנחיה במסמך
               (תצוגה), סוג (רשימה סגורה, בלי "+ קוד חדש"), אופי, קוד יעד
               (התמחויות / תרופות), מערכת גוף, סטטוס ותאריך יעד; שמאל —
               מטא-דאטה ותצוגת מסמך מקור.
  @impacts     כפתורים: אשר, הוסף-קוד (4, אחד לכל שדה קטלוג פתוח), ניווט
               הקודם/הבא. תלוי ב: S16_ValidateMedicalStatus.gs — כל
               הלוגיקה מתבצעת שם.
               [v2.1.0] שינוי תצוגה בלבד (renderCodeFieldHtml) — אין שינוי
               בערכים שנשלחים ל-s16_approve ואין שינוי בצד השרת.
               [v2.2.0] s16_approve מקבל פרמטר חמישי — קוד האיבר הנבחר.
               [v2.3.0] s16_approve מקבל פרמטר שישי — המלצה (null אם לא שונתה).
               [v2.4.0] כפתורי הוסף-קוד: 5 (נוספה וודאות — key="certainty").
               אין שינוי בפרמטרים של s16_approve.
               [v2.5.0] s16_approve מקבל פרמטרים 7-8 — מצב וצד איבר (null אם
               השדות לא הוצגו בחלון — לא נכתבים בצד השרת).
               [v2.6.0] במצב תרופות: ניווט וטעינה מחדש — s15_loadRowByNumber,
               אישור — s15_approve(row, v) עם 11 שדות (S15_EnrichCatalog.gs).
               מצב המצב הרפואי — ללא שינוי (s16_loadRowByNumber / s16_approve).
               [v2.7.0] במצב הנחיות: ניווט וטעינה מחדש — s15_instrLoadRowByNumber,
               אישור — s15_instrApprove(row, v) עם 6 שדות (S15_EnrichCatalog.gs).
               מצב התרופות ומצב המצב הרפואי — ללא שינוי.
  @callers     S16_ValidateMedicalStatus.gs (showS16Sidebar)
               S15_EnrichCatalog.gs (s15_showValidation — מצב תרופות)
               S15_EnrichCatalog.gs (s15_showValidation — מצב הנחיות, [v2.7.0])
  @functions   initUI, render, renderCodeFieldHtml, esc, prevRow, nextRow,
               doApprove, doSaveCatalogCode, handleResult, handleError,
               fillOrganOptions, suggestionHintHtml, toggleNewCode, geminiHintHtml,
               organStateHtml, renderMedication, doApproveMedication,
               renderInstruction, updateInstrKindHint, doApproveInstruction
  @changes     [v2.7.0] Task #261 שלב 4 — מצב הנחיות בחלון הקיים (בלי חלון
               חדש). render: מעבר ל-renderInstruction כש-payload.mode=
               "instruction". renderInstruction (חדשה): כותרת "📋 S15 — אימות
               הנחיות", שורה + תיאור, תג Enrich_Status, רמז כתום "הוצע בהעשרה —
               יש לאמת", קוד יעד בקבוצות (optgroup). updateInstrKindHint (חדשה):
               ברירת המחדל של האופי לפי הסוג. doApproveInstruction (חדשה): בדיקת
               שדות חובה ושליחה ל-s15_instrApprove. prevRow/nextRow/handleResult —
               טעינה דרך s15_instrLoadRowByNumber; doApprove — מעבר
               ל-doApproveInstruction. אומת מול הקוד החי (diff, בדיקת תחביר
               לסקריפט), בהדמיה, ובבדיקת שטח: שורות 6 ו-8 אושרו, תאריך שגוי
               נדחה, חלונות התרופות והמצב הרפואי ללא שינוי.
  @changes     [v2.6.0] Task #256 שלב 4 — מצב תרופות בחלון הקיים (בלי חלון
               חדש). render: אחרי שמירת currentPayload — מעבר ל-renderMedication
               כש-payload.mode="medication". renderMedication (חדשה): כותרת
               "💊 S15 — אימות תרופות", שורה + שם התרופה, תג Enrich_Status;
               מקור הקוד — מאומת (ירוק, שדות קטלוג נעולים) / הצעת Gemini
               (כתום) / ללא הצעה; סוג טיפול — הצעה נבחרת מראש רק כשהשדה ריק.
               doApproveMedication (חדשה): בדיקת סוג טיפול בצד הלקוח ושליחה
               ל-s15_approve. prevRow/nextRow/handleResult — טעינה דרך S15
               במצב תרופות; doApprove — מעבר ל-doApproveMedication. אומת מול
               הקוד החי (diff מדויק, בדיקת תחביר לסקריפט), בהדמיית דפדפן בגובה
               700 (583/583 — ללא גלילה), ובבדיקת שטח: תרופות_קבועות שורה 5
               אושרה (D07AC13, "לפי הצורך"), מעבר לשורה 6, ומסך יומן_מצב_רפואי
               שורה 7 ללא שינוי.
  @changes     [v2.5.0] Task #224 (שלב 3) — מצב וצד איבר אחרי ניתוח.
               organStateHtml (חדשה): שני select סגורים ("— לא צוין —" +
               אפשרויות הקטלוג) בשורה אחת (flex) מתחת ל-organHint, בתוך מקטע
               קוד מערכת הגוף — בלי תוספת גלילה. הצעה נבחרת מראש רק כשהשדה ריק
               (suggestionHintHtml הקיימת); סתירת צד (sideConflict) — אזהרה
               אדומה "בטקסט מופיעים גם X וגם Y — יש לבדוק במסמך המקור", בלי
               הצעה. render: קריאה אחת ל-organStateHtml. doApprove: קורא את
               organStateSelect/organSideSelect אם קיימים (אחרת null) ושולח
               כפרמטרים 7-8. אומת מול הקוד החי (diff מדויק לכל בלוק, node
               --check על בלוק הסקריפט), בסימולציה של מקרה סתירת צד, ובבדיקת
               שטח: שורה 8 — ללא שדות; שורה 12 (ניתוח) — השדות הוצגו, באישור
               נכתבו OST1/LAT2.
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

    // ════ [Task #224] מצב וצד איבר — רק בשורת ניתוח או כשכבר שמור ערך ════
  // שני select סגורים זה לצד זה (שורה אחת — בלי גלילה נוספת). הצעה נבחרת
  // מראש רק כשהשדה ריק. סתירת צד בטקסט — בלי הצעה, אזהרה אדומה.
  function organStateHtml(os) {
    if (!os || !os.show) return '';
    function selectHtml(id, options, current, sugg) {
      const pre      = !current && !!sugg;
      const selected = current || (pre ? sugg.code : '');
      let h = '<select id="' + id + '"><option value="">— לא צוין —</option>';
      (options || []).forEach(function(opt) {
        const sel = (opt.code === selected) ? ' selected' : '';
        h += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
      });
      return { html: h + '</select>', pre: pre };
    }
    const st = selectHtml('organStateSelect', os.stateOptions, os.currentState, os.stateSuggestion);
    const sd = selectHtml('organSideSelect',  os.sideOptions,  os.currentSide,  os.sideSuggestion);
    const sideNote = os.sideConflict
      ? '<div class="hint" style="color:#c62828; font-weight:bold;">⚠️ בטקסט מופיעים גם ' + esc(os.sideConflict.join(' וגם ')) + ' — יש לבדוק במסמך המקור</div>'
      : suggestionHintHtml(os.sideSuggestion, sd.pre);
    return '<div style="display:flex; gap:8px;">' +
        '<div style="flex:1; min-width:0;"><label class="edit-label">מצב האיבר</label>' + st.html +
          suggestionHintHtml(os.stateSuggestion, st.pre) + '</div>' +
        '<div style="flex:1; min-width:0;"><label class="edit-label">צד</label>' + sd.html + sideNote + '</div>' +
      '</div>';
  }

        function render(payload) {
    if (!payload || payload.error) {
      handleError(payload || { msg: "שגיאה בטעינה" });
      return;
    }
    currentPayload = payload;
    // [Task #256 שלב 4] מצב תרופות — payload מ-S15 (s15_showValidation / s15_loadRowByNumber)
    if (payload.mode === 'medication') { renderMedication(payload); return; }
    // [Task #261 שלב 4] מצב הנחיות — payload מ-S15 (s15_showValidation / s15_instrLoadRowByNumber)
    if (payload.mode === 'instruction') { renderInstruction(payload); return; }

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
        organStateHtml(payload.organState) + // [Task #224]
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
    // [Task #256 שלב 4] מצב תרופות — טעינה דרך S15
    if (currentPayload.mode === 'medication') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_loadRowByNumber(target);
      return;
    }
    // [Task #261 שלב 4] מצב הנחיות — טעינה דרך S15
    if (currentPayload.mode === 'instruction') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_instrLoadRowByNumber(target);
      return;
    }
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(target);
  }

  function nextRow() {
    if (!currentPayload) return;
    const target = currentPayload.row + 1;
    if (target > currentPayload.lastRow) return;
    // [Task #256 שלב 4] מצב תרופות — טעינה דרך S15
    if (currentPayload.mode === 'medication') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_loadRowByNumber(target);
      return;
    }
    // [Task #261 שלב 4] מצב הנחיות — טעינה דרך S15
    if (currentPayload.mode === 'instruction') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_instrLoadRowByNumber(target);
      return;
    }
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(target);
  }

    function doApprove() {
    if (!currentPayload) return;
    // [Task #256 שלב 4] מצב תרופות — אישור דרך S15
    if (currentPayload.mode === 'medication') { doApproveMedication(); return; }
    // [Task #261 שלב 4] מצב הנחיות — אישור דרך S15
    if (currentPayload.mode === 'instruction') { doApproveInstruction(); return; }
    const sysCode   = document.getElementById('sysCodeSelect').value;
    const certCode  = document.getElementById('certaintySelect').value;
    const organCode = document.getElementById('organSelect').value;
    // [Task #220] המלצה נשלחת רק אם שונתה בחלון (אחרת null — לא נכתבת)
    const recoValue = document.getElementById('recoInput').value;
    const recoToSend = (recoValue.trim() !== (currentPayload.recommendations || '').trim()) ? recoValue : null;
    // [Task #224] מצב וצד איבר — נשלחים רק אם השדות הוצגו בחלון (אחרת null — לא נכתבים)
    const stateSel   = document.getElementById('organStateSelect');
    const sideSel    = document.getElementById('organSideSelect');
    const organState = stateSel ? stateSel.value : null;
    const organSide  = sideSel  ? sideSel.value  : null;

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
      .s16_approve(currentPayload.row, sysCode, certCode, fieldValues, organCode, recoToSend, organState, organSide);
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
        // [Task #256 שלב 4] מצב תרופות — טעינה מחדש דרך S15
        if (currentPayload.mode === 'medication') {
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_loadRowByNumber(currentPayload.row);
        } else if (currentPayload.mode === 'instruction') {
          // [Task #261 שלב 4] מצב הנחיות — טעינה מחדש דרך S15
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_instrLoadRowByNumber(currentPayload.row);
        } else {
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(currentPayload.row);
        }
      }
    } else {
      el.className = 'error';
      el.textContent = (result && result.msg) || '❌ שגיאה';
    }
  }

  // ════ [Task #256 שלב 4] מצב תרופות — תצוגת שורה מגליון תרופות_קבועות ════
  // ימין: נתוני המסמך (תצוגה), קוד ATC + נתוני קטלוג, מינון ותדירות, סוג
  // טיפול, סיבה. שמאל: מטא-דאטה ותצוגת מסמך מקור. קוד מאומת בקטלוג — שדות
  // הקטלוג נעולים (בצד השרת נתוני הקטלוג גוברים בכל מקרה).
  function renderMedication(p) {
    document.querySelector('.header-title').textContent = '💊 S15 — אימות תרופות';
    document.getElementById('rowMeta').textContent =
      'שורה ' + p.row + ' מתוך ' + p.lastRow + ' — ' + p.drugName;
    document.getElementById('statusBadge').textContent = p.enrichStatus || '—';

    const verified = p.catalogSource === 'verified';
    const lock     = verified ? ' disabled' : '';
    let sourceHint;
    if (verified) {
      sourceHint = '<div class="hint" style="color:#2e7d32; font-weight:bold;">✅ קוד מאומת בקטלוג — נתוני הקטלוג נעולים</div>';
    } else if (p.catalogSource === 'suggested') {
      sourceHint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הצעת Gemini — יש לאמת קוד ונתוני קטלוג</div>';
    } else {
      sourceHint = '<div class="hint">אין הצעה בקטלוג — ניתן להזין קוד ידנית או להשאיר ריק</div>';
    }

    let sysOptionsHtml = '<option value="">— ללא —</option>';
    (p.bodySystemOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.catalog.system) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    // סוג טיפול — הצעה נבחרת מראש רק כשהשדה ריק
    const typePre      = !p.treatmentType && !!p.treatmentTypeSuggestion;
    const typeSelected = p.treatmentType || (typePre ? p.treatmentTypeSuggestion : '');
    let typeOptionsHtml = '<option value="">— בחר —</option>';
    (p.treatmentTypes || []).forEach(function(t) {
      const sel = (t === typeSelected) ? ' selected' : '';
      typeOptionsHtml += '<option value="' + esc(t) + '"' + sel + '>' + esc(t) + '</option>';
    });
    let typeHint = '';
    if (typePre) {
      typeHint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הוצע אוטומטית — יש לאמת</div>';
    } else if (p.treatmentTypeSuggestion && p.treatmentTypeSuggestion !== p.treatmentType) {
      typeHint = '<div class="hint">הצעה לפי תאריך הסיום והתדירות: ' + esc(p.treatmentTypeSuggestion) + '</div>';
    }

    function inputHtml(id, label, value, extra) {
      return '<div style="flex:1; min-width:0;"><label class="edit-label">' + label + '</label>' +
        '<input type="text" id="' + id + '" value="' + esc(value) + '"' + (extra || '') + '></div>';
    }

    const dates = (p.startDate ? 'מ-' + p.startDate : '') + (p.endDate ? ' עד ' + p.endDate : '');

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">התרופה במסמך (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">שם התרופה</div><div class="field-value">' + esc(p.drugName) + '</div></div>' +
        '<div class="field-row"><div class="field-label">מינון</div><div class="field-value">' + esc(p.dosageText) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תדירות</div><div class="field-value">' + esc(p.frequencyText) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריכים</div><div class="field-value">' + esc(dates) + '</div></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד ATC וקטלוג</div>' +
        '<div style="display:flex; gap:8px;">' +
          inputHtml('medCode', 'קוד ATC (7 תווים)', p.code, ' maxlength="7" style="text-transform:uppercase;"') +
          inputHtml('medActive', 'חומר פעיל', p.catalog.name, lock) +
        '</div>' +
        sourceHint +
        '<div style="display:flex; gap:8px; margin-top:4px;">' +
          inputHtml('medGroup', 'קבוצה טיפולית', p.catalog.desc, lock) +
          '<div style="flex:1; min-width:0;"><label class="edit-label">מערכת גוף</label>' +
            '<select id="medSystem"' + lock + '>' + sysOptionsHtml + '</select></div>' +
        '</div>' +
        '<div style="margin-top:4px;">' + inputHtml('medTradeNames', 'שמות מסחריים (מופרדים בפסיק)', p.catalog.raw, lock) + '</div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">מינון ותדירות</div>' +
        '<div style="display:flex; gap:8px;">' +
          inputHtml('medDoseAmount', 'כמות', p.doseAmount) +
          inputHtml('medDoseUnit', 'יחידה', p.doseUnit) +
          inputHtml('medTimesPerDay', 'פעמים ביום', p.timesPerDay) +
          inputHtml('medDaysPerWeek', 'ימים בשבוע', p.daysPerWeek) +
        '</div>' +
      '</div>' +
      '<div class="section">' +
        '<div style="display:flex; gap:8px;">' +
          '<div style="flex:1; min-width:0;"><label class="edit-label">סוג טיפול (חובה)</label>' +
            '<select id="medTreatmentType">' + typeOptionsHtml + '</select>' + typeHint + '</div>' +
          inputHtml('medReason', 'סיבת הטיפול', p.reason) +
        '</div>' +
      '</div>';

    const previewUrl = p.sourceUrl ? p.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = p.sourceUrl
      ? '<a class="source-link" href="' + p.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(p.docIssuer) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך התחלה</div><div class="field-value">' + esc(p.startDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך סיום</div><div class="field-value">' + esc(p.endDate || '—') + '</div></div>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #256 שלב 4] אישור שורת תרופה — s15_approve (S15_EnrichCatalog.gs) ════
  function doApproveMedication() {
    function val(id) { return document.getElementById(id).value.trim(); }
    const v = {
      code:             val('medCode').toUpperCase(),
      activeIngredient: val('medActive'),
      therapeuticGroup: val('medGroup'),
      medicalSystem:    document.getElementById('medSystem').value,
      tradeNames:       val('medTradeNames'),
      doseAmount:       val('medDoseAmount'),
      doseUnit:         val('medDoseUnit'),
      timesPerDay:      val('medTimesPerDay'),
      daysPerWeek:      val('medDaysPerWeek'),
      reason:           val('medReason'),
      treatmentType:    document.getElementById('medTreatmentType').value
    };
    if (!v.treatmentType) {
      handleError({ msg: "❌ יש לבחור סוג טיפול (כרוני / זמני / לפי הצורך)" });
      return;
    }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s15_approve(currentPayload.row, v);
  }

    // ════ [Task #261 שלב 4] מצב הנחיות — תצוגת שורה מגליון הנחיות_רפואיות_ומשימות ════
  // ימין: ההנחיה במסמך (תצוגה), סוג (רשימה סגורה), אופי, קוד יעד, מערכת גוף,
  // סטטוס ותאריך יעד. שמאל: מטא-דאטה ותצוגת מסמך מקור. אין "+ קוד חדש".
  function renderInstruction(p) {
    document.querySelector('.header-title').textContent = '📋 S15 — אימות הנחיות';
    document.getElementById('rowMeta').textContent =
      'שורה ' + p.row + ' מתוך ' + p.lastRow + ' — ' + p.text;
    document.getElementById('statusBadge').textContent = p.enrichStatus || '—';

    const suggested  = p.enrichStatus === 'הוצע';
    const suggHint   = suggested
      ? '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הוצע בהעשרה — יש לאמת</div>'
      : '';

    let typeOptionsHtml = '<option value="">— בחר —</option>';
    (p.typeOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.code) ? ' selected' : '';
      typeOptionsHtml += '<option value="' + esc(opt.code) + '" data-kind="' + esc(opt.defaultKind) + '"' + sel + '>' +
        esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    let kindOptionsHtml = '<option value="">— בחר —</option>';
    (p.kinds || []).forEach(function(k) {
      const sel = (k === p.kind) ? ' selected' : '';
      kindOptionsHtml += '<option value="' + esc(k) + '"' + sel + '>' + esc(k) + '</option>';
    });

    let targetOptionsHtml = '<option value="">— ללא יעד —</option>';
    (p.targetGroups || []).forEach(function(g) {
      targetOptionsHtml += '<optgroup label="' + esc(g.label) + '">';
      g.options.forEach(function(opt) {
        const sel = (opt.code === p.target) ? ' selected' : '';
        targetOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
      });
      targetOptionsHtml += '</optgroup>';
    });

    let sysOptionsHtml = '<option value="">— ללא —</option>';
    (p.bodySystemOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.medicalSystem) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    let statusOptionsHtml = '<option value="">— בחר —</option>';
    (p.statuses || []).forEach(function(s) {
      const sel = (s === p.status) ? ' selected' : '';
      statusOptionsHtml += '<option value="' + esc(s) + '"' + sel + '>' + esc(s) + '</option>';
    });

    function selectBox(id, label, optionsHtml, extra) {
      return '<div style="flex:1; min-width:0;"><label class="edit-label">' + label + '</label>' +
        '<select id="' + id + '"' + (extra || '') + '>' + optionsHtml + '</select></div>';
    }

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">ההנחיה במסמך (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">תיאור</div><div class="field-value">' + esc(p.text) + '</div></div>' +
        '<div class="field-row"><div class="field-label">סוג מהחילוץ</div><div class="field-value">' + esc(p.rawType) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך ההנחיה</div><div class="field-value">' + esc(p.instructionDate) + '</div></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">סיווג ההנחיה</div>' +
        '<div style="display:flex; gap:8px;">' +
          selectBox('instrCode', 'סוג ההנחיה (רשימה סגורה)', typeOptionsHtml, ' onchange="updateInstrKindHint()"') +
          selectBox('instrKind', 'אופי', kindOptionsHtml, ' onchange="updateInstrKindHint()"') +
        '</div>' +
        '<div id="instrKindHint"></div>' +
        suggHint +
        '<div style="display:flex; gap:8px; margin-top:4px;">' +
          selectBox('instrTarget', 'קוד יעד (אופציונלי)', targetOptionsHtml) +
          selectBox('instrSystem', 'מערכת גוף', sysOptionsHtml) +
        '</div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">מחזור חיים</div>' +
        '<div style="display:flex; gap:8px;">' +
          selectBox('instrStatus', 'סטטוס (חובה)', statusOptionsHtml) +
          '<div style="flex:1; min-width:0;"><label class="edit-label">תאריך יעד (DD/MM/YYYY או ריק)</label>' +
            '<input type="text" id="instrDue" value="' + esc(p.dueDate) + '" placeholder="DD/MM/YYYY"></div>' +
        '</div>' +
      '</div>';

    updateInstrKindHint();

    const previewUrl = p.sourceUrl ? p.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = p.sourceUrl
      ? '<a class="source-link" href="' + p.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(p.docIssuer) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך ההנחיה</div><div class="field-value">' + esc(p.instructionDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך יעד</div><div class="field-value">' + esc(p.dueDate || '—') + '</div></div>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #261 שלב 4] רמז ברירת המחדל של האופי לפי הסוג שנבחר ════
  function updateInstrKindHint() {
    const codeSel = document.getElementById('instrCode');
    const kindSel = document.getElementById('instrKind');
    const hintEl  = document.getElementById('instrKindHint');
    if (!codeSel || !kindSel || !hintEl) return;
    const opt = codeSel.options[codeSel.selectedIndex];
    const def = (opt && opt.getAttribute('data-kind')) || '';
    if (!def) { hintEl.innerHTML = ''; return; }
    hintEl.innerHTML = (kindSel.value && kindSel.value !== def)
      ? '<div class="hint">ברירת המחדל לסוג זה: ' + esc(def) + '</div>'
      : '';
  }

  // ════ [Task #261 שלב 4] אישור שורת הנחיה — s15_instrApprove (S15_EnrichCatalog.gs) ════
  function doApproveInstruction() {
    const v = {
      code:          document.getElementById('instrCode').value,
      kind:          document.getElementById('instrKind').value,
      target:        document.getElementById('instrTarget').value,
      medicalSystem: document.getElementById('instrSystem').value,
      status:        document.getElementById('instrStatus').value,
      dueDate:       document.getElementById('instrDue').value.trim()
    };
    if (!v.code)   { handleError({ msg: "❌ יש לבחור סוג הנחיה" }); return; }
    if (!v.kind)   { handleError({ msg: "❌ יש לבחור אופי (מתמשכת / משימה)" }); return; }
    if (!v.status) { handleError({ msg: "❌ יש לבחור סטטוס (פתוח / בוצע / בוטל)" }); return; }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s15_instrApprove(currentPayload.row, v);
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
/**
 * MedicalPilot — S16_ValidateMedicalStatus.gs
 * @version     2.4.0 | @updated 22/10/2026 21:25 | @service S16
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S16_ValidateMedicalStatus.gs
 * @description שער אימות אנושי לכל קודי הסיווג בגליון יומן_מצב_רפואי (21
 *              עמודות, task214a): קוד מערכת גוף (Medical_System) — select
 *              סגור מ-S13_BODY_SYSTEMS, ללא שינוי. קוד אירוע/התמחות/חומרה/
 *              אבחנה — קטלוג פתוח משותף (מנוע גנרי אחד, S16_CODE_FIELDS),
 *              כל אחד קורא/כותב לבלוק העמודות שלו במיפוי_קודים (task215a):
 *              אירועים E-I, התמחות J-N, חומרה O-S, אבחנה T-X. וודאות אבחנה
 *              (Diagnosis_Certainty) — select סגור פשוט מבלוק וודאות Y-AC,
 *              בלי הוספת קוד חדש. שכתוב מלא, מחליף את הגרסה הישנה (v1.0.0)
 *              שהתבססה על מבנה 15 העמודות שהוסר (task214a, 10/09/2026) —
 *              קבועי S16_COL_* הישנים (ET_CODE/Event_Type_Normalized)
 *              כבר לא קיימים בגליון. ארכיטקטורה סוכמה עם עמוס ב-15/09/2026.
 *              [v2.1.0] קוד איבר (Organ_Code, עמודה 22) — select סגור של
 *              תת-קודי איבר מבלוק A-D במיפוי_קודים (למשל SYS12A ערמונית),
 *              מסונן בחלון לפי המערכת שנבחרה; ריק = ללא איבר.
 *              [v2.2.0] הצעה אוטומטית לכל השדות לפי מילות מפתח מהקטלוג
 *              (Raw_Value) בטקסט הגולמי של השורה, ועדכון המלצה מהחלון.
 *              [v2.3.0] וודאות אבחנה — "+ קוד חדש" מהחלון (בלוק Y-AC), ושם
 *              המערכת (עמודה 10) מתעדכן באישור לפי הקוד שנבחר.
 *              [v2.4.0] מצב וצד איבר אחרי ניתוח (עמודות 23-24) — שני select
 *              סגורים מבלוקי מצב_איבר AD-AH וצד_איבר AI-AM, מוצגים רק בשורת
 *              ניתוח (קוד אירוע A6B / סוג אירוע "ניתוח") או כשכבר שמור ערך.
 * @impacts     יומן_מצב_רפואי: קורא שורה בודדת (21 עמודות), כותב
 *              Medical_System(18), Event_Code(11)+Event_Description(12),
 *              Specialty_Name(9)+Specialty_Code(19),
 *              Severity_Name(13)+Severity_Code(20),
 *              Diagnosis_Name(14)+Diagnosis_Code(21),
 *              Diagnosis_Certainty(15), Record_Status(7) — ברמת השורה
 *              הפעילה בלבד. Event_Type(2)/Doc_Issuer(6) נקראים בלבד —
 *              לעולם לא נכתבים (טקסט גולמי מ-S13/Gemini).
 *              [v2.1.0] קורא עד עמודה 22 (או פחות אם אינה קיימת בגליון)
 *              וכותב Organ_Code(22) באישור — רק אם העמודה קיימת.
 *              [v2.2.0] כותב Recommendations(5) באישור — רק אם נשלח ערך
 *              (לא null) והוא שונה מהקיים בתא.
 *              מיפוי_קודים: קורא (4 בלוקים פתוחים: E-I/J-N/O-S/T-X, בלוק
 *              Y-AC לקריאה בלבד, [v2.1.0] בלוק A-D לקריאה בלבד), כותב/מעדכן שורות קוד בבלוקים הפתוחים דרך
 *              s16_saveCatalogCode (כפתור נפרד לכל שדה, ללא קשר לאישור
 *              השורה).
 *              [v2.3.0] כותב Medical_System_Name(10) באישור (שם מ-S13_BODY_
 *              SYSTEMS לפי הקוד שנבחר). מיפוי_קודים: s16_saveCatalogCode
 *              כותב גם לבלוק הוודאות Y-AC (key="certainty", ללא Raw_Value).
 *              נקרא גם ע"י S13_ExtractMedical.gs (_s16_readCatalogBlock,
 *              S16_CODE_FIELDS, S16_CERTAINTY/ORGAN_MAP_FIRST_COL — v1.4.0).
 *              תלויות: S16_Sidebar.html, COLUMN_MAP.gs (SHEET_CONFIG),
 *              ViewEngine.gs (MEDICAL_STATUS_SHEET_NAME, CODE_MAP_SHEET_NAME),
 *              S13_ExtractMedical.gs (S13_BODY_SYSTEMS).
 *              [v2.4.0] קורא עד עמודה 24 וכותב Organ_State_Code(23) +
 *              Organ_Side_Code(24) באישור — רק אם נשלחו מהחלון (השדות הוצגו) ורק
 *              אם העמודות קיימות. מיפוי_קודים: בלוקים AD-AH/AI-AM לקריאה בלבד.
 * @callers     ViewEngine.gs (אייקון "[ S16 אימות ]", MEDICAL_STATUS_ICON_MAP —
 *              script: "showS16Sidebar")
 * @functions   showS16Sidebar | _s16_buildPayload | _s16_buildFieldPayload |
 *              _s16_readCatalogBlock | _s16_formatDate | s16_loadRowData |
 *              s16_loadRowByNumber | s16_approve | s16_saveCatalogCode |
 *              _s16_saveCatalogCode | _s16_getCurrentPayload |
 *              _s16_keywordMatches | _s16_findKeywordSuggestion |
 *              _s16_buildOrganStatePayload
 * @changes     [v2.4.0] Task #224 (שלב 3) — מצב וצד איבר אחרי ניתוח. קבועים
 *              חדשים: S16_COL_ORGAN_STATE=23, S16_COL_ORGAN_SIDE=24, בלוקים
 *              S16_ORGAN_STATE/SIDE_MAP_FIRST_COL=30/35, עמודות טקסט להצעה
 *              (Event_Type/Primary_Diagnosis/Severity_Status) וזיהוי ניתוח
 *              (A6B / "ניתוח"). _s16_buildOrganStatePayload (חדשה): show רק
 *              בשורת ניתוח או כשיש ערך שמור; הצעת מצב לפי מילת המפתח הארוכה
 *              מ-Raw_Value; הצעת צד רק כשנמצאו מילות מפתח של קוד צד אחד —
 *              יותר מאחד → sideConflict (אזהרה בחלון, בלי הצעה).
 *              _s16_buildPayload: רוחב קריאה עד 24 + שדה organState.
 *              s16_approve: פרמטרים 7-8 organStateCode/organSideCode —
 *              undefined/null = לא נכתבים (תאימות לאחור). אומת מול הקוד החי
 *              (diff מדויק לכל בלוק, node --check), בסימולציה של 5 מקרים
 *              (כולל סתירת צד כמו שורה 244), ובבדיקת שטח: שורה 8 — החלון ללא
 *              שינוי; שורה 12 (ניתוח מסמך 52, חולץ מאירוע 244) — השדות הוצגו
 *              ובאישור נכתבו OST1/LAT2, Record_Status=מאומת, שורות 5-11 ללא
 *              שינוי. ממצא: S13 כתב ב-Primary_Diagnosis את הממצא ולא את הניתוח
 *              — לכן לא הוצע מצב/צד; יטופל ב-S13 (שלב 4).
 * @changes     [v2.3.0] Task #220 שלב ב — נוסף S16_COL_MEDICAL_SYSTEM_NAME=10;
 *              s16_approve כותב לעמודה 10 את שם המערכת (S13_BODY_SYSTEMS)
 *              לפי הקוד שנבחר — במקום הטקסט החופשי מ-S09 (למשל "אורולוגיה"
 *              בשורה 7). s16_saveCatalogCode — fieldKey="certainty" ממופה
 *              לבלוק הוודאות (S16_CERTAINTY_MAP_FIRST_COL, Y-AC) — מאפשר
 *              "+ קוד חדש" לוודאות מהחלון; Raw_Value נשמר ריק (אין עמודה
 *              גולמית בשורה). הרכיבים S16_CODE_FIELDS/_s16_readCatalogBlock
 *              משמשים גם את S13 v1.4.0 (קודי קטלוג מ-Gemini). אומת מול
 *              הקוד החי (diff מדויק, node --check) ובבדיקת שטח: שורות 9
 *              (מאירועים 130 — נמחקה, ו-137) — עמודה 10 נכונה באישור;
 *              CRT9 ניסיוני נכתב ל-Y9:Z9 ונמחק.
 * @changes     [v2.2.0] Task #220 שלב א' — הצעת סיווג אוטומטית לפי מילות
 *              מפתח. חדש: _s16_keywordMatches (מילה שלמה, עד 2 אותיות שימוש
 *              ו/ה/ב/כ/ל/מ/ש לפניה — "ערמונית" ב"הערמונית", "קל" לא ב"קליני")
 *              ו-_s16_findKeywordSuggestion (מילת המפתח הארוכה גוברת; תיקו —
 *              הראשון בקטלוג). S16_CODE_FIELDS קיבל suggestCols: התמחות ←
 *              Doc_Issuer+Event_Type, חומרה ← Severity_Status+Primary_Diagnosis,
 *              אבחנה ← Primary_Diagnosis+Event_Type; קוד אירוע — ללא שינוי
 *              (התאמה מלאה ל-Event_Type). הסיבה: Raw_Value בבלוקים אלה הוא
 *              רשימת מילות מפתח, וההתאמה המלאה הישנה לעולם לא מצאה. נוספו
 *              S16_CERTAINTY_SUGGEST_COLS / S16_ORGAN_SUGGEST_COLS ובנתוני
 *              החלון certaintySuggestion + organSuggestion (כולל systemCode
 *              של האיבר — רמז אם שייך למערכת אחרת). _s16_readCatalogBlock
 *              מחזיר גם desc (עמודה שלישית בבלוק; בבלוק איברים A-D זו עמודת
 *              Raw_Value — שם האיבר + מילים נוספות משמשים להצעה). הצעה נשלחת
 *              רק אם שונה מהקוד השמור. s16_approve קיבל פרמטר שישי
 *              recommendation (null = לא שונה). אומת מול הקוד החי (diff
 *              מדויק, node --check), בסימולציה עם נתוני הגליון, ובבדיקת שטח
 *              מלאה S10→S13→S16→כרטיס על 2 שורות חדשות (7: MRI ערמונית,
 *              8: פתולוגיה תריס) — הצעת איבר, בחירה מראש, היעדר הצעה שגויה
 *              בממצא שלילי, כתיבת המלצה; שורות 5-6 והקטלוג ללא שינוי.
 * @changes     [v2.1.0] Task #219 — קוד איבר: נוספו S16_COL_ORGAN_CODE=22 ו-
 *              S16_ORGAN_MAP_FIRST_COL=1. _s16_buildPayload קורא עד עמודה 22
 *              (Math.min מול getMaxColumns — לא נשבר בגליון בלי העמודה)
 *              ומחזיר currentOrganCode + organOptions (קוד, שם, systemCode —
 *              קוד מערכת מ-S13_BODY_SYSTEMS שהאיבר מתחיל בו; קוד שמור שלא
 *              בקטלוג נשמר כאפשרות). s16_approve קיבל פרמטר חמישי organCode:
 *              נדחה אם אינו שייך למערכת שנבחרה, או אם חסרה עמודה 22 ונבחר
 *              איבר; נכתב לעמודה 22 (ריק = ללא איבר). קריאה ישנה עם 4
 *              פרמטרים כותבת איבר ריק. אומת מול הקוד החי (diff מדויק,
 *              node --check) ובבדיקת שטח: שורה 6 → V6 = SYS12A. הוחזרה
 *              השורה הריקה אחרי S16_PROP_KEY שנמחקה בהדבקת הבלוק הראשון.
 * @changes     [v2.0.0] Task #214 — שכתוב מלא: מנגנון גנרי אחד (S16_CODE_
 *              FIELDS, 4 רשומות: eventCode/specialty/severity/diagnosis)
 *              במקום לוגיקה כפולה לכל שדה — _s16_readCatalogBlock ו-
 *              _s16_saveCatalogCode משותפות לכל הארבעה, קוראות/כותבות
 *              לבלוק העמודות המתאים במיפוי_קודים לפי קונפיג (לא A-D שטוח
 *              כמו הגרסה הקודמת של Event_Code בקובץ זה). Medical_System
 *              נשאר ללא שינוי (S13_BODY_SYSTEMS, בחירה סגורה). נוסף אימות
 *              Diagnosis_Certainty — select סגור פשוט מבלוק וודאות Y-AC
 *              (4 ערכים, בלי הוספת קוד — לא היה קיים בגרסה הקודמת בכלל).
 *              s16_approve קיבל חתימה חדשה (systemCode, certaintyCode,
 *              fieldValues) הכותבת את כל העמודות הרלוונטיות בבת אחת.
 *              הוסרו קבועי S16_COL_ET_CODE/EVENT_TYPE_NORM (עמודות לא
 *              קיימות יותר בגליון מאז המיגרציה ל-21 עמודות, task214a).
 *              Sidebar עודכן במקביל לפריסת שתי-עמודות (כמו S10): שמאל —
 *              Event_Date/Doc_Issuer + תצוגת מסמך מקור; ימין — כל שדות
 *              האימות. אומת מול הקוד החי (diff מדויק, node --check).
 */

// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S16_PROP_KEY = "S16_CURRENT_PAYLOAD";

// אינדקסי עמודות יומן_מצב_רפואי (ראה COLUMN_MAP.gs, מבנה 22 עמודות —
// [Task #219] נוספה Organ_Code בעמודה 22)
const S16_COL_EVENT_DATE          = 1;
const S16_COL_EVENT_TYPE          = 2;  // גולמי (S13/Gemini) — לעולם לא נכתב מ-S16
const S16_COL_PRIMARY_DIAGNOSIS   = 3;
const S16_COL_SEVERITY_STATUS     = 4;
const S16_COL_RECOMMENDATIONS     = 5;
const S16_COL_DOC_ISSUER          = 6;  // גולמי — לעולם לא נכתב מ-S16
const S16_COL_RECORD_STATUS       = 7;
const S16_COL_SPECIALTY_NAME      = 9;
const S16_COL_MEDICAL_SYSTEM_NAME = 10; // [Task #220 שלב ב] שם המערכת — נכתב באישור לפי הקוד שנבחר
const S16_COL_EVENT_CODE          = 11;
const S16_COL_EVENT_DESCRIPTION   = 12;
const S16_COL_SEVERITY_NAME       = 13;
const S16_COL_DIAGNOSIS_NAME      = 14;
const S16_COL_DIAGNOSIS_CERTAINTY = 15;
const S16_COL_SOURCE_URL          = 16;
const S16_COL_FILE_ID             = 17;
const S16_COL_MEDICAL_SYSTEM      = 18;
const S16_COL_SPECIALTY_CODE      = 19;
const S16_COL_SEVERITY_CODE       = 20;
const S16_COL_DIAGNOSIS_CODE      = 21;
const S16_COL_ORGAN_CODE          = 22; // [Task #219] קוד איבר (למשל SYS12A) — ריק = ללא איבר

// בלוק וודאות אבחנה במיפוי_קודים (Y-AC, עמודה 25) — בחירה סגורה פשוטה,
// 4 ערכים קבועים (CRT0-CRT3), בלי מנגנון הוספת-קוד-חדש.
const S16_CERTAINTY_MAP_FIRST_COL = 25;

// [Task #219] בלוק מערכות/איברים במיפוי_קודים (A-D, עמודה 1) — בחירה סגורה
// של תת-קוד איבר (קוד ארוך מקוד מערכת שמתחיל בו, למשל SYS12A תחת SYS12).
const S16_ORGAN_MAP_FIRST_COL     = 1;

// [Task #214] מנוע גנרי — קטלוג פתוח משותף ל-4 סוגי קוד. כל רשומה מצביעה
// לבלוק העמודות שלה במיפוי_קודים (5 עמודות רצופות: Code|Normalized_Value|
// Description|Raw_Value|Icon_Link) ולעמודות הקריאה/כתיבה ביומן_מצב_רפואי.
// journalRawCol — עמודת הטקסט המשמש לחיפוש/הצעה מהקטלוג (לא נכתב מעולם,
// חוץ מ-specialty/severity/diagnosis שם הוא זהה ל-journalNameCol בכוונה —
// עמודות אלו כבר מיועדות לערך מהקטלוג, לא לטקסט גולמי מ-Gemini).
// [Task #220] suggestCols — עמודות הטקסט ביומן שבהן מחפשים את מילות המפתח
// של הקטלוג (Raw_Value = רשימה מופרדת בפסיקים) להצעה אוטומטית. ריק = רק
// התאמה מלאה ל-journalRawCol (קוד אירוע — Raw_Value שם הוא משפט שלם).
const S16_CODE_FIELDS = [
  { key: "eventCode", label: "קוד אירוע", mapFirstCol: 5,  journalRawCol: S16_COL_EVENT_TYPE,    journalCodeCol: S16_COL_EVENT_CODE,     journalNameCol: S16_COL_EVENT_DESCRIPTION, suggestCols: [] },
  { key: "specialty", label: "התמחות",   mapFirstCol: 10, journalRawCol: S16_COL_SPECIALTY_NAME, journalCodeCol: S16_COL_SPECIALTY_CODE, journalNameCol: S16_COL_SPECIALTY_NAME,    suggestCols: [S16_COL_DOC_ISSUER, S16_COL_EVENT_TYPE] },
  { key: "severity",  label: "חומרה",     mapFirstCol: 15, journalRawCol: S16_COL_SEVERITY_NAME,  journalCodeCol: S16_COL_SEVERITY_CODE,  journalNameCol: S16_COL_SEVERITY_NAME,     suggestCols: [S16_COL_SEVERITY_STATUS, S16_COL_PRIMARY_DIAGNOSIS] },
  { key: "diagnosis", label: "אבחנה",     mapFirstCol: 20, journalRawCol: S16_COL_DIAGNOSIS_NAME, journalCodeCol: S16_COL_DIAGNOSIS_CODE, journalNameCol: S16_COL_DIAGNOSIS_NAME,    suggestCols: [S16_COL_PRIMARY_DIAGNOSIS, S16_COL_EVENT_TYPE] }
];

// [Task #220] מקורות טקסט להצעת ודאות ואיבר (שדות סגורים, לא ב-S16_CODE_FIELDS)
const S16_CERTAINTY_SUGGEST_COLS = [S16_COL_SEVERITY_STATUS, S16_COL_PRIMARY_DIAGNOSIS];
const S16_ORGAN_SUGGEST_COLS     = [S16_COL_EVENT_TYPE, S16_COL_PRIMARY_DIAGNOSIS];

// [Task #224] מצב וצד איבר אחרי ניתוח — עמודות 23-24 ביומן_מצב_רפואי
// (מבנה 24 עמודות), ובלוקים סגורים במיפוי_קודים: מצב_איבר AD-AH (עמודה 30)
// וצד_איבר AI-AM (עמודה 35). השדות מוצגים בחלון רק בשורת ניתוח (קוד אירוע
// שמתחיל ב-A6B או סוג אירוע שמכיל "ניתוח"), או כשכבר שמור בשורה ערך.
const S16_COL_ORGAN_STATE              = 23;
const S16_COL_ORGAN_SIDE               = 24;
const S16_ORGAN_STATE_MAP_FIRST_COL    = 30;
const S16_ORGAN_SIDE_MAP_FIRST_COL     = 35;
const S16_ORGAN_STATE_SUGGEST_COLS     = [S16_COL_EVENT_TYPE, S16_COL_PRIMARY_DIAGNOSIS, S16_COL_SEVERITY_STATUS];
const S16_SURGERY_EVENT_CODE_PREFIX    = "A6B";
const S16_SURGERY_EVENT_TYPE_KEYWORD   = "ניתוח";
// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — פתיחת חלון אימות
// ══════════════════════════════════════════════════════════════════

function showS16Sidebar() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui    = SpreadsheetApp.getUi();

  if (sheet.getName() !== MEDICAL_STATUS_SHEET_NAME) {
    ui.alert("⛔ גליון לא נתמך", "יש להפעיל את האייקון מתוך גליון '" + MEDICAL_STATUS_SHEET_NAME + "'.", ui.ButtonSet.OK);
    return;
  }

  const row = sheet.getActiveCell().getRow();
  const firstDataRow = SHEET_CONFIG[MEDICAL_STATUS_SHEET_NAME].FIRST_DATA_ROW;
  if (row < firstDataRow) {
    ui.alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const payload = _s16_buildPayload(ss, sheet, row);
  if (!payload) {
    ui.alert("❌ לא ניתן לטעון נתוני שורה " + row);
    return;
  }

  PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));

  const html = HtmlService
    .createTemplateFromFile("S16_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S16 — אימות מצב רפואי");

  ui.showModalDialog(html, "🩺 S16 — " + MEDICAL_STATUS_SHEET_NAME + " | שורה " + row);
}

// ══════════════════════════════════════════════════════════════════
// [Task #214] קריאה גנרית של בלוק קטלוג במיפוי_קודים (5 עמודות רצופות) —
// משמשת גם ל-4 השדות הפתוחים (S16_CODE_FIELDS) וגם לבלוק וודאות הסגור.
// מחזירה את רשימת האפשרויות הקיימות + מספר השורה האחרונה עם תוכן בתוך
// הבלוק הזה בלבד (לא getLastRow() הכללי — בלוקים אחרים עלולים להיות
// ארוכים/קצרים יותר, ראה התיקון המקביל ב-S10_Validate.gs, Task #214).
// ══════════════════════════════════════════════════════════════════

function _s16_readCatalogBlock(mapFirstCol) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const codeSheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);
  const firstDataRow = (SHEET_CONFIG[CODE_MAP_SHEET_NAME] && SHEET_CONFIG[CODE_MAP_SHEET_NAME].FIRST_DATA_ROW) || 5;
  const result = { sheet: codeSheet, firstDataRow: firstDataRow, options: [], lastBlockRow: firstDataRow - 1 };
  if (!codeSheet) return result;

  const lastRow = codeSheet.getLastRow();
  if (lastRow < firstDataRow) return result;

  const data = codeSheet.getRange(firstDataRow, mapFirstCol, lastRow - firstDataRow + 1, 5).getValues();
  data.forEach(function(rowVals, i) {
    const rowNum = firstDataRow + i;
    const code   = (rowVals[0] || "").toString().trim(); // Code
    const name   = (rowVals[1] || "").toString().trim(); // Normalized_Value
    const raw    = (rowVals[3] || "").toString().trim(); // Raw_Value
    const desc   = (rowVals[2] || "").toString().trim(); // Description (בבלוק איברים A-D: Raw_Value)
    const hasAny = code || name || raw || desc || (rowVals[4] || "");
    if (hasAny) result.lastBlockRow = rowNum;
    if (code) result.options.push({ code: code, name: name, raw: raw, desc: desc, row: rowNum });
  });
  return result;
}

// ══════════════════════════════════════════════════════════════════
// [Task #220] הצעה לפי מילות מפתח — חיפוש מילה שלמה בטקסט השורה.
// מותרות עד 2 אותיות שימוש לפני המילה (ו/ה/ב/כ/ל/מ/ש — "ערמונית" נמצאת
// ב"הערמונית"), ואחריה חייב לבוא סוף מילה ("קל" לא נמצאת ב"קליני").
// מילת המפתח הארוכה ביותר גוברת; תיקו — הקוד הראשון בקטלוג.
// keywordsOf(option) מחזירה מחרוזת מילות מפתח מופרדות בפסיקים.
// ══════════════════════════════════════════════════════════════════

function _s16_keywordMatches(keyword, text) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(^|[^\u0590-\u05FFA-Za-z0-9])[והבכלמש]{0,2}" + escaped + "(?=$|[^\u0590-\u05FFA-Za-z0-9])", "i");
  return re.test(text);
}

function _s16_findKeywordSuggestion(options, keywordsOf, texts) {
  let best = null;
  const cleanTexts = texts.map(function(t) { return (t || "").toString(); }).filter(function(t) { return t.trim(); });
  if (cleanTexts.length === 0) return null;
  options.forEach(function(o) {
    keywordsOf(o).split(",").map(function(k) { return k.trim(); }).filter(Boolean).forEach(function(k) {
      if (best && k.length <= best.keyword.length) return;
      const found = cleanTexts.some(function(t) { return _s16_keywordMatches(k, t); });
      if (found) best = { code: o.code, name: o.name, keyword: k };
    });
  });
  return best;
}

// ══════════════════════════════════════════════════════════════════
// בניית Payload לשדה קטלוג פתוח בודד — אפשרויות + הצעה לפי טקסט גולמי
// ══════════════════════════════════════════════════════════════════

function _s16_buildFieldPayload(fieldCfg, rowValues) {
  const rawText     = (rowValues[fieldCfg.journalRawCol - 1]  || "").toString().trim();
  const currentCode = (rowValues[fieldCfg.journalCodeCol - 1] || "").toString().trim();
  const currentName = (rowValues[fieldCfg.journalNameCol - 1] || "").toString().trim();
  const block        = _s16_readCatalogBlock(fieldCfg.mapFirstCol);

  let suggestion = null;
  if (rawText) {
    const match = block.options.filter(function(o) { return o.raw && o.raw === rawText; })[0];
    if (match && match.code !== currentCode) {
      suggestion = { code: match.code, name: match.name };
    }
  }

  // [Task #220] אין התאמה מלאה — חיפוש מילות מפתח (Raw_Value) בעמודות
  // suggestCols של השורה. מוצעת רק אם שונה מהקוד השמור.
  if (!suggestion && fieldCfg.suggestCols && fieldCfg.suggestCols.length > 0) {
    const texts = fieldCfg.suggestCols.map(function(col) { return rowValues[col - 1]; });
    const kwMatch = _s16_findKeywordSuggestion(block.options, function(o) { return o.raw; }, texts);
    if (kwMatch && kwMatch.code !== currentCode) suggestion = kwMatch;
  }

  const options = block.options.map(function(o) { return { code: o.code, name: o.name }; });

  // [Task #214, QA] אם לשורה כבר יש קוד קיים שלא נמצא ברשימת האפשרויות
  // מהקטלוג (למשל נכתב ידנית לפני שהמנגנון הזה נבנה, או נמחק בינתיים
  // מהקטלוג) — מוסיפים אותו כאופציה נוספת, כדי שלא יילך לאיבוד: בלי
  // התוספת הזו ה-select היה חוזר ל"— בחר —" וכתיבה על "אשר" בלי לגעת
  // בשדה הזה הייתה כותבת קוד ריק במקום להשאיר את הקיים.
  if (currentCode && !options.some(function(o) { return o.code === currentCode; })) {
    options.push({ code: currentCode, name: currentName || "(לא נמצא בקטלוג)" });
  }

  return {
    key:         fieldCfg.key,
    label:       fieldCfg.label,
    rawText:     rawText,
    currentCode: currentCode,
    currentName: currentName,
    options:     options,
    suggestion:  suggestion
  };
}

// ══════════════════════════════════════════════════════════════════
// [Task #224] Payload למצב וצד איבר — מוצג רק בשורת ניתוח או כשיש ערך שמור.
// הצעת מצב: מילת המפתח הארוכה ביותר מבלוק מצב_איבר (Raw_Value) בטקסט השורה.
// הצעת צד: רק כשנמצאו מילות מפתח של קוד צד אחד בלבד. נמצאו של יותר מקוד אחד
// (למשל "שמאל" וגם "הימנית") — אין הצעה, ומוחזרת סתירה לאזהרה בחלון.
// ══════════════════════════════════════════════════════════════════

function _s16_buildOrganStatePayload(rowValues) {
  const eventCode    = (rowValues[S16_COL_EVENT_CODE - 1]  || "").toString().trim();
  const eventType    = (rowValues[S16_COL_EVENT_TYPE - 1]  || "").toString();
  const currentState = (rowValues[S16_COL_ORGAN_STATE - 1] || "").toString().trim();
  const currentSide  = (rowValues[S16_COL_ORGAN_SIDE - 1]  || "").toString().trim();

  const isSurgery = eventCode.indexOf(S16_SURGERY_EVENT_CODE_PREFIX) === 0 ||
                    eventType.indexOf(S16_SURGERY_EVENT_TYPE_KEYWORD) !== -1;
  if (!isSurgery && !currentState && !currentSide) return { show: false };

  const stateBlock = _s16_readCatalogBlock(S16_ORGAN_STATE_MAP_FIRST_COL);
  const sideBlock  = _s16_readCatalogBlock(S16_ORGAN_SIDE_MAP_FIRST_COL);

  function toOptions(block, currentCode) {
    const opts = block.options.map(function(o) { return { code: o.code, name: o.name }; });
    if (currentCode && !opts.some(function(o) { return o.code === currentCode; })) {
      opts.push({ code: currentCode, name: "(לא נמצא בקטלוג)" });
    }
    return opts;
  }

  const texts = S16_ORGAN_STATE_SUGGEST_COLS.map(function(col) { return rowValues[col - 1]; });

  let stateSuggestion = null;
  let sideSuggestion  = null;
  let sideConflict    = null;

  if (isSurgery) {
    stateSuggestion = _s16_findKeywordSuggestion(stateBlock.options, function(o) { return o.raw; }, texts);
    if (stateSuggestion && stateSuggestion.code === currentState) stateSuggestion = null;

    // כל קודי הצד שלפחות מילת מפתח אחת שלהם נמצאת בטקסט
    const cleanTexts = texts.map(function(t) { return (t || "").toString(); }).filter(function(t) { return t.trim(); });
    const sideMatches = sideBlock.options.filter(function(o) {
      return (o.raw || "").split(",").map(function(k) { return k.trim(); }).filter(Boolean).some(function(k) {
        return cleanTexts.some(function(t) { return _s16_keywordMatches(k, t); });
      });
    });
    if (sideMatches.length === 1) {
      if (sideMatches[0].code !== currentSide) sideSuggestion = { code: sideMatches[0].code, name: sideMatches[0].name };
    } else if (sideMatches.length > 1) {
      sideConflict = sideMatches.map(function(o) { return o.name; });
    }
  }

  return {
    show:            true,
    isSurgery:       isSurgery,
    currentState:    currentState,
    currentSide:     currentSide,
    stateOptions:    toOptions(stateBlock, currentState),
    sideOptions:     toOptions(sideBlock, currentSide),
    stateSuggestion: stateSuggestion,
    sideSuggestion:  sideSuggestion,
    sideConflict:    sideConflict
  };
}

// ══════════════════════════════════════════════════════════════════
// בניית Payload — נתוני שורה מלאים לממשק
// ══════════════════════════════════════════════════════════════════

function _s16_buildPayload(ss, sheet, row) {
  try {
    const firstDataRow = SHEET_CONFIG[MEDICAL_STATUS_SHEET_NAME].FIRST_DATA_ROW;
    const lastRow       = sheet.getLastRow();
    if (lastRow < firstDataRow) return null;

    // [Task #219] קריאה עד עמודה 22 (Organ_Code). אם העמודה עוד לא קיימת
    // בגליון — קוראים רק את מה שקיים, וקוד האיבר יחזור ריק.
    // [Task #224] הורחב לעמודה 24 (מצב וצד איבר) — אותו עיקרון.
    const readWidth = Math.min(S16_COL_ORGAN_SIDE, sheet.getMaxColumns());
    const rowValues = sheet.getRange(row, 1, 1, readWidth).getValues()[0];

    const fileId   = (rowValues[S16_COL_FILE_ID - 1] || "").toString().trim();
    let sourceUrl   = (rowValues[S16_COL_SOURCE_URL - 1] || "").toString().trim();
    if (!sourceUrl && fileId) sourceUrl = "https://drive.google.com/file/d/" + fileId + "/view";

    // select סגור — מ-S13_BODY_SYSTEMS (S13_ExtractMedical.gs), ללא שינוי
    const currentSysCode    = (rowValues[S16_COL_MEDICAL_SYSTEM - 1] || "").toString().trim();
    const bodySystemOptions = Object.keys(S13_BODY_SYSTEMS).map(function(code) {
      return { code: code, nameHe: S13_BODY_SYSTEMS[code].nameHe };
    });

    // select סגור פשוט — בלוק וודאות Y-AC, בלי הוספת קוד
    const currentCertainty  = (rowValues[S16_COL_DIAGNOSIS_CERTAINTY - 1] || "").toString().trim();
    const certaintyBlock    = _s16_readCatalogBlock(S16_CERTAINTY_MAP_FIRST_COL);
    const certaintyOptions  = certaintyBlock.options.map(function(o) { return { code: o.code, name: o.name }; });

    // [Task #220] הצעת ודאות לפי מילות מפתח (Raw_Value, למשל PIRADS 4 ב-AB5)
    let certaintySuggestion = _s16_findKeywordSuggestion(certaintyBlock.options, function(o) { return o.raw; },
      S16_CERTAINTY_SUGGEST_COLS.map(function(col) { return rowValues[col - 1]; }));
    if (certaintySuggestion && certaintySuggestion.code === currentCertainty) certaintySuggestion = null;

    // [Task #219] select סגור — תת-קודי איבר מבלוק A-D. כל איבר משויך לקוד
    // המערכת שהוא מתחיל בו (S13_BODY_SYSTEMS); הסינון לפי המערכת שנבחרה
    // מתבצע בחלון. קוד איבר שמור שלא נמצא בקטלוג נשמר כאפשרות נוספת.
    const currentOrganCode = (rowValues[S16_COL_ORGAN_CODE - 1] || "").toString().trim();
    const organBlock       = _s16_readCatalogBlock(S16_ORGAN_MAP_FIRST_COL);
    const organOptions     = [];
    organBlock.options.forEach(function(o) {
      const systemCode = Object.keys(S13_BODY_SYSTEMS).filter(function(sys) {
        return o.code.length > sys.length && o.code.indexOf(sys) === 0;
      })[0];
      if (systemCode) organOptions.push({ code: o.code, name: o.name, systemCode: systemCode });
    });
    if (currentOrganCode && !organOptions.some(function(o) { return o.code === currentOrganCode; })) {
      organOptions.push({ code: currentOrganCode, name: "(לא נמצא בקטלוג)", systemCode: currentOrganCode.substring(0, 5) });
    }

    // [Task #220] הצעת איבר לפי שם האיבר (Normalized_Value) ומילים נוספות
    // בעמודת Raw_Value של בלוק A-D (עמודה C). כולל קוד המערכת של האיבר —
    // החלון מציג רמז אם המערכת שונה מהנבחרת (בלי החלפה אוטומטית).
    let organSuggestion = _s16_findKeywordSuggestion(organOptions, function(o) {
      const src = organBlock.options.filter(function(b) { return b.code === o.code; })[0];
      return [o.name, src ? src.desc : ""].join(",");
    }, S16_ORGAN_SUGGEST_COLS.map(function(col) { return rowValues[col - 1]; }));
    if (organSuggestion) {
      if (organSuggestion.code === currentOrganCode) {
        organSuggestion = null;
      } else {
        organSuggestion.systemCode = organOptions.filter(function(o) { return o.code === organSuggestion.code; })[0].systemCode;
      }
    }

    // 4 שדות הקטלוג הפתוח — דרך המנוע הגנרי
    const fields = {};
    S16_CODE_FIELDS.forEach(function(cfg) {
      fields[cfg.key] = _s16_buildFieldPayload(cfg, rowValues);
    });

    return {
      row:              row,
      lastRow:          lastRow,
      firstDataRow:     firstDataRow,
      eventDate:        _s16_formatDate(rowValues[S16_COL_EVENT_DATE - 1]),
      docIssuer:        (rowValues[S16_COL_DOC_ISSUER - 1] || "").toString(),
      primaryDiagnosis: (rowValues[S16_COL_PRIMARY_DIAGNOSIS - 1] || "").toString(),
      severityStatus:   (rowValues[S16_COL_SEVERITY_STATUS - 1] || "").toString(),
      recommendations:  (rowValues[S16_COL_RECOMMENDATIONS - 1] || "").toString(),
      recordStatus:     (rowValues[S16_COL_RECORD_STATUS - 1] || "").toString(),
      sourceUrl:        sourceUrl,
      currentSysCode:   currentSysCode || "SYS00",
      bodySystemOptions: bodySystemOptions,
      currentCertainty: currentCertainty,
      certaintyOptions: certaintyOptions,
      certaintySuggestion: certaintySuggestion,
      currentOrganCode: currentOrganCode,
      organOptions:     organOptions,
      organSuggestion:  organSuggestion,
      organState:       _s16_buildOrganStatePayload(rowValues), // [Task #224]
      fields:           fields
    };

  } catch (e) {
    Logger.log("[S16] _s16_buildPayload שגיאה: " + e.message);
    return null;
  }
}
function _s16_formatDate(rawValue) {
  if (rawValue instanceof Date) {
    return Utilities.formatDate(rawValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  return (rawValue || "").toString();
}

// ══════════════════════════════════════════════════════════════════
// טעינת נתוני שורה — נקרא מה-HTML בטעינה
// ══════════════════════════════════════════════════════════════════

function s16_loadRowData() {
  const payload = _s16_getCurrentPayload();
  if (!payload) return { error: true, msg: "❌ לא נמצא payload" };
  return payload;
}

// ══════════════════════════════════════════════════════════════════
// טעינת שורה לפי מספר — ניווט הקודם/הבא בגליון
// ══════════════════════════════════════════════════════════════════

function s16_loadRowByNumber(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MEDICAL_STATUS_SHEET_NAME);
    if (!sheet) return { error: true, msg: "❌ גליון לא נמצא: " + MEDICAL_STATUS_SHEET_NAME };

    const payload = _s16_buildPayload(ss, sheet, row);
    if (!payload) return { error: true, msg: "❌ לא ניתן לטעון שורה " + row };

    PropertiesService.getScriptProperties().setProperty(S16_PROP_KEY, JSON.stringify(payload));
    return payload;
  } catch (e) {
    Logger.log("[S16] s16_loadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור — אישור (כותב את כל קודי הסיווג + Record_Status="מאומת")
// fieldValues: { eventCode:{code,name}, specialty:{code,name},
//                severity:{code,name}, diagnosis:{code,name} }
// [Task #219] organCode — קוד איבר (עמודה 22), ריק = ללא איבר
// [Task #220] recommendation — טקסט המלצה (עמודה 5); null = לא שונה בחלון
// [Task #224] organStateCode / organSideCode — מצב וצד איבר (עמודות 23/24).
//             undefined/null = השדות לא הוצגו בחלון — העמודות לא נכתבות כלל.
// ══════════════════════════════════════════════════════════════════

function s16_approve(row, systemCode, certaintyCode, fieldValues, organCode, recommendation, organStateCode, organSideCode) {
  try {
    if (!systemCode || !S13_BODY_SYSTEMS[systemCode]) {
      return { success: false, msg: "⚠️ קוד מערכת לא תקין: " + systemCode };
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MEDICAL_STATUS_SHEET_NAME);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + MEDICAL_STATUS_SHEET_NAME };

    // [Task #219] קוד איבר חייב להשתייך למערכת שנבחרה, והעמודה חייבת להתקיים
    organCode = (organCode || "").toString().trim();
    if (organCode && organCode.indexOf(systemCode) !== 0) {
      return { success: false, msg: "⚠️ האיבר " + organCode + " לא שייך למערכת " + systemCode };
    }
    if (organCode && sheet.getMaxColumns() < S16_COL_ORGAN_CODE) {
      return { success: false, msg: "⚠️ חסרה עמודה Organ_Code (עמודה 22) בגליון " + MEDICAL_STATUS_SHEET_NAME };
    }

    // [Task #224] מצב וצד איבר — נכתבים רק אם נשלחו מהחלון (השדות הוצגו)
    const writeOrganState = (organStateCode !== undefined && organStateCode !== null) ||
                            (organSideCode  !== undefined && organSideCode  !== null);
    organStateCode = (organStateCode || "").toString().trim();
    organSideCode  = (organSideCode  || "").toString().trim();
    if (writeOrganState && (organStateCode || organSideCode) && sheet.getMaxColumns() < S16_COL_ORGAN_SIDE) {
      return { success: false, msg: "⚠️ חסרות עמודות Organ_State_Code/Organ_Side_Code (עמודות 23-24) בגליון " + MEDICAL_STATUS_SHEET_NAME };
    }

    sheet.getRange(row, S16_COL_MEDICAL_SYSTEM).setValue(systemCode);
    // [Task #220 שלב ב] שם המערכת (עמודה 10) מתעדכן לפי הקוד שנבחר — במקום הטקסט החופשי מ-S09
    sheet.getRange(row, S16_COL_MEDICAL_SYSTEM_NAME).setValue(S13_BODY_SYSTEMS[systemCode].nameHe);
    sheet.getRange(row, S16_COL_DIAGNOSIS_CERTAINTY).setValue(certaintyCode || "");

    S16_CODE_FIELDS.forEach(function(cfg) {
      const val = (fieldValues && fieldValues[cfg.key]) || {};
      sheet.getRange(row, cfg.journalCodeCol).setValue(val.code || "");
      sheet.getRange(row, cfg.journalNameCol).setValue(val.name || "");
    });

    if (sheet.getMaxColumns() >= S16_COL_ORGAN_CODE) {
      sheet.getRange(row, S16_COL_ORGAN_CODE).setValue(organCode);
    }

    // [Task #224] מצב וצד איבר (עמודות 23-24)
    if (writeOrganState && sheet.getMaxColumns() >= S16_COL_ORGAN_SIDE) {
      sheet.getRange(row, S16_COL_ORGAN_STATE).setValue(organStateCode);
      sheet.getRange(row, S16_COL_ORGAN_SIDE).setValue(organSideCode);
    }

    // [Task #220] המלצה — נכתבת רק אם נשלחה (לא null) ושונה מהערך בתא
    let recoUpdated = false;
    if (recommendation !== null && recommendation !== undefined) {
      const recoCell = sheet.getRange(row, S16_COL_RECOMMENDATIONS);
      const newReco  = recommendation.toString().trim();
      if (newReco !== (recoCell.getValue() || "").toString().trim()) {
        recoCell.setValue(newReco);
        recoUpdated = true;
      }
    }

    sheet.getRange(row, S16_COL_RECORD_STATUS).setValue("מאומת");

    Logger.log("[S16] אישור שורה " + row + " — SYS:" + systemCode + " | ORGAN:" + organCode +
      (writeOrganState ? " | STATE:" + organStateCode + " | SIDE:" + organSideCode : "") +
      " | CERT:" + certaintyCode + (recoUpdated ? " | המלצה עודכנה" : ""));
    return { success: true, msg: "✅ השורה אושרה" };

  } catch (e) {
    Logger.log("[S16] s16_approve שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור נפרד לכל שדה — עדכון/הוספת קוד למיפוי_קודים, ללא קשר לאישור השורה
// ══════════════════════════════════════════════════════════════════

function s16_saveCatalogCode(fieldKey, rawText, code, name) {
  try {
    // [Task #220 שלב ב] וודאות אבחנה — בלוק Y-AC, אינו חלק מ-S16_CODE_FIELDS (אין לו עמודה גולמית בשורה)
    const fieldCfg = (fieldKey === "certainty")
      ? { key: "certainty", label: "וודאות אבחנה", mapFirstCol: S16_CERTAINTY_MAP_FIRST_COL }
      : S16_CODE_FIELDS.filter(function(c) { return c.key === fieldKey; })[0];
    if (!fieldCfg) return { success: false, msg: "❌ שדה קוד לא מוכר: " + fieldKey };
    if (!code) return { success: false, msg: "❌ חסר קוד לשמירה" };

    return _s16_saveCatalogCode(fieldCfg, rawText, code, name);
  } catch (e) {
    Logger.log("[S16] s16_saveCatalogCode שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

function _s16_saveCatalogCode(fieldCfg, rawText, code, name) {
  try {
    const block = _s16_readCatalogBlock(fieldCfg.mapFirstCol);
    if (!block.sheet) return { success: false, msg: "❌ גליון '" + CODE_MAP_SHEET_NAME + "' לא נמצא" };

    let existingRow = null;
    if (rawText) {
      const match = block.options.filter(function(o) { return o.raw && o.raw === rawText; })[0];
      if (match) existingRow = match.row;
    }

    if (existingRow) {
      block.sheet.getRange(existingRow, fieldCfg.mapFirstCol, 1, 2).setValues([[code, name || ""]]);
      Logger.log("[S16] " + fieldCfg.label + " עודכן במיפוי_קודים — " + code + " | " + rawText);
      return { success: true, updated: true };
    }

    const newRow = block.lastBlockRow + 1;
    block.sheet.getRange(newRow, fieldCfg.mapFirstCol, 1, 5).setValues([[code, name || "", "", rawText || "", ""]]);
    Logger.log("[S16] " + fieldCfg.label + " חדש נוסף למיפוי_קודים — " + code + " | " + rawText);
    return { success: true, updated: false };

  } catch (e) {
    Logger.log("[S16] _s16_saveCatalogCode שגיאה (" + fieldCfg.label + "): " + e.message);
    return { success: false, msg: "❌ שגיאה בשמירת " + fieldCfg.label + ": " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציית עזר — שליפת payload נוכחי
// ══════════════════════════════════════════════════════════════════

function _s16_getCurrentPayload() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(S16_PROP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    Logger.log("[S16] _s16_getCurrentPayload שגיאה: " + e.message);
    return null;
  }
}
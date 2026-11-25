/**
 * @file        S17_InfographicApp.gs
 * @version 1.6.0 | @updated 25/11/2026 21:42 | @service S17
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S17_InfographicApp.gs
 * @description יישום האינפוגרפיקה לרופא (Task #260) — צד השרת. בונה את נתוני
 *              התצוגה מהקודים בלבד (לא מקריאת המסמך): כל שורות יומן_מצב_רפואי,
 *              מקובצות למסמכים לפי File_ID ומסודרות לפי תאריך, עם קטלוגי
 *              מיפוי_קודים ואייקונים מתיקיית אייקונים_רפואיים. אותו דף תצוגה
 *              (App_Infographic.html) מוגש בשתי דרכים: יישום ווב (doGet, קישור
 *              /dev, גישה "רק אני") וחלון גדול בתוך הגליון שנפתח מאייקון בגליון
 *              יומן_אירועים_רפואי (עמודה E) על המסמך של השורה המסומנת.
 *              אין גליון פעיל ביישום ווב — הגליון נפתח לפי מזהה (openById).
 *              בניית הרשומה — שימוש חוזר ב-_labInfographic_buildRecord
 *              (ViewEngine.gs), בתוספת צד, מצב איבר, מונח, גודל וגורם.
 *              [v1.1.0] מעביר לדף גם את רשימת ההתמחויות (קטלוג) ואת טבלת כללי
 *              הסינון לפי התמחות (LAB_INFOGRAPHIC_SPECIALTY_FILTER) — למצב היסטוריה.
 *              [v1.2.0] מעבדה: s17_buildLab קורא את בדיקות_דם (כל השורות),
 *              מקבץ לבדיקה לפי LOINC_Code (בלי קוד — לפי שם), שם בינלאומי מקטלוג
 *              מאפייני המעבדה, נקודות זמן עם ערך/טווח/סימון H-L-A/אימות/File_ID.
 *              כשהמסמך של השורה המסומנת לא ביומן המצב אך נמצא במעבדה —
 *              requested="lab" (הדף נפתח בלשונית מעבדה ומדגיש את תוצאותיו).
 *              [v1.3.0] מצב נוכחי: s17_buildNow קורא את תרופות_קבועות (מאוחדות לפי
 *              החומר הפעיל — INN מקטלוג ATC; נשארת השורה עם תאריך ההתחלה המאוחר)
 *              ואת הנחיות_רפואיות_ומשימות (קוד הנחיה, יעד, תאריך יעד, פתוחה/בוצעה).
 *              s17_readSheetObjects — קריאת גליון לאובייקטים לפי כותרות שורה 4.
 *              גנטיקה: s17_buildGen קורא את בדיקות_גנטיות — שורה לכל תכונה,
 *              מאוחדות לפי Trait_Code (נשארת המאוחרת, כל המסמכים נשמרים להדגשה),
 *              שם התכונה מקטלוג התכונות, דרגת נטייה 0-3, קיצור ACMG. שורה בלי קוד
 *              תכונה — נשארת נפרדת. מסמך שנמצא רק בגנטיקה — requested="gen".
 *              [v1.4.0] פרופיל מטופל: s17_buildProfile קורא את פרופיל_מטופל (שורה 5) —
 *              מין (M/F, אחר = לא תועד), שנת לידה (1900 עד השנה הנוכחית), גיל מחושב,
 *              מקור ו-demo (Data_Source="הדגמה"); מוחזר ב-payload.profile.
 *              [v1.5.0] אזורי "לא תועד" (Task #283): s17_countSourceDocs סופרת את
 *              המסמכים השונים (File_ID) ביומן_אירועים_רפואי; s17_buildNow מחזירה
 *              now.docCount — מספר המסמכים שנבדקו, לתצוגה בלשונית מצב נוכחי.
 *              [v1.6.0] שיוך דואלי (Task #269 שלב 8): s17_readOrganLinks קוראת את בלוק
 *              שיוך_איברים (CI-CM) — איבר ראשי ומשניים לכל פריט; s17_buildLab מוסיפה לכל
 *              בדיקה organ, secondary ו-linkFrom בירושה: קוד הבדיקה ← פאנל ← Medical_System;
 *              s17_buildPayload מוסיפה לכל רשומה secondary (עמודה 30 Secondary_Organs).
 * @impacts     קריאה בלבד: יומן_מצב_רפואי ובדיקות_דם (כל השורות משורה 5, עמודות
 *              לפי שם הכותרת בשורה 4), מיפוי_קודים (בלוקים: איברים A, קוד אירוע E,
 *              התמחות J, חומרה O, ודאות Y, מצב איבר AD, צד AI, מאפייני מעבדה BG,
 *              פאנלים BS), תיקיית
 *              האייקונים בדרייב. מטמון אייקונים ב-CacheService (6 שעות, לפי
 *              מזהה קובץ). runInfographicAppIconEvents קורא את File_ID מהשורה
 *              המסומנת בגליון הפעיל. setupInfographicAppIconEvents כותב לגליון
 *              יומן_אירועים_רפואי: אייקון בתא E2 ותווית בתא E3 בלבד — לא מוחק
 *              אייקונים אחרים (אך setupMedicalEventsIcons ב-ViewEngine.gs מוחקת
 *              את כל האייקונים בגליון — אחריה יש להריץ שוב את הפונקציה הזו).
 *              הרשאות: הרשאה מלאה לגליונות (openById) והצגת חלון
 *              (script.container.ui) — auth_07/auth_08 ב-Auth_Check.gs.
 *              תלויות: ViewEngine.gs (_labInfographic_buildRecord,
 *              _labInfographic_loadIconMap, _labInfographic_blobToDataUri,
 *              LAB_INFOGRAPHIC_TRIGGER_ICON_FILE_ID, LAB_INFOGRAPHIC_SPECIALTY_FILTER),
 *              S13_ExtractMedical.gs
 *              (S13_BODY_SYSTEMS), appsscript.json (בלוק webapp).
 *              [v1.3.0] קריאה בלבד נוספת: תרופות_קבועות, הנחיות_רפואיות_ומשימות,
 *              בדיקות_גנטיות (כל השורות משורה 5, עמודות לפי שם הכותרת בשורה 4);
 *              מיפוי_קודים — בלוקים מאגר תרופות ATC BA, סוגי הנחיות BX, תכונות
 *              גנטיות BM. אין כתיבה לשום גליון.
 *              [v1.4.0] קריאה בלבד נוספת: פרופיל_מטופל (שורה 5, לפי כותרות שורה 4).
 *              [v1.5.0] קריאה בלבד נוספת: יומן_אירועים_רפואי — עמודת File_ID בלבד
 *              (לפי כותרת שורה 4).
 *              [v1.6.0] קריאה בלבד נוספת: מיפוי_קודים — בלוק שיוך_איברים CI-CM;
 *              יומן_מצב_רפואי — עמודה Secondary_Organs.
 * @callers     יישום ווב (doGet) | אייקון בגליון יומן_אירועים_רפואי, תא E2
 *              (runInfographicAppIconEvents) | הרצה ידנית מהעורך
 *              (setupInfographicAppIconEvents) | App_Infographic.html
 *              (s17_include, בתבנית)
 * @functions   doGet | s17_renderPage | runInfographicAppIconEvents |
 *              setupInfographicAppIconEvents | s17_include | s17_readCatalogBlock |
 *              s17_buildCatalogs | s17_dateToTs | s17_loadIcons | s17_buildPayload |
 *              s17_buildLab | [v1.3.0] s17_readSheetObjects | s17_buildNow |
 *              s17_buildGen | [v1.4.0] s17_buildProfile | [v1.5.0] s17_countSourceDocs |
 *              [v1.6.0] s17_readOrganLinks
 * @changes     [v1.6.0] Task #269 שלב 8 — נוספה s17_readOrganLinks; s17_buildLab — איבר מטרה
 *              ואיברי ייחוס לכל בדיקה בירושה; s17_buildPayload — rec.secondary. קריאה בלבד.
 *              אומת: diff מדויק מול העורך, node --check, ובדיקה בפועל (סמן לבלב ×3 → ייחוס כליות).
 *              [v1.5.0] Task #283 — נוספה s17_countSourceDocs; s17_buildNow מחזירה docCount
 *              (מסמכים שנבדקו, לאזורי "לא תועד"). קריאה בלבד. אומת: diff מדויק מול העורך,
 *              node --check, ובדיקה בפועל (נבדקו 38).
 *              [v1.4.0] Task #271 שלב א — נוספה s17_buildProfile (מין, שנת לידה, גיל,
 *              סימון הדגמה מהגליון פרופיל_מטופל); s17_buildPayload מחזיר profile.
 *              קריאה בלבד. אומת: diff מדויק מול העורך, node --check, ובדיקה בפועל (♂ 66 הדגמה).
 *              [v1.3.0] Task #260 שלב 4 — נוספו s17_readSheetObjects, s17_buildNow
 *              (לשונית מצב נוכחי) ו-s17_buildGen (לשונית גנטיקה); s17_buildPayload
 *              מחזיר now ו-gen ומזהה requested="gen". קריאה בלבד.
 *              [v1.2.0] Task #260 שלב 3 — נוספה s17_buildLab (נתוני המעבדה ללשונית
 *              מעבדה) ו-requested="lab" לפתיחה ישירה משורת מעבדה בגליון.
 */

// ══════════════════════════════════════════════════════════════════
// [Task #260] יישום ווב עצמאי לאינפוגרפיקה — שלב 1: מצב אירוע (מסמך)
// הפריסה: "הפעל בתור: אני", "למי יש גישה: רק אני".
// אין גליון פעיל ביישום ווב — הגליון נפתח לפי מזהה (openById), והקטלוג
// נקרא בפונקציה מקבילה ל-_s16_readCatalogBlock שמקבלת את הגליון כפרמטר.
// בניית הרשומה — שימוש חוזר ב-_labInfographic_buildRecord (ViewEngine.gs),
// בתוספת שדות צד/מצב איבר/מונח/גודל/גורם שהיא אינה מחזירה.
// קריאה בלבד — לא כותב לשום גליון.
// ══════════════════════════════════════════════════════════════════

const S17_SPREADSHEET_ID      = "1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I";
const S17_SOURCE_SHEET_NAME   = "יומן_מצב_רפואי";
const S17_CODE_MAP_SHEET_NAME = "מיפוי_קודים";
const S17_HEADER_ROW          = 4;
const S17_FIRST_DATA_ROW      = 5;
const S17_ICON_CACHE_PREFIX   = "S17_ICON_";
const S17_ICON_CACHE_SECONDS  = 21600;   // 6 שעות — המקסימום של CacheService
const S17_ICON_CACHE_MAX_LEN  = 95000;   // מגבלת ערך במטמון ~100KB

// בלוקי הקטלוג במיפוי_קודים (עמודה ראשונה של כל בלוק)
const S17_MAP_COL_ORGAN     = 1;   // A-D  איברים
const S17_MAP_COL_EVENT     = 5;   // E-I  קודי אירוע
const S17_MAP_COL_SPECIALTY = 10;  // J-N  התמחויות
const S17_MAP_COL_SEVERITY  = 15;  // O-S  חומרה
const S17_MAP_COL_CERTAINTY = 25;  // Y-AC ודאות
const S17_MAP_COL_STATE     = 30;  // AD-AH מצב איבר
const S17_MAP_COL_SIDE      = 35;  // AI-AM צד איבר
const S17_MAP_COL_LAB       = 59;  // BG-BL מאפייני מעבדה (LOINC)
const S17_MAP_COL_PANEL     = 71;  // BS-BW פאנלים

// [שלב 3] גליון המעבדה — תוצאה לשורה (Task #263)
const S17_LAB_SHEET_NAME    = "בדיקות_דם";

// [שלב 4] לשונית "עכשיו" — תרופות והנחיות (Task #256, #261)
const S17_MEDS_SHEET_NAME   = "תרופות_קבועות";
const S17_INSTR_SHEET_NAME  = "הנחיות_רפואיות_ומשימות";
const S17_MAP_COL_ATC       = 53;  // BA-BF מאגר תרופות (ATC)
const S17_MAP_COL_INSTR     = 76;  // BX-CB סוגי הנחיות

// [שלב 4] לשונית "גנטיקה" — שורה לכל תכונה (Task #264)
const S17_GEN_SHEET_NAME    = "בדיקות_גנטיות";
const S17_MAP_COL_TRAIT     = 65;  // BM-BR תכונות_גנטיות
const S17_GEN_TENDENCY_LEVEL = { "אין": 0, "נמוכה": 1, "בינונית": 2, "גבוהה": 3 };
const S17_GEN_ACMG_ABBR = { "פתוגני": "P", "כנראה פתוגני": "LP", "משמעות לא ודאית": "VUS",
                            "כנראה שפיר": "LB", "שפיר": "B" };

// משפחות קוד אירוע שמייצגות את המסמך עצמו (בדיקה/אשפוז) — לכותרת המסמך
const S17_DOC_EVENT_FAMILIES = ["A0", "A1", "A2", "A3", "A4", "A5", "A6"];

// [Task #260] הפעלה מגליון יומן_אירועים_רפואי — אייקון בעמודה E, שורה 2
const S17_EVENTS_SHEET_NAME    = "יומן_אירועים_רפואי";
const S17_EVENTS_ICON_COL      = 5;   // E
const S17_EVENTS_ICON_ROW      = 2;
const S17_EVENTS_LABEL         = "[ אינפוגרפיקה ]";
const S17_EVENTS_ICON_SCRIPT   = "runInfographicAppIconEvents";
const S17_DIALOG_WIDTH         = 1400;  // הגליון מקטין אוטומטית לגודל החלון
const S17_DIALOG_HEIGHT        = 900;

// בניית דף התצוגה — משותף ליישום הווב (web) ולחלון בתוך הגליון (dialog)
function s17_renderPage(docKey, hostMode) {
  const payload = s17_buildPayload(docKey || "");
  payload.hostMode = hostMode;
  const template = HtmlService.createTemplateFromFile("App_Infographic");
  // הגנה מפני סגירת תגית script בתוך הנתונים
  template.dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");
  return template.evaluate()
    .setTitle("MedicalPilot — אינפוגרפיקה")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  return s17_renderPage(params.doc || "", "web");
}

// [Task #260] אייקון האינפוגרפיקה בגליון יומן_אירועים_רפואי — פותח את
// התצוגה בחלון גדול שמכסה את הגליון, על המסמך של השורה המסומנת (File_ID).
// יציאה — כפתור "סגור" בחלון, חזרה לגליון.
function runInfographicAppIconEvents() {
  try {
    const ui    = SpreadsheetApp.getUi();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    let fileId = "";
    const activeRow = sheet.getActiveCell().getRow();
    if (activeRow >= S17_FIRST_DATA_ROW) {
      const lastCol = sheet.getLastColumn();
      const headers = sheet.getRange(S17_HEADER_ROW, 1, 1, lastCol).getValues()[0];
      const fileCol = headers.indexOf("File_ID") + 1;
      if (fileCol > 0) {
        fileId = (sheet.getRange(activeRow, fileCol).getValue() || "").toString().trim();
      }
    }
    const html = s17_renderPage(fileId, "dialog")
      .setWidth(S17_DIALOG_WIDTH)
      .setHeight(S17_DIALOG_HEIGHT);
    ui.showModalDialog(html, "MedicalPilot — אינפוגרפיקה");
  } catch (e) {
    Logger.log("[S17] שגיאה ב-runInfographicAppIconEvents: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

// [Task #260] הכנסת אייקון האינפוגרפיקה לגליון יומן_אירועים_רפואי (עמודה E,
// שורה 2) ותווית בשורה 3. הרצה ידנית פעם אחת. לא מוחקת אייקונים אחרים, ולא
// משכפלת אם האייקון כבר קיים.
// שים לב: setupMedicalEventsIcons (ViewEngine.gs) מוחקת את כל האייקונים
// בגליון — אחרי הרצתה יש להריץ שוב את הפונקציה הזו.
function setupInfographicAppIconEvents() {
  try {
    const ui    = SpreadsheetApp.getUi();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S17_EVENTS_SHEET_NAME);
    if (!sheet) {
      ui.alert("❌ גליון '" + S17_EVENTS_SHEET_NAME + "' לא נמצא.");
      return;
    }
    const exists = sheet.getImages().some(function(img) {
      try { return img.getScript() === S17_EVENTS_ICON_SCRIPT; } catch (err) { return false; }
    });
    if (exists) {
      ui.alert("⚠️ האייקון כבר קיים בגליון — לא בוצע שינוי כדי למנוע שכפול.");
      return;
    }

    const col = S17_EVENTS_ICON_COL;
    const row = S17_EVENTS_ICON_ROW;
    const iconSize = Math.max(30, sheet.getRowHeight(row) - 4);
    const offsetX  = Math.max(0, Math.floor((sheet.getColumnWidth(col) - iconSize) / 2));

    const blob = DriveApp.getFileById(LAB_INFOGRAPHIC_TRIGGER_ICON_FILE_ID).getBlob();
    const img  = sheet.insertImage(blob, col, row);
    img.setAltTextTitle(S17_EVENTS_ICON_SCRIPT);
    img.assignScript(S17_EVENTS_ICON_SCRIPT);
    img.setWidth(iconSize);
    img.setHeight(iconSize);
    img.setAnchorCell(sheet.getRange(row, col));
    img.setAnchorCellXOffset(offsetX);
    img.setAnchorCellYOffset(2);

    const labelCell = sheet.getRange(3, col);
    labelCell.setValue(S17_EVENTS_LABEL);
    labelCell.setBackground("#00ACC1");
    labelCell.setFontColor("#ffffff");
    labelCell.setFontWeight("bold");
    labelCell.setFontSize(9);
    labelCell.setHorizontalAlignment("center");
    labelCell.setVerticalAlignment("middle");

    SpreadsheetApp.flush();
    ui.alert("✅ אייקון האינפוגרפיקה הוכנס לגליון '" + S17_EVENTS_SHEET_NAME + "', עמודה E.");
  } catch (e) {
    Logger.log("[S17] שגיאה ב-setupInfographicAppIconEvents: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

// הכללת קובץ HTML נוסף בתוך התבנית (App_BodyModels)
function s17_include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

// מקבילה ל-_s16_readCatalogBlock — מקבלת את הגליון כפרמטר
function s17_readCatalogBlock(codeSheet, mapFirstCol) {
  const options = [];
  if (!codeSheet) return options;
  const lastRow = codeSheet.getLastRow();
  if (lastRow < S17_FIRST_DATA_ROW) return options;
  const data = codeSheet.getRange(S17_FIRST_DATA_ROW, mapFirstCol,
    lastRow - S17_FIRST_DATA_ROW + 1, 5).getValues();
  data.forEach(function(rowVals) {
    const code = (rowVals[0] || "").toString().trim();
    if (!code) return;
    options.push({
      code: code,
      name: (rowVals[1] || "").toString().trim(),
      desc: (rowVals[2] || "").toString().trim(),
      raw:  (rowVals[3] || "").toString().trim()
    });
  });
  return options;
}

// קטלוגים במבנה ש-_labInfographic_buildRecord מצפה לו + בלוקים נוספים
function s17_buildCatalogs(ss) {
  const codeSheet = ss.getSheetByName(S17_CODE_MAP_SHEET_NAME);
  const catalogs = {
    organs: {}, eventFamilies: {}, certainty: {}, specialties: [],
    severity: {}, states: {}, sides: {}
  };
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_ORGAN).forEach(function(o) {
    catalogs.organs[o.code] = o.name;
  });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_EVENT).forEach(function(o) {
    catalogs.eventFamilies[o.code] = o.name;
  });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_SPECIALTY).forEach(function(o) {
    catalogs.specialties.push({ code: o.code, name: o.name || o.code });
  });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_SEVERITY).forEach(function(o) {
    catalogs.severity[o.code] = o.name;
  });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_CERTAINTY).forEach(function(o) {
    catalogs.certainty[o.code] = { name: o.name, raw: o.raw };
  });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_STATE).forEach(function(o) {
    catalogs.states[o.code] = o.name;
  });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_SIDE).forEach(function(o) {
    catalogs.sides[o.code] = o.name;
  });
  return catalogs;
}

// תאריך DD/MM/YYYY → חותמת זמן (או null)
function s17_dateToTs(text) {
  const m = (text || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : null;
}

// אייקונים כ-data URI, עם מטמון לפי מזהה קובץ (החלפת קובץ = מזהה חדש)
function s17_loadIcons(keys, iconMap) {
  const icons = {};
  const cache = CacheService.getScriptCache();
  const fileIdByKey = {};
  keys.forEach(function(key) {
    fileIdByKey[key] = key.indexOf("FILE:") === 0 ? key.substring(5) : (iconMap[key] || "");
  });
  const cacheKeys = [];
  Object.keys(fileIdByKey).forEach(function(key) {
    if (fileIdByKey[key]) cacheKeys.push(S17_ICON_CACHE_PREFIX + fileIdByKey[key]);
  });
  let cached = {};
  try { cached = cacheKeys.length ? cache.getAll(cacheKeys) : {}; } catch (e) { cached = {}; }

  const toStore = {};
  Object.keys(fileIdByKey).forEach(function(key) {
    const fileId = fileIdByKey[key];
    if (!fileId) { icons[key] = ""; return; }
    const ck = S17_ICON_CACHE_PREFIX + fileId;
    if (cached[ck]) { icons[key] = cached[ck]; return; }
    try {
      const uri = _labInfographic_blobToDataUri(fileId);
      icons[key] = uri;
      if (uri.length <= S17_ICON_CACHE_MAX_LEN) toStore[ck] = uri;
    } catch (e) {
      icons[key] = "";
    }
  });
  try {
    if (Object.keys(toStore).length) cache.putAll(toStore, S17_ICON_CACHE_SECONDS);
  } catch (e) {
    Logger.log("[S17] שמירת אייקונים במטמון נכשלה: " + e.message);
  }
  return icons;
}

// [Task #269] בלוק שיוך_איברים (CI-CM) במיפוי_קודים: Item_Code | Item_Type | Organ_Code |
// Link_Role (ראשי/משני) | Description. מחזיר מפה קוד פריט → { primary, secondary[] }.
// איבר ראשי אחד לפריט (הראשון שנמצא), משניים ללא הגבלה. קריאה בלבד.
const S17_MAP_COL_LINK = 87;  // CI-CM שיוך_איברים

function s17_readOrganLinks(codeSheet) {
  const links = {};
  if (!codeSheet) return links;
  const lastRow = codeSheet.getLastRow();
  if (lastRow < S17_FIRST_DATA_ROW) return links;
  codeSheet.getRange(S17_FIRST_DATA_ROW, S17_MAP_COL_LINK, lastRow - S17_FIRST_DATA_ROW + 1, 4).getValues()
    .forEach(function(r) {
      const item = (r[0] || "").toString().trim();
      const organ = (r[2] || "").toString().trim();
      if (!item || !organ) return;
      const link = links[item] || (links[item] = { primary: "", secondary: [] });
      if ((r[3] || "").toString().trim() === "ראשי") { if (!link.primary) link.primary = organ; }
      else if (link.secondary.indexOf(organ) === -1) link.secondary.push(organ);
    });
  return links;
}

// [שלב 3] נתוני המעבדה ללשונית "מעבדה" — כל השורות (כמו ביומן המצב), מקובצות
// לבדיקה לפי LOINC_Code (בלי קוד — לפי שם הבדיקה), כל בדיקה עם נקודות הזמן שלה.
// שם הבדיקה — השם הבינלאומי מקטלוג מאפייני המעבדה; סימון H/L/A — מעמודת הסטטוס
// (רשימה סגורה), ואם ריקה — מהשוואת הערך לטווח. קריאה בלבד.
function s17_buildLab(ss) {
  const result = { tests: [], panels: {} };
  const sheet = ss.getSheetByName(S17_LAB_SHEET_NAME);
  if (!sheet) return result;
  const codeSheet = ss.getSheetByName(S17_CODE_MAP_SHEET_NAME);
  const labNames = {};
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_LAB).forEach(function(o) { labNames[o.code] = o.name; });
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_PANEL).forEach(function(o) { result.panels[o.code] = o.name; });

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < S17_FIRST_DATA_ROW) return result;
  const headers = sheet.getRange(S17_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const col = {};
  headers.forEach(function(name, idx) { col[name] = idx; });
  const values = sheet.getRange(S17_FIRST_DATA_ROW, 1, lastRow - S17_FIRST_DATA_ROW + 1, lastCol).getValues();

  function cell(row, name) {
    const i = col[name];
    if (i === undefined) return "";
    const v = row[i];
    if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "dd/MM/yyyy");
    return (v === null || v === undefined) ? "" : v.toString().trim();
  }
  function num(text) {
    if (text === "") return null;
    const n = Number(String(text).replace(",", "."));
    return isNaN(n) ? null : n;
  }
  const STATUS_FLAG = { "תקין": "N", "גבוה": "H", "נמוך": "L", "לא תקין": "A" };

  const byKey = {};
  values.forEach(function(row) {
    const name = cell(row, "Test_Name");
    const loinc = cell(row, "LOINC_Code");
    const date = cell(row, "Test_Date");
    if (!name && !loinc) return;
    const key = loinc || ("NAME:" + name);
    let test = byKey[key];
    if (!test) {
      test = { key: key, loinc: loinc, name: (loinc && labNames[loinc]) || name,
               panel: cell(row, "Panel_Code"), system: cell(row, "Medical_System"),
               specimen: cell(row, "Specimen"), unit: cell(row, "Unit"), points: [] };
      byKey[key] = test;
      result.tests.push(test);
    }
    if (!test.unit) test.unit = cell(row, "Unit");
    const v = num(cell(row, "Value_Num"));
    const low = num(cell(row, "Ref_Low"));
    const high = num(cell(row, "Ref_High"));
    let flag = STATUS_FLAG[cell(row, "Status")] || "";
    if (!flag && v !== null) {
      flag = (low !== null && v < low) ? "L" : (high !== null && v > high) ? "H" : (low !== null || high !== null) ? "N" : "";
    }
    test.points.push({
      date: date, ts: s17_dateToTs(date), v: v, value: cell(row, "Value"),
      low: low, high: high, flag: flag,
      verified: cell(row, "Enrich_Status") === "מאומת",
      url: cell(row, "Source_URL"),
      file: cell(row, "File_ID")
    });
  });
  // [Task #269] איבר מטרה ואיברי ייחוס לכל בדיקה — ירושה: קוד הבדיקה (LOINC) ← הפאנל ←
  // מערכת הגוף (Medical_System, בלי איברי ייחוס). linkFrom = הרמה שממנה נלקח השיוך.
  const links = s17_readOrganLinks(codeSheet);
  result.tests.forEach(function(t) {
    t.points.sort(function(a, b) { return (a.ts || 0) - (b.ts || 0); });
    const own = t.loinc && links[t.loinc] && links[t.loinc].primary ? links[t.loinc] : null;
    const pnl = !own && t.panel && links[t.panel] && links[t.panel].primary ? links[t.panel] : null;
    const link = own || pnl;
    t.organ = link ? link.primary : t.system;
    t.secondary = link ? link.secondary.slice() : [];
    t.linkFrom = own ? "LOINC" : pnl ? "PNL" : "SYS";
  });
  return result;
}

// [שלב 4] קריאת גליון לרשימת אובייקטים לפי שמות הכותרות בשורה 4 (קריאה בלבד)
function s17_readSheetObjects(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < S17_FIRST_DATA_ROW) return [];
  const headers = sheet.getRange(S17_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(S17_FIRST_DATA_ROW, 1, lastRow - S17_FIRST_DATA_ROW + 1, lastCol).getValues();
  const out = [];
  values.forEach(function(row) {
    if (!row.some(function(v) { return v !== "" && v !== null; })) return;
    const obj = {};
    headers.forEach(function(name, i) {
      if (!name) return;
      const v = row[i];
      obj[name] = (v instanceof Date) ? Utilities.formatDate(v, Session.getScriptTimeZone(), "dd/MM/yyyy")
                : (v === null || v === undefined) ? "" : v.toString().trim();
    });
    out.push(obj);
  });
  return out;
}

// [Task #283] מספר המסמכים שנבדקו — File_ID שונים בגליון יומן_אירועים_רפואי (כל
// מסמך שעבר את S09). מוצג באזורי "לא תועד" בלשונית מצב נוכחי. עמודה לפי שם הכותרת
// בשורה 4; גליון או עמודה חסרים — 0. קריאה בלבד.
function s17_countSourceDocs(ss) {
  const sheet = ss.getSheetByName(S17_EVENTS_SHEET_NAME);
  if (!sheet) return 0;
  const lastRow = sheet.getLastRow();
  if (lastRow < S17_FIRST_DATA_ROW) return 0;
  const headers = sheet.getRange(S17_HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = headers.indexOf("File_ID") + 1;
  if (col < 1) return 0;
  const ids = {};
  sheet.getRange(S17_FIRST_DATA_ROW, col, lastRow - S17_FIRST_DATA_ROW + 1, 1).getValues()
    .forEach(function(r) { const v = (r[0] || "").toString().trim(); if (v) ids[v] = true; });
  return Object.keys(ids).length;
}

// [שלב 4] נתוני לשונית "עכשיו": תרופות (מאוחדות לפי החומר הפעיל — השורה עם
// תאריך ההתחלה המאוחר ביותר) והנחיות. קודים בלבד: INN מקטלוג התרופות, קוד הנחיה,
// סוג טיפול, מינון ותדירות מהעמודות המובנות. קריאה בלבד.
function s17_buildNow(ss) {
  const codeSheet = ss.getSheetByName(S17_CODE_MAP_SHEET_NAME);
  const atcNames = {};
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_ATC).forEach(function(o) { atcNames[o.code] = o.name; });
  const instrNames = {};
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_INSTR).forEach(function(o) { instrNames[o.code] = o.name; });

  const medsByKey = {};
  const meds = [];
  s17_readSheetObjects(ss, S17_MEDS_SHEET_NAME).forEach(function(r) {
    const atc = r["ATC_Code"] || "";
    const inn = (atc && atcNames[atc]) || (r["Active_Ingredient"] || r["Drug_Name"] || "").toLowerCase();
    if (!inn) return;
    const key = inn;  // איחוד לפי החומר הפעיל — שורה עם ATC ושורה בלי ATC של אותה תרופה מתאחדות
    const med = {
      key: key, atc: atc, inn: inn, system: r["Medical_System"] || "",
      dose: r["Dose_Amount"] || "", unit: r["Dose_Unit"] || "",
      perDay: r["Times_Per_Day"] || "", perWeek: r["Days_Per_Week"] || "",
      type: r["Treatment_Type"] || "", status: r["Status"] || "",
      start: r["Start_Date"] || "", end: r["End_Date"] || "",
      startTs: s17_dateToTs(r["Start_Date"]), endTs: s17_dateToTs(r["End_Date"]),
      verified: r["Enrich_Status"] === "מאומת", url: r["Source_URL"] || "", rows: 1
    };
    const prev = medsByKey[key];
    if (!prev) { medsByKey[key] = med; meds.push(med); return; }
    // איחוד לפי קוד — נשארת השורה המאוחרת (או המאומתת כשאין תאריך)
    const newer = (med.startTs || 0) > (prev.startTs || 0) ||
                  ((med.startTs || 0) === (prev.startTs || 0) && med.verified && !prev.verified);
    med.rows = prev.rows + 1;
    if (newer) { meds[meds.indexOf(prev)] = med; medsByKey[key] = med; } else { prev.rows = med.rows; }
  });

  const instructions = s17_readSheetObjects(ss, S17_INSTR_SHEET_NAME).map(function(r) {
    return {
      code: r["Instruction_Code"] || "", kind: r["Instruction_Kind"] || "",
      target: r["Target_Code"] || "", system: r["Medical_System"] || "",
      date: r["Instruction_Date"] || "", due: r["Due_Date"] || "",
      dateTs: s17_dateToTs(r["Instruction_Date"]), dueTs: s17_dateToTs(r["Due_Date"]),
      open: r["Status"] !== "בוצע", verified: r["Enrich_Status"] === "מאומת",
      url: r["Source_URL"] || ""
    };
  });

  return { meds: meds, instructions: instructions, atcNames: atcNames, instrNames: instrNames,
           docCount: s17_countSourceDocs(ss) };   // [Task #283] מסמכים שנבדקו — לאזורי "לא תועד"
}

// [שלב 4] נתוני לשונית "גנטיקה" — שורה לכל תכונה, מאוחדות לפי Trait_Code (נשארת
// השורה המאוחרת). קודים בלבד: קוד התכונה, השם מקטלוג התכונות (BM), פאנל PNL-G,
// דרגת נטייה (0-3), סמל גן / וריאנט / גנוטיפ, ACMG כקיצור. שורה בלי קוד תכונה —
// נשארת נפרדת (לא מאוחדת). קריאה בלבד.
function s17_buildGen(ss) {
  const codeSheet = ss.getSheetByName(S17_CODE_MAP_SHEET_NAME);
  const traitNames = {};
  s17_readCatalogBlock(codeSheet, S17_MAP_COL_TRAIT).forEach(function(o) { traitNames[o.code] = o.name; });

  const byKey = {};
  const traits = [];
  s17_readSheetObjects(ss, S17_GEN_SHEET_NAME).forEach(function(r, i) {
    const code = r["Trait_Code"] || "";
    const level = S17_GEN_TENDENCY_LEVEL.hasOwnProperty(r["Tendency"]) ? S17_GEN_TENDENCY_LEVEL[r["Tendency"]] : -1;
    const t = {
      key: code || ("ROW" + i), code: code, name: (code && traitNames[code]) || "",
      panel: r["Panel_Code"] || "PNL-G00", system: r["Medical_System"] || "",
      level: level, gene: r["Gene_Symbol"] || "", variant: r["Variant_ID"] || "",
      genotype: r["Genotype"] || "", acmg: S17_GEN_ACMG_ABBR[r["ACMG_Class"]] || "",
      date: r["Test_Date"] || "", dateTs: s17_dateToTs(r["Test_Date"]),
      verified: r["Enrich_Status"] === "מאומת", url: r["Source_URL"] || "",
      file: r["File_ID"] || "", files: r["File_ID"] ? [r["File_ID"]] : [], rows: 1
    };
    const prev = byKey[t.key];
    if (!prev) { byKey[t.key] = t; traits.push(t); return; }
    // כל המסמכים של התכונה נשמרים — להדגשת המסמך שסומן בגליון
    const files = prev.files.concat(t.files.filter(function(f) { return prev.files.indexOf(f) === -1; }));
    t.rows = prev.rows + 1;
    if ((t.dateTs || 0) >= (prev.dateTs || 0)) { t.files = files; traits[traits.indexOf(prev)] = t; byKey[t.key] = t; }
    else { prev.rows = t.rows; prev.files = files; }
  });
  return { traits: traits };
}

// [Task #271] פרופיל המטופל (שלב א) — מין ושנת לידה מהגליון פרופיל_מטופל (שורה 5).
// הגיל מחושב לפי השנה הנוכחית. ערך מין שאינו M/F, או שנה לא תקינה — נחשבים "לא תועד".
// demo=true כשמקור הנתון "הדגמה" — מסומן בתצוגה. גליון חסר — כל השדות ריקים. קריאה בלבד.
const S17_PROFILE_SHEET_NAME = "פרופיל_מטופל";

function s17_buildProfile(ss) {
  const rows = s17_readSheetObjects(ss, S17_PROFILE_SHEET_NAME);
  const r = rows.length ? rows[0] : {};
  const sexRaw = (r["Patient_Sex"] || "").toUpperCase();
  const sex = (sexRaw === "M" || sexRaw === "F") ? sexRaw : "";
  const year = parseInt(r["Birth_Year"], 10);
  const thisYear = new Date().getFullYear();
  const birthYear = (year >= 1900 && year <= thisYear) ? year : null;
  return {
    sex:       sex,
    birthYear: birthYear,
    age:       birthYear !== null ? thisYear - birthYear : null,
    source:    r["Data_Source"] || "",
    demo:      (r["Data_Source"] || "") === "הדגמה"
  };
}

// בניית כל הנתונים ליישום: רשומות, מסמכים, אייקונים, קטלוגים
function s17_buildPayload(requestedDocKey) {
  const ss    = SpreadsheetApp.openById(S17_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(S17_SOURCE_SHEET_NAME);
  if (!sheet) return { error: "הגליון " + S17_SOURCE_SHEET_NAME + " לא נמצא." };

  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(S17_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const colIndexByName = {};
  headers.forEach(function(name, idx) { colIndexByName[name] = idx + 1; });

  const iconMap  = _labInfographic_loadIconMap();
  const catalogs = s17_buildCatalogs(ss);

  function readExtra(rowValues, name) {
    const col = colIndexByName[name];
    if (!col) return "";
    const val = rowValues[col - 1];
    return (val === null || val === undefined) ? "" : val.toString().trim();
  }

  const records = [];
  if (lastRow >= S17_FIRST_DATA_ROW) {
    const allValues = sheet.getRange(S17_FIRST_DATA_ROW, 1,
      lastRow - S17_FIRST_DATA_ROW + 1, lastCol).getValues();
    allValues.forEach(function(rowValues, i) {
      const rowNum = S17_FIRST_DATA_ROW + i;
      const rec = _labInfographic_buildRecord(rowNum, rowValues, colIndexByName, iconMap, catalogs);
      if (!rec) return;
      rec.eventName     = rec.eventCode ? (catalogs.eventFamilies[rec.eventCode] || "") : "";
      rec.sideCode      = readExtra(rowValues, "Organ_Side_Code");
      rec.stateCode     = readExtra(rowValues, "Organ_State_Code");
      rec.findingTerm   = readExtra(rowValues, "Finding_Term");
      rec.findingSize   = readExtra(rowValues, "Finding_Size");
      rec.findingCause  = readExtra(rowValues, "Finding_Cause");
      rec.fileId        = readExtra(rowValues, "File_ID");
      rec.sourceUrl     = readExtra(rowValues, "Source_URL");
      rec.primaryDx     = readExtra(rowValues, "Primary_Diagnosis");
      rec.allergenCode  = readExtra(rowValues, "Allergen_Code");
      // [Task #269] איברי ייחוס (משניים) — עמודה 30, קודי איבר מופרדים בפסיק
      rec.secondary     = readExtra(rowValues, "Secondary_Organs").split(",")
        .map(function(s) { return s.trim(); }).filter(Boolean);
      rec.verified      = rec.recordStatus === "מאומת";
      records.push(rec);
    });
  }

  // קיבוץ למסמכים לפי File_ID (שורה בלי File_ID — מסמך משלה)
  const docsByKey = {};
  const docs = [];
  records.forEach(function(rec, idx) {
    const key = rec.fileId || ("ROW" + rec.row);
    let doc = docsByKey[key];
    if (!doc) {
      doc = { key: key, sourceUrl: rec.sourceUrl, issuer: rec.docIssuer,
              date: "", ts: null, recordIdx: [], headIdx: -1 };
      docsByKey[key] = doc;
      docs.push(doc);
    }
    doc.recordIdx.push(idx);
    if (!doc.sourceUrl && rec.sourceUrl) doc.sourceUrl = rec.sourceUrl;
    if (!doc.issuer && rec.docIssuer) doc.issuer = rec.docIssuer;
    // תאריך המסמך = התאריך המאוחר ביותר בשורותיו (מחלות רקע מתוארכות לעבר)
    const ts = s17_dateToTs(rec.eventDate);
    if (ts !== null && (doc.ts === null || ts > doc.ts)) { doc.ts = ts; doc.date = rec.eventDate; }
    // שורת הכותרת: הראשונה ממשפחת בדיקה/אשפוז, אחרת השורה הראשונה
    const fam = rec.eventCode ? rec.eventCode.substring(0, 2) : "";
    const headFam = doc.headIdx >= 0 ? (records[doc.headIdx].eventCode || "").substring(0, 2) : "";
    if (doc.headIdx < 0 ||
        (S17_DOC_EVENT_FAMILIES.indexOf(fam) !== -1 && S17_DOC_EVENT_FAMILIES.indexOf(headFam) === -1)) {
      doc.headIdx = idx;
    }
  });
  docs.sort(function(a, b) {
    if (a.ts === null && b.ts === null) return 0;
    if (a.ts === null) return 1;
    if (b.ts === null) return -1;
    return a.ts - b.ts;
  });

  // מסמך פתיחה: לפי פרמטר doc בקישור, אחרת המסמך המתוארך האחרון
  let startDoc = docs.length - 1;
  for (let j = docs.length - 1; j >= 0; j--) {
    if (docs[j].ts !== null) { startDoc = j; break; }
  }
  // requestedFound=false — המסמך שהתבקש עוד לא חולץ ליומן_מצב_רפואי
  let requestedFound = false;
  if (requestedDocKey) {
    docs.forEach(function(d, i) { if (d.key === requestedDocKey) { startDoc = i; requestedFound = true; } });
  }

  // אייקונים — כל מפתח פעם אחת
  const keySet = {};
  records.forEach(function(r) {
    [r.systemIconKey, r.organ.iconKey, r.markerIconKey, r.eventIconKey, r.recoIconKey]
      .forEach(function(k) { if (k) keySet[k] = true; });
  });
  if (iconMap["RECO"]) keySet["RECO"] = true;

  // [שלב 3] מעבדה — ואייקון מערכת הגוף לכל פאנל (לפי Medical_System)
  const lab = s17_buildLab(ss);
  lab.tests.forEach(function(t) { if (t.system && iconMap[t.system]) keySet[t.system] = true; });
  // [שלב 4] עכשיו — תרופות והנחיות, ואייקון מערכת לכל אחת
  const now = s17_buildNow(ss);
  now.meds.concat(now.instructions).forEach(function(x) {
    if (x.system && iconMap[x.system]) keySet[x.system] = true;
  });
  // [שלב 4] גנטיקה — תכונות, ואייקון מערכת לכל אחת
  const gen = s17_buildGen(ss);
  gen.traits.forEach(function(t) { if (t.system && iconMap[t.system]) keySet[t.system] = true; });
  // [שלב 3] המסמך של השורה המסומנת לא ביומן המצב — אולי הוא מסמך מעבדה או גנטיקה
  let requestedWhere = requestedDocKey ? (requestedFound ? "found" : "missing") : "";
  if (requestedWhere === "missing" && lab.tests.some(function(t) {
        return t.points.some(function(pt) { return pt.file === requestedDocKey; }); })) {
    requestedWhere = "lab";
  }
  if (requestedWhere === "missing" && gen.traits.some(function(t) { return t.files.indexOf(requestedDocKey) !== -1; })) {
    requestedWhere = "gen";
  }
  const icons = s17_loadIcons(Object.keys(keySet), iconMap);

  const systemNames = {};
  if (typeof S13_BODY_SYSTEMS !== "undefined") {
    Object.keys(S13_BODY_SYSTEMS).forEach(function(code) {
      systemNames[code] = S13_BODY_SYSTEMS[code].nameHe;
    });
  }

  return {
    records:     records,
    docs:        docs,
    startDoc:    startDoc,
    requested:   requestedWhere,
    requestedKey: requestedDocKey,
    icons:       icons,
    systemNames: systemNames,
    organNames:  catalogs.organs,
    severity:    catalogs.severity,
    states:      catalogs.states,
    sides:       catalogs.sides,
    // [שלב 2] סינון לפי התמחות — רשימת ההתמחויות מהקטלוג וטבלת הכללים מ-ViewEngine.gs
    specialties:     catalogs.specialties,
    specialtyFilter: (typeof LAB_INFOGRAPHIC_SPECIALTY_FILTER !== "undefined") ? LAB_INFOGRAPHIC_SPECIALTY_FILTER : {},
    lab:         lab,
    now:         now,
    gen:         gen,
    profile:     s17_buildProfile(ss),   // [Task #271] פרופיל מטופל — פס עליון ובחירת דמות הגוף
    builtAt:     Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm")
  };
}
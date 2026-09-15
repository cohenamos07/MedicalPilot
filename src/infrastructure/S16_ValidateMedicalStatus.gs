/**
 * MedicalPilot — S16_ValidateMedicalStatus.gs
 * @version     1.0.0 | @updated 03/09/2026 19:51 | @service S16
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S16_ValidateMedicalStatus.gs
 * @description שער אימות אנושי לקודים שנקבעו אוטומטית ע"י Gemini/S13 בגליון
 *              יומן_מצב_רפואי: קוד מערכת גוף (Medical_System, עמ' 10) מוצג
 *              כ-select סגור מתוך S13_BODY_SYSTEMS (S13_ExtractMedical.gs);
 *              קוד אירוע (ET_CODE, עמ' 11) מוצג לעריכה חופשית מתוך קטלוג
 *              מיפוי_קודים, עם מנגנון "קוד חדש" (כתיבה/עדכון לקטלוג) בדומה
 *              ל-S10. מחליף את הספוט-צ'ק הקודם (runVerifyIconMedicalStatus,
 *              ViewEngine.gs — הוסר, Task #210). משתמש ב-Record_Status
 *              הקיים (עמ' 7, "חדש"→"מאומת") — ללא עמודת סטטוס חדשה.
 * @impacts     יומן_מצב_רפואי: קורא שורה בודדת (15 עמודות), כותב
 *              Medical_System (J), ET_CODE (K), Event_Type_Normalized (O),
 *              Record_Status (G) — ברמת השורה הפעילה בלבד.
 *              מיפוי_קודים: קורא (_codeMap_buildLookup, ViewEngine.gs),
 *              כותב/מעדכן שורת קוד_אירוע (s16_saveEventCode, כפתור נפרד).
 *              תלויות: S16_Sidebar.html, ViewEngine.gs (MEDICAL_STATUS_
 *              SHEET_NAME, CODE_MAP_*, _codeMap_buildLookup), S13_
 *              ExtractMedical.gs (S13_BODY_SYSTEMS), COLUMN_MAP.gs
 *              (SHEET_CONFIG).
 * @callers     ViewEngine.gs (אייקון "[ אימות ]", MEDICAL_STATUS_ICON_MAP —
 *              script: "showS16Sidebar")
 * @functions   showS16Sidebar | _s16_buildPayload | _s16_formatDate |
 *              s16_loadRowData | s16_loadRowByNumber | s16_approve |
 *              s16_saveEventCode | _s16_saveEventCodeToMap |
 *              _s16_getCurrentPayload
 * @changes     [v1.0.0] Task #210 — גרסה ראשונה.
 */

// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S16_PROP_KEY = "S16_CURRENT_PAYLOAD";

// אינדקסי עמודות יומן_מצב_רפואי (ראה COLUMN_MAP.gs) — קבועים מקומיים לבהירות
const S16_COL_EVENT_TYPE        = 2;
const S16_COL_PRIMARY_DIAGNOSIS = 4;
const S16_COL_SEVERITY_STATUS   = 5;
const S16_COL_RECOMMENDATIONS   = 6;
const S16_COL_RECORD_STATUS     = 7;
const S16_COL_DOC_ISSUER        = 8;
const S16_COL_MEDICAL_SYSTEM    = 10;
const S16_COL_ET_CODE           = 11;
const S16_COL_FILE_ID           = 12;
const S16_COL_SOURCE_URL        = 13;
const S16_COL_EVENT_TYPE_NORM   = 15;

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
    .setWidth(900)
    .setHeight(650)
    .setTitle("S16 — אימות מצב רפואי");

  ui.showModalDialog(html, "🩺 S16 — " + MEDICAL_STATUS_SHEET_NAME + " | שורה " + row);
}

// ══════════════════════════════════════════════════════════════════
// בניית Payload — נתוני שורה מלאים לממשק
// ══════════════════════════════════════════════════════════════════

function _s16_buildPayload(ss, sheet, row) {
  try {
    const firstDataRow = SHEET_CONFIG[MEDICAL_STATUS_SHEET_NAME].FIRST_DATA_ROW;
    const lastRow       = sheet.getLastRow();
    if (lastRow < firstDataRow) return null;

    const rowValues = sheet.getRange(row, 1, 1, 15).getValues()[0];

    const eventType      = (rowValues[S16_COL_EVENT_TYPE - 1] || "").toString().trim();
    const currentSysCode = (rowValues[S16_COL_MEDICAL_SYSTEM - 1] || "").toString().trim();
    const currentEtCode  = (rowValues[S16_COL_ET_CODE - 1] || "").toString().trim();
    const currentEtNorm  = (rowValues[S16_COL_EVENT_TYPE_NORM - 1] || "").toString().trim();
    const fileId          = (rowValues[S16_COL_FILE_ID - 1] || "").toString().trim();
    let   sourceUrl        = (rowValues[S16_COL_SOURCE_URL - 1] || "").toString().trim();
    if (!sourceUrl && fileId) sourceUrl = "https://drive.google.com/file/d/" + fileId + "/view";

    // select סגור — מ-S13_BODY_SYSTEMS (S13_ExtractMedical.gs), לא ממיפוי דינמי
    const bodySystemOptions = Object.keys(S13_BODY_SYSTEMS).map(function(code) {
      return { code: code, nameHe: S13_BODY_SYSTEMS[code].nameHe };
    });

    // קטלוג קודי אירוע — דינמי, מגליון מיפוי_קודים (בדומה ל-S10)
    const eventTypeMap    = _codeMap_buildLookup(CODE_MAP_TYPE_EVENT);
    const eventSuggestion = eventTypeMap[eventType] || null;

    return {
      row:               row,
      lastRow:           lastRow,
      firstDataRow:      firstDataRow,
      eventDate:         _s16_formatDate(rowValues[0]),
      eventType:         eventType,
      primaryDiagnosis:  (rowValues[S16_COL_PRIMARY_DIAGNOSIS - 1] || "").toString(),
      severityStatus:    (rowValues[S16_COL_SEVERITY_STATUS - 1] || "").toString(),
      recommendations:   (rowValues[S16_COL_RECOMMENDATIONS - 1] || "").toString(),
      docIssuer:         (rowValues[S16_COL_DOC_ISSUER - 1] || "").toString(),
      recordStatus:      (rowValues[S16_COL_RECORD_STATUS - 1] || "").toString(),
      sourceUrl:         sourceUrl,
      currentSysCode:    currentSysCode || "SYS00",
      currentEtCode:     currentEtCode,
      currentEtNorm:     currentEtNorm,
      bodySystemOptions: bodySystemOptions,
      eventSuggestion:   eventSuggestion
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
// כפתור — אישור (כותב קוד מערכת + קוד אירוע + Record_Status="מאומת")
// ══════════════════════════════════════════════════════════════════

function s16_approve(row, systemCode, eventCode, eventNormalizedName) {
  try {
    if (!systemCode || !S13_BODY_SYSTEMS[systemCode]) {
      return { success: false, msg: "⚠️ קוד מערכת לא תקין: " + systemCode };
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MEDICAL_STATUS_SHEET_NAME);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + MEDICAL_STATUS_SHEET_NAME };

    sheet.getRange(row, S16_COL_MEDICAL_SYSTEM).setValue(systemCode);
    sheet.getRange(row, S16_COL_ET_CODE).setValue(eventCode || MEDICAL_STATUS_EVENT_TYPE_DEFAULT_CODE);
    sheet.getRange(row, S16_COL_EVENT_TYPE_NORM).setValue(eventNormalizedName || "");
    sheet.getRange(row, S16_COL_RECORD_STATUS).setValue("מאומת");

    Logger.log("[S16] אישור שורה " + row + " — SYS: " + systemCode + " | ET_CODE: " + eventCode);
    return { success: true, msg: "✅ השורה אושרה" };

  } catch (e) {
    Logger.log("[S16] s16_approve שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור נפרד — עדכון קטלוג קודי אירוע (מיפוי_קודים), ללא קשר לאישור השורה
// ══════════════════════════════════════════════════════════════════

function s16_saveEventCode(rawText, code, normalizedName) {
  try {
    if (!rawText || !code) {
      return { success: false, msg: "❌ חסר טקסט אירוע או קוד" };
    }
    return _s16_saveEventCodeToMap(rawText, code, normalizedName);
  } catch (e) {
    Logger.log("[S16] s16_saveEventCode שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

function _s16_saveEventCodeToMap(rawText, code, normalizedName) {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const codeSheet = ss.getSheetByName(CODE_MAP_SHEET_NAME);
    if (!codeSheet) return { success: false, msg: "❌ גליון '" + CODE_MAP_SHEET_NAME + "' לא נמצא" };

    const firstDataRow = (SHEET_CONFIG[CODE_MAP_SHEET_NAME] && SHEET_CONFIG[CODE_MAP_SHEET_NAME].FIRST_DATA_ROW) || 5;
    const lastRow       = codeSheet.getLastRow();
    let existingRow      = null;

    if (lastRow >= firstDataRow) {
      const data = codeSheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 4).getValues();
      for (let i = 0; i < data.length; i++) {
        const rowType = (data[i][0] || "").toString().trim();
        const rowRaw  = (data[i][3] || "").toString().trim();
        if (rowType === CODE_MAP_TYPE_EVENT && rowRaw === rawText) {
          existingRow = firstDataRow + i;
          break;
        }
      }
    }

    if (existingRow) {
      codeSheet.getRange(existingRow, 2, 1, 2).setValues([[code, normalizedName || ""]]);
      Logger.log("[S16] קוד אירוע עודכן במיפוי_קודים — " + code + " | " + rawText);
      return { success: true, updated: true };
    }

    codeSheet.appendRow([CODE_MAP_TYPE_EVENT, code, normalizedName || "", rawText]);
    Logger.log("[S16] קוד אירוע חדש נוסף למיפוי_קודים — " + code + " | " + rawText);
    return { success: true, updated: false };

  } catch (e) {
    Logger.log("[S16] _s16_saveEventCodeToMap שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה בשמירת קוד אירוע: " + e.message };
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
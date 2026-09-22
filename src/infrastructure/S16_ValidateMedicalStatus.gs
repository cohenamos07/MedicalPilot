/**
 * MedicalPilot — S16_ValidateMedicalStatus.gs
 * @version     2.0.0 | @updated 18/09/2026 17:45 | @service S16
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
 * @impacts     יומן_מצב_רפואי: קורא שורה בודדת (21 עמודות), כותב
 *              Medical_System(18), Event_Code(11)+Event_Description(12),
 *              Specialty_Name(9)+Specialty_Code(19),
 *              Severity_Name(13)+Severity_Code(20),
 *              Diagnosis_Name(14)+Diagnosis_Code(21),
 *              Diagnosis_Certainty(15), Record_Status(7) — ברמת השורה
 *              הפעילה בלבד. Event_Type(2)/Doc_Issuer(6) נקראים בלבד —
 *              לעולם לא נכתבים (טקסט גולמי מ-S13/Gemini).
 *              מיפוי_קודים: קורא (4 בלוקים פתוחים: E-I/J-N/O-S/T-X, בלוק
 *              Y-AC לקריאה בלבד), כותב/מעדכן שורות קוד בבלוקים הפתוחים דרך
 *              s16_saveCatalogCode (כפתור נפרד לכל שדה, ללא קשר לאישור
 *              השורה).
 *              תלויות: S16_Sidebar.html, COLUMN_MAP.gs (SHEET_CONFIG),
 *              ViewEngine.gs (MEDICAL_STATUS_SHEET_NAME, CODE_MAP_SHEET_NAME),
 *              S13_ExtractMedical.gs (S13_BODY_SYSTEMS).
 * @callers     ViewEngine.gs (אייקון "[ S16 אימות ]", MEDICAL_STATUS_ICON_MAP —
 *              script: "showS16Sidebar")
 * @functions   showS16Sidebar | _s16_buildPayload | _s16_buildFieldPayload |
 *              _s16_readCatalogBlock | _s16_formatDate | s16_loadRowData |
 *              s16_loadRowByNumber | s16_approve | s16_saveCatalogCode |
 *              _s16_saveCatalogCode | _s16_getCurrentPayload
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

// אינדקסי עמודות יומן_מצב_רפואי (ראה COLUMN_MAP.gs, מבנה 21 עמודות)
const S16_COL_EVENT_DATE          = 1;
const S16_COL_EVENT_TYPE          = 2;  // גולמי (S13/Gemini) — לעולם לא נכתב מ-S16
const S16_COL_PRIMARY_DIAGNOSIS   = 3;
const S16_COL_SEVERITY_STATUS     = 4;
const S16_COL_RECOMMENDATIONS     = 5;
const S16_COL_DOC_ISSUER          = 6;  // גולמי — לעולם לא נכתב מ-S16
const S16_COL_RECORD_STATUS       = 7;
const S16_COL_SPECIALTY_NAME      = 9;
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

// בלוק וודאות אבחנה במיפוי_קודים (Y-AC, עמודה 25) — בחירה סגורה פשוטה,
// 4 ערכים קבועים (CRT0-CRT3), בלי מנגנון הוספת-קוד-חדש.
const S16_CERTAINTY_MAP_FIRST_COL = 25;

// [Task #214] מנוע גנרי — קטלוג פתוח משותף ל-4 סוגי קוד. כל רשומה מצביעה
// לבלוק העמודות שלה במיפוי_קודים (5 עמודות רצופות: Code|Normalized_Value|
// Description|Raw_Value|Icon_Link) ולעמודות הקריאה/כתיבה ביומן_מצב_רפואי.
// journalRawCol — עמודת הטקסט המשמש לחיפוש/הצעה מהקטלוג (לא נכתב מעולם,
// חוץ מ-specialty/severity/diagnosis שם הוא זהה ל-journalNameCol בכוונה —
// עמודות אלו כבר מיועדות לערך מהקטלוג, לא לטקסט גולמי מ-Gemini).
const S16_CODE_FIELDS = [
  { key: "eventCode", label: "קוד אירוע", mapFirstCol: 5,  journalRawCol: S16_COL_EVENT_TYPE,    journalCodeCol: S16_COL_EVENT_CODE,     journalNameCol: S16_COL_EVENT_DESCRIPTION },
  { key: "specialty", label: "התמחות",   mapFirstCol: 10, journalRawCol: S16_COL_SPECIALTY_NAME, journalCodeCol: S16_COL_SPECIALTY_CODE, journalNameCol: S16_COL_SPECIALTY_NAME },
  { key: "severity",  label: "חומרה",     mapFirstCol: 15, journalRawCol: S16_COL_SEVERITY_NAME,  journalCodeCol: S16_COL_SEVERITY_CODE,  journalNameCol: S16_COL_SEVERITY_NAME },
  { key: "diagnosis", label: "אבחנה",     mapFirstCol: 20, journalRawCol: S16_COL_DIAGNOSIS_NAME, journalCodeCol: S16_COL_DIAGNOSIS_CODE, journalNameCol: S16_COL_DIAGNOSIS_NAME }
];

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
    const hasAny = code || name || raw || (rowVals[2] || "") || (rowVals[4] || "");
    if (hasAny) result.lastBlockRow = rowNum;
    if (code) result.options.push({ code: code, name: name, raw: raw, row: rowNum });
  });
  return result;
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
// בניית Payload — נתוני שורה מלאים לממשק
// ══════════════════════════════════════════════════════════════════

function _s16_buildPayload(ss, sheet, row) {
  try {
    const firstDataRow = SHEET_CONFIG[MEDICAL_STATUS_SHEET_NAME].FIRST_DATA_ROW;
    const lastRow       = sheet.getLastRow();
    if (lastRow < firstDataRow) return null;

    const rowValues = sheet.getRange(row, 1, 1, 21).getValues()[0];

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
// ══════════════════════════════════════════════════════════════════

function s16_approve(row, systemCode, certaintyCode, fieldValues) {
  try {
    if (!systemCode || !S13_BODY_SYSTEMS[systemCode]) {
      return { success: false, msg: "⚠️ קוד מערכת לא תקין: " + systemCode };
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MEDICAL_STATUS_SHEET_NAME);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + MEDICAL_STATUS_SHEET_NAME };

    sheet.getRange(row, S16_COL_MEDICAL_SYSTEM).setValue(systemCode);
    sheet.getRange(row, S16_COL_DIAGNOSIS_CERTAINTY).setValue(certaintyCode || "");

    S16_CODE_FIELDS.forEach(function(cfg) {
      const val = (fieldValues && fieldValues[cfg.key]) || {};
      sheet.getRange(row, cfg.journalCodeCol).setValue(val.code || "");
      sheet.getRange(row, cfg.journalNameCol).setValue(val.name || "");
    });

    sheet.getRange(row, S16_COL_RECORD_STATUS).setValue("מאומת");

    Logger.log("[S16] אישור שורה " + row + " — SYS:" + systemCode + " | CERT:" + certaintyCode);
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
    const fieldCfg = S16_CODE_FIELDS.filter(function(c) { return c.key === fieldKey; })[0];
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
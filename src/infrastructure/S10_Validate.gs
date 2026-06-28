/**
 * MedicalPilot — S10_Validate.gs
 * @version 1.0.3 | @updated 28/06/2026 20:25 | @service S10
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S10_Validate.gs
 * @impacts אימות ידני ולמידה של אירועים רפואיים שחולצו על ידי S09.
 *          קריאה: גליונות יעד של S09 + ניהול_מיילים (TXT_URL לפי File_ID).
 *          כתיבה: S10_למידה_רפואי + גליון היעד הפעיל (עדכון שדות).
 *          תלויות: S10_Sidebar.html, COLUMN_MAP.gs.
 *          מופעל מהתפריט — ממשק Dialog לעריכה ואישור אירועים.
 * שינוי: [v1.0.3] [Task 66] תיקון sourceUrl ב-_s10_buildPayload — עבור
 *         "יומן_אירועים_רפואי" config.sourceCol(6) הוא בפועל Routing_Category
 *         (Task 65 לא כותב sourceUrl לגליון הזה), לא URL. ה-iframe ב-Sidebar
 *         ניסה לטעון תצוגה מטקסט קטגוריה וקיבל "לא ניתן לפתוח את הקובץ".
 *         נוסף fallback: אם הערך שנקרא אינו מתחיל ב-http, נבנה קישור Drive
 *         ישירות מ-fileId (שהוא עצמו File_ID של המסמך המקורי — אומת בפועל).
 *         לא משפיע על שאר 5 הגליונות — sourceCol שלהם תקין ומכיל URL אמיתי.
 *         [v1.0.2] [Task 66] תיקון fileIdCol עבור "יומן_אירועים_רפואי" מ-8 ל-7 —
 *         S10_SHEET_CONFIG ציפה ל-Source_FileID בעמודה H (לפי Task 64), אבל
 *         S09_ExtractMedical (מ-Task 65) כותב את File_ID בפועל לעמודה G(7).
 *         זה גרם ל-"לא ניתן לטעון נתוני שורה" — payload חזר null כי fileId
 *         נקרא מעמודה ריקה. אומת בפועל על שורה 5 — היה ריק. תיקון נקודתי
 *         בלבד — sourceCol (6) לא שונה: ידוע שהוא כרגע מצביע על
 *         Routing_Category ולא על Source_URL בפועל — ממצא נפרד, לא בסקופ.
 *         [v1.0.1] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *         [v1.0.0] גרסה ראשונה
 */
// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S10_LEARNING_SHEET  = "S10_למידה_רפואי";
const S10_SOURCE_SHEET    = "ניהול_מיילים";

// מבנה כל גליון יעד:
// fileIdCol  — עמודת File_ID בגליון
// sourceCol  — עמודת Source_URL בגליון
// fields     — שדות הניתנים לאימות ועריכה: { label, col }
const S10_SHEET_CONFIG = {
  "יומן_אירועים_רפואי": {
    icon:      "🏥",
    fileIdCol: 7,
    sourceCol: 6,
    fields: [
      { label: "תאריך אירוע",  col: 1 },
      { label: "סוג אירוע",    col: 2 },
      { label: "מערכת רפואית", col: 3 },
      { label: "מוסד / רופא",  col: 4 },
      { label: "סיכום ממצא",   col: 5 }
    ]
  },
  "תרופות_קבועות": {
    icon:      "💊",
    fileIdCol: 11,
    sourceCol: 10,
    fields: [
      { label: "שם תרופה",      col: 1 },
      { label: "חומר פעיל",     col: 2 },
      { label: "מינון",          col: 3 },
      { label: "תדירות",         col: 4 },
      { label: "סיבת טיפול",    col: 5 },
      { label: "תאריך התחלה",   col: 6 },
      { label: "תאריך סיום",    col: 7 },
      { label: "סטטוס",          col: 8 }
    ]
  },
  "יומן_מצב_רפואי": {
    icon:      "📋",
    fileIdCol: 9,
    sourceCol: 8,
    fields: [
      { label: "תאריך אירוע",    col: 1 },
      { label: "סוג אירוע",      col: 2 },
      { label: "מערכת / איבר",   col: 3 },
      { label: "מוסד / רופא",    col: 4 },
      { label: "אבחנה עיקרית",   col: 5 },
      { label: "חומרת מצב",      col: 6 },
      { label: "המלצות קצרות",   col: 7 }
    ]
  },
  "בדיקות_דם": {
    icon:      "🩸",
    fileIdCol: 9,
    sourceCol: 8,
    fields: [
      { label: "תאריך בדיקה",  col: 1 },
      { label: "שם בדיקה",     col: 2 },
      { label: "קטגוריה",       col: 3 },
      { label: "ערך",           col: 4 },
      { label: "טווח נורמה",   col: 5 },
      { label: "סטטוס",         col: 6 },
      { label: "הערת רופא",    col: 7 }
    ]
  },
  "בדיקות_גנטיות": {
    icon:      "🧬",
    fileIdCol: 8,
    sourceCol: 7,
    fields: [
      { label: "תאריך בדיקה",    col: 1 },
      { label: "שם פאנל",        col: 2 },
      { label: "גן / וריאנט",    col: 3 },
      { label: "ממצא",            col: 4 },
      { label: "משמעות קלינית",  col: 5 },
      { label: "המלצה",           col: 6 }
    ]
  },
  "הנחיות_רפואיות_ומשימות": {
    icon:      "📌",
    fileIdCol: 8,
    sourceCol: 7,
    fields: [
      { label: "תאריך הנחיה",  col: 1 },
      { label: "מקור",          col: 2 },
      { label: "תיאור משימה",  col: 3 },
      { label: "סוג משימה",    col: 4 },
      { label: "תאריך יעד",    col: 5 },
      { label: "סטטוס",         col: 6 }
    ]
  }
};

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — פתיחת חלון אימות
// ══════════════════════════════════════════════════════════════════

function showS10Sidebar() {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName   = activeSheet.getName();
  const ui          = SpreadsheetApp.getUi();

  // בדיקה שהגליון הפעיל הוא אחד מגליונות היעד
  if (!S10_SHEET_CONFIG[sheetName]) {
    ui.alert(
      "⛔ גליון לא נתמך\n\n" +
      "יש לעמוד על אחד מהגליונות הבאים:\n" +
      Object.keys(S10_SHEET_CONFIG).join("\n")
    );
    return;
  }

  const row = activeSheet.getActiveCell().getRow();
  if (row < 2) {
    ui.alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  const payload = _s10_buildPayload(ss, activeSheet, sheetName, row);
  if (!payload) {
    ui.alert("❌ לא ניתן לטעון נתוני שורה " + row);
    return;
  }

  // שמירת payload ב-ScriptProperties להעברה ל-HTML
  PropertiesService.getScriptProperties().setProperty(
    "S10_CURRENT_PAYLOAD",
    JSON.stringify(payload)
  );

  const html = HtmlService
    .createTemplateFromFile("S10_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S10 — אימות אירועים");

  ui.showModalDialog(html, payload.icon + " S10 — " + sheetName + " | שורה " + row);
}

// ══════════════════════════════════════════════════════════════════
// בניית Payload — נתוני שורה מלאים לממשק
// ══════════════════════════════════════════════════════════════════

function _s10_buildPayload(ss, sheet, sheetName, row) {
  try {
    const config   = S10_SHEET_CONFIG[sheetName];
    const fileId   = (sheet.getRange(row, config.fileIdCol).getValue() || "").toString().trim();
    let sourceUrl = (sheet.getRange(row, config.sourceCol).getValue() || "").toString().trim();

    if (!fileId) return null;

    // [v1.0.3 — Task 66] fallback: אם הערך בעמודת sourceCol אינו URL בפועל
    // (למשל "יומן_אירועים_רפואי" — Task 65 לא כותב sourceUrl לשם, העמודה
    // היא בפועל Routing_Category) — נבנה קישור Drive ישירות מ-fileId,
    // שהוא בעצמו ה-File_ID של המסמך המקורי.
    if (!sourceUrl.startsWith("http")) {
      sourceUrl = "https://drive.google.com/file/d/" + fileId + "/view";
    }

    // חישוב Split_Index — X/Y בזמן טעינה
    const splitData = _s10_calcSplitIndex(sheet, row, config.fileIdCol, fileId);

    // שליפת TXT_URL מניהול_מיילים לפי fileId
    const txtUrl = _s10_fetchTxtUrl(ss, fileId);

    // שליפת שדות
    // שליפת שדות
    // [Task 66] עיצוב Date אמיתי כ-DD/MM/YYYY במקום toString() גולמי
    const fields = config.fields.map(function(f) {
      const rawValue = sheet.getRange(row, f.col).getValue();
      let value;
      if (rawValue instanceof Date) {
        value = Utilities.formatDate(rawValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
      } else {
        value = (rawValue || "").toString();
      }
      return { label: f.label, col: f.col, value: value };
    });

    // שליפת lastRow בגליון הפעיל
    const lastRow = sheet.getLastRow();

    return {
      row:        row,
      lastRow:    lastRow,
      sheetName:  sheetName,
      icon:       config.icon,
      fileId:     fileId,
      sourceUrl:  sourceUrl,
      txtUrl:     txtUrl,
      splitX:     splitData.x,
      splitY:     splitData.y,
      splitLabel: splitData.x + "/" + splitData.y,
      siblingRows: splitData.siblingRows,
      fields:     fields
    };

  } catch (e) {
    Logger.log("[S10] _s10_buildPayload שגיאה: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// חישוב Split_Index — X/Y לפי fileId בגליון
// ══════════════════════════════════════════════════════════════════

function _s10_calcSplitIndex(sheet, currentRow, fileIdCol, fileId) {
  const lastRow    = sheet.getLastRow();
  const siblingRows = [];

  if (lastRow < 2) return { x: 1, y: 1, siblingRows: [currentRow] };

  const allFileIds = sheet.getRange(2, fileIdCol, lastRow - 1, 1).getValues();

  for (let i = 0; i < allFileIds.length; i++) {
    const id = (allFileIds[i][0] || "").toString().trim();
    if (id === fileId) siblingRows.push(i + 2); // +2 כי מתחילים משורה 2
  }

  const x = siblingRows.indexOf(currentRow) + 1;
  const y = siblingRows.length;

  return { x: x > 0 ? x : 1, y: y > 0 ? y : 1, siblingRows: siblingRows };
}

// ══════════════════════════════════════════════════════════════════
// שליפת TXT_URL מגליון ניהול_מיילים לפי fileId
// ══════════════════════════════════════════════════════════════════

function _s10_fetchTxtUrl(ss, fileId) {
  try {
    const sheet   = ss.getSheetByName(S10_SOURCE_SHEET);
    if (!sheet) return "";
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return "";

    const fileIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < fileIds.length; i++) {
      if ((fileIds[i][0] || "").toString().trim() === fileId) {
        return (sheet.getRange(i + 2, 24).getValue() || "").toString().trim();
      }
    }
    return "";
  } catch (e) {
    Logger.log("[S10] _s10_fetchTxtUrl שגיאה: " + e.message);
    return "";
  }
}

// ══════════════════════════════════════════════════════════════════
// קריאה מה-HTML — טעינת נתוני השורה הנוכחית
// ══════════════════════════════════════════════════════════════════

function s10_loadRowData() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("S10_CURRENT_PAYLOAD");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    Logger.log("[S10] s10_loadRowData שגיאה: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// ניווט — טעינת שורה לפי מספר (מסמך אחר)
// ══════════════════════════════════════════════════════════════════

function s10_loadRowByNumber(row) {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const raw         = PropertiesService.getScriptProperties().getProperty("S10_CURRENT_PAYLOAD");
    if (!raw) return { error: true, msg: "לא נמצא payload" };

    const current   = JSON.parse(raw);
    const sheetName = current.sheetName;
    const sheet     = ss.getSheetByName(sheetName);
    if (!sheet) return { error: true, msg: "גליון לא נמצא: " + sheetName };

    const lastRow = sheet.getLastRow();
    if (row < 2 || row > lastRow) return { error: true, msg: "שורה מחוץ לתחום (2–" + lastRow + ")" };

    const payload = _s10_buildPayload(ss, sheet, sheetName, row);
    if (!payload) return { error: true, msg: "לא ניתן לטעון שורה " + row };

    PropertiesService.getScriptProperties().setProperty("S10_CURRENT_PAYLOAD", JSON.stringify(payload));
    return payload;

  } catch (e) {
    Logger.log("[S10] s10_loadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// ניווט — קפיצה לאירוע אחי (Split_Index אחר, אותו fileId)
// ══════════════════════════════════════════════════════════════════

function s10_loadSiblingRow(targetRow) {
  return s10_loadRowByNumber(targetRow);
}

// ══════════════════════════════════════════════════════════════════
// שליפת תוכן TXT — קריאה מ-Drive
// ══════════════════════════════════════════════════════════════════

function s10_fetchTxtContent(txtUrl) {
  try {
    if (!txtUrl) return { success: false, msg: "אין TXT_URL" };
    let fileId = null;
    if (txtUrl.includes("/d/"))  fileId = txtUrl.split("/d/")[1].split("/")[0];
    if (txtUrl.includes("id=")) fileId = txtUrl.split("id=")[1].split("&")[0];
    if (!fileId) return { success: false, msg: "לא ניתן לחלץ File_ID מה-URL" };

    const content = DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
    return { success: true, content: content };
  } catch (e) {
    Logger.log("[S10] s10_fetchTxtContent שגיאה: " + e.message);
    return { success: false, msg: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 1 — אישור בלבד
// ══════════════════════════════════════════════════════════════════

function s10_approve(row) {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const payload   = _s10_getCurrentPayload();
    if (!payload)   return { success: false, msg: "❌ לא נמצא payload" };

    const sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + payload.sheetName };

    Logger.log("[S10] אישור שורה " + row + " בגליון " + payload.sheetName);
    return { success: true, msg: "✅ האירוע אושר בהצלחה" };

  } catch (e) {
    Logger.log("[S10] s10_approve שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 2 — עדכון ולמידה
// ══════════════════════════════════════════════════════════════════

function s10_updateAndLearn(row, fieldsJson, complexityLevel, correctionNote) {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const payload = _s10_getCurrentPayload();
    if (!payload) return { success: false, msg: "❌ לא נמצא payload" };

    const sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + payload.sheetName };

    // עדכון שדות בגליון
    const fields = JSON.parse(fieldsJson);
    fields.forEach(function(f) {
      sheet.getRange(row, f.col).setValue(f.value || "");
    });

    // שמירה לגליון למידה
    const learnResult = _s10_saveToLearning(
      payload.sheetName, payload.fileId, payload.splitLabel,
      fieldsJson, complexityLevel, correctionNote
    );

    if (!learnResult.success) return learnResult;

    Logger.log("[S10] עדכון ולמידה שורה " + row + " בגליון " + payload.sheetName);
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate
        ? "⚠️ עדכון בוצע — דוגמה זהה כבר קיימת בגליון הלמידה"
        : "💾 עדכון בוצע ונשלח לגליון הלמידה"
    };

  } catch (e) {
    Logger.log("[S10] s10_updateAndLearn שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 3 — למידה יזומה (ללא עדכון גליון)
// ══════════════════════════════════════════════════════════════════

function s10_learnOnly(row, fieldsJson, complexityLevel, correctionNote) {
  try {
    const payload = _s10_getCurrentPayload();
    if (!payload) return { success: false, msg: "❌ לא נמצא payload" };

    const learnResult = _s10_saveToLearning(
      payload.sheetName, payload.fileId, payload.splitLabel,
      fieldsJson, complexityLevel, correctionNote
    );

    if (!learnResult.success) return learnResult;

    Logger.log("[S10] למידה יזומה שורה " + row + " בגליון " + payload.sheetName);
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate
        ? "⚠️ דוגמה זהה כבר קיימת בגליון הלמידה — לא נוסף שוב"
        : "🧠 דוגמת למידה נוצרה בהצלחה"
    };

  } catch (e) {
    Logger.log("[S10] s10_learnOnly שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 4 — מחיקת שורה מגליון היעד
// ══════════════════════════════════════════════════════════════════

function s10_delete(row) {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const payload = _s10_getCurrentPayload();
    if (!payload) return { success: false, msg: "❌ לא נמצא payload" };

    const sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) return { success: false, msg: "❌ גליון לא נמצא: " + payload.sheetName };

    sheet.deleteRow(row);

    Logger.log("[S10] מחיקת שורה " + row + " בגליון " + payload.sheetName);
    return { success: true, msg: "🗑️ האירוע נמחק מגליון " + payload.sheetName };

  } catch (e) {
    Logger.log("[S10] s10_delete שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה במחיקה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// שמירה לגליון S10_למידה_רפואי — עם בדיקת כפילות
// ══════════════════════════════════════════════════════════════════

function _s10_saveToLearning(sheetName, fileId, splitLabel, fieldsJson, complexityLevel, correctionNote) {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const learnSheet  = ss.getSheetByName(S10_LEARNING_SHEET);

    if (!learnSheet) {
      return { success: false, msg: "❌ גליון '" + S10_LEARNING_SHEET + "' לא נמצא — הרץ buildS10LearningSheet תחילה" };
    }

    // בדיקת כפילות לפי Source_File_ID + Split_Index + Target_Sheet
    const lastRow = learnSheet.getLastRow();
    if (lastRow > 1) {
      const existing = learnSheet.getRange(2, 1, lastRow - 1, 3).getValues();
      for (let i = 0; i < existing.length; i++) {
        const existFileId = (existing[i][0] || "").toString().trim();
        const existSplit  = (existing[i][1] || "").toString().trim();
        const existSheet  = (existing[i][2] || "").toString().trim();
        if (
          existFileId === fileId &&
          existSplit  === splitLabel &&
          existSheet  === sheetName
        ) {
          return { success: true, isDuplicate: true };
        }
      }
    }

    // כתיבת שורת למידה חדשה
    learnSheet.appendRow([
      fileId,                                    // 1 Source_File_ID
      splitLabel,                                // 2 Split_Index
      sheetName,                                 // 3 Target_Sheet
      fieldsJson,                                // 4 Extracted_Data_JSON
      complexityLevel  || "",                    // 5 Complexity_Level
      correctionNote   || "",                    // 6 User_Correction_Note
      new Date().toLocaleString("he-IL")         // 7 Timestamp
    ]);

    Logger.log("[S10] שורת למידה נשמרה — " + fileId + " | " + splitLabel + " | " + sheetName);
    return { success: true, isDuplicate: false };

  } catch (e) {
    Logger.log("[S10] _s10_saveToLearning שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה בשמירת למידה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציית עזר — שליפת payload נוכחי
// ══════════════════════════════════════════════════════════════════

function _s10_getCurrentPayload() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("S10_CURRENT_PAYLOAD");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    Logger.log("[S10] _s10_getCurrentPayload שגיאה: " + e.message);
    return null;
  }
}
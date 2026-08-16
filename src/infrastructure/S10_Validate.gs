/**
 * MedicalPilot — S10_Validate.gs
 * @version 2.0.0 | @updated 16/08/2026 21:10 | @service S10
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S10_Validate.gs
 * @description אימות ידני ולמידה של אירועים רפואיים שחולצו על ידי S09.
 *              פותח Dialog לעריכה, אישור ולמידה של שדות מחולצים —
 *              עובד כעת אך ורק על יומן_אירועים_רפואי, ברמת תת-אירוע (שורה בודדת).
 * @impacts קריאה: יומן_אירועים_רפואי בלבד (5 היעדים האחרים של S09 הוסרו — Task 185).
 *          כתיבה: דוגמאות_למידה_S10 (סכימה שטוחה, שורה לכל אירוע) +
 *          עמודה H (Validation_Status="מאומת") ביומן_אירועים_רפואי, ברמת
 *          השורה הבודדת בלבד — לא ברמת כל האירועים של אותו מסמך.
 *          תלויות: S10_Sidebar.html, COLUMN_MAP.gs.
 *          מופעל מהכפתור "[ S10 אימות ]" בגליון יומן_אירועים_רפואי (ViewEngine.gs).
 * @callers ViewEngine.gs (runS10ViewIconEvents), Menu_PROD.gs
 * @functions showS10Sidebar, _s10_buildPayload, _s10_calcSplitIndex,
 *            _s10_fetchTxtUrl, s10_loadRowData, s10_loadRowByNumber,
 *            s10_loadSiblingRow, s10_fetchTxtContent, s10_approve,
 *            s10_updateAndLearn, s10_learnOnly, s10_delete,
 *            _s10_fieldValue, _s10_saveToLearning, _s10_getCurrentPayload
 * @changes [v2.0.0] Task 185 (בקשת עמוס) — התאמה מלאה לארכיטקטורה החדשה:
 *                   S10_SHEET_CONFIG צומצם ליומן_אירועים_רפואי בלבד + שדה
 *                   Routing_Category נוסף לאימות (היה חסר). S10_LEARNING_SHEET
 *                   → דוגמאות_למידה_S10 (גליון חדש, שטוח). _s10_saveToLearning
 *                   נכתב מחדש לסכימה השטוחה (Event_Index במקום Split_Index/
 *                   Target_Sheet/Extracted_Data_JSON). תוקן באג קיים-מקודם
 *                   (לא קשור לשינוי הארכיטקטוני): s10_loadRowData/
 *                   s10_loadRowByNumber החזירו עטיפה {success,payload} בעוד
 *                   ה-JS מצפה ל-payload ישירות — גרם ל"undefined/9999" ולשדות
 *                   ריקים בטעינה. הוספת validationStatusCol=8 ל-3 הכפתורים
 *                   (approve/updateAndLearn/learnOnly) — כותבים "מאומת" ברמת
 *                   השורה הבודדת בלבד, לא ברמת המסמך כולו.
 *          [v1.1.0] Task 67 — הוספת אימות שדות חובה ב-s10_approve (שכבה ב):
 *                   בדיקת מילוי כל שדות הגליון הפעיל לפי S10_SHEET_CONFIG לפני אישור.
 *                   Tasks 17+18+19 — תיקון @git לAPI URL, המרת "שינוי:" ל-@changes,
 *                   הוספת @description/@callers/@functions לכותרת.
 *          [v1.0.3] Task 66 — תיקון sourceUrl ב-_s10_buildPayload: fallback לקישור
 *                   Drive ישירות מ-fileId כשעמודת sourceCol אינה URL (יומן_אירועים_רפואי).
 *          [v1.0.2] Task 66 — תיקון fileIdCol עבור יומן_אירועים_רפואי מ-8 ל-7.
 *          [v1.0.1] הוספת @impacts וכותרת מלאה לפי סטנדרט.
 *          [v1.0.0] גרסה ראשונה.
 */
// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S10_LEARNING_SHEET  = "דוגמאות_למידה_S10"; // [v2.0.0 — Task 185] גליון חדש, סכימה שטוחה
const S10_SOURCE_SHEET    = "ניהול_מיילים";

// מבנה כל גליון יעד:
// fileIdCol  — עמודת File_ID בגליון
// sourceCol  — עמודת Source_URL בגליון
// fields     — שדות הניתנים לאימות ועריכה: { label, col }
// [v2.0.0 — Task 185] S09 כותב כעת רק ל-יומן_אירועים_רפואי — 5 הקונפיגורציות
// האחרות (תרופות_קבועות/יומן_מצב_רפואי/בדיקות_דם/בדיקות_גנטיות/
// הנחיות_רפואיות_ומשימות) הוסרו — S09 כבר לא כותב אליהן, יאוכלסו ע"י S13.
const S10_SHEET_CONFIG = {
  "יומן_אירועים_רפואי": {
    icon:      "🏥",
    fileIdCol: 7,
    sourceCol: 6,
    validationStatusCol: 8, // [Task 185] Validation_Status — נכתב ב-approve/updateAndLearn/learnOnly
    fields: [
      { label: "תאריך אירוע",     col: 1 },
      { label: "סוג אירוע",       col: 2 },
      { label: "מערכת רפואית",    col: 3 },
      { label: "מוסד / רופא",     col: 4 },
      { label: "סיכום ממצא",      col: 5 },
      { label: "קטגוריית ניתוב",  col: 6 }
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
    const srcSheet = ss.getSheetByName(S10_SOURCE_SHEET);
    if (!srcSheet) return "";

    const lastRow = srcSheet.getLastRow();
    if (lastRow < 2) return "";

    const TXT_URL_COL = 24; // X — TXT_URL
    const FILE_ID_COL = 1;  // A — File_ID

    const ids    = srcSheet.getRange(2, FILE_ID_COL, lastRow - 1, 1).getValues();
    const urls   = srcSheet.getRange(2, TXT_URL_COL, lastRow - 1, 1).getValues();

    for (let i = 0; i < ids.length; i++) {
      if ((ids[i][0] || "").toString().trim() === fileId) {
        return (urls[i][0] || "").toString().trim();
      }
    }
    return "";
  } catch (e) {
    Logger.log("[S10] _s10_fetchTxtUrl שגיאה: " + e.message);
    return "";
  }
}

// ══════════════════════════════════════════════════════════════════
// טעינת נתוני שורה — נקרא מה-HTML בטעינה
// ══════════════════════════════════════════════════════════════════

function s10_loadRowData() {
  try {
    const payload = _s10_getCurrentPayload();
    // [Task 185] תיקון חוזה — ה-JS (window.onload) מצפה ל-payload ישירות,
    // לא לעטיפה {success,payload}. זו הייתה תקלה קיימת מקודם, לא קשורה
    // לשינויי הארכיטקטורה — התגלתה רק כשנבדק הדיאלוג קצה-לקצה בפועל.
    if (!payload) return { error: true, msg: "❌ לא נמצא payload" };
    return payload;
  } catch (e) {
    Logger.log("[S10] s10_loadRowData שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// טעינת שורה לפי מספר — ניווט בתוך הגליון
// ══════════════════════════════════════════════════════════════════

function s10_loadRowByNumber(row) {
  try {
    const payload = _s10_getCurrentPayload();
    if (!payload) return { error: true, msg: "❌ לא נמצא payload" };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) return { error: true, msg: "❌ גליון לא נמצא: " + payload.sheetName };

    const newPayload = _s10_buildPayload(ss, sheet, payload.sheetName, row);
    if (!newPayload) return { error: true, msg: "❌ לא ניתן לטעון שורה " + row };

    PropertiesService.getScriptProperties().setProperty(
      "S10_CURRENT_PAYLOAD",
      JSON.stringify(newPayload)
    );

    // [Task 185] תיקון חוזה — payload ישירות, ראה הערה למעלה
    return newPayload;
  } catch (e) {
    Logger.log("[S10] s10_loadRowByNumber שגיאה: " + e.message);
    return { error: true, msg: "❌ שגיאה: " + e.message };
  }
}
// ══════════════════════════════════════════════════════════════════
// טעינת שורת אח — ניווט בין שורות של אותו File_ID
// ══════════════════════════════════════════════════════════════════

function s10_loadSiblingRow(targetRow) {
  return s10_loadRowByNumber(targetRow);
}

// ══════════════════════════════════════════════════════════════════
// שליפת תוכן TXT מ-Drive
// ══════════════════════════════════════════════════════════════════

function s10_fetchTxtContent(txtUrl) {
  try {
    if (!txtUrl) return { success: false, msg: "❌ אין TXT_URL" };

    const match = txtUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return { success: false, msg: "❌ לא נמצא File ID ב-URL" };

    const fileId  = match[1];
    const file    = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString("UTF-8");

    return { success: true, content: content.substring(0, 8000) };
  } catch (e) {
    Logger.log("[S10] s10_fetchTxtContent שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה בקריאת TXT: " + e.message };
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

    // [v1.1.0] Task 67 — שכבה ב: אימות שדות חובה לפני אישור
    const config        = S10_SHEET_CONFIG[payload.sheetName];
    const missingFields = [];
    if (config && config.fields) {
      config.fields.forEach(function(f) {
        const cellVal = (sheet.getRange(row, f.col).getValue() || "").toString().trim();
        if (!cellVal) missingFields.push(f.label);
      });
    }
    if (missingFields.length > 0) {
      return {
        success: false,
        msg: "⚠️ לא ניתן לאשר — שדות חסרים: " + missingFields.join(", ")
      };
    }

   // [Task 185] סימון Validation_Status="מאומת" — ברמת השורה הזו בלבד
    if (config && config.validationStatusCol) {
      sheet.getRange(row, config.validationStatusCol).setValue("מאומת");
    }

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

    // [Task 185] סימון Validation_Status="מאומת" — ברמת השורה הזו בלבד
    const config = S10_SHEET_CONFIG[payload.sheetName];
    if (config && config.validationStatusCol) {
      sheet.getRange(row, config.validationStatusCol).setValue("מאומת");
    }

    // [v2.0.0 — Task 185] שמירה לגליון למידה החדש — לפי fileId + Event_Index
    const learnResult = _s10_saveToLearning(
      payload.fileId, payload.splitX,
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
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const payload = _s10_getCurrentPayload();
    if (!payload) return { success: false, msg: "❌ לא נמצא payload" };

    // [Task 185] סימון Validation_Status="מאומת" — למידה-יזומה = בדקת
    // ואישרת את השורה כפי שהיא, גם בלי לתקן שדות
    const sheet  = ss.getSheetByName(payload.sheetName);
    const config = S10_SHEET_CONFIG[payload.sheetName];
    if (sheet && config && config.validationStatusCol) {
      sheet.getRange(row, config.validationStatusCol).setValue("מאומת");
    }
    const learnResult = _s10_saveToLearning(
      payload.fileId, payload.splitX,
      fieldsJson, complexityLevel, correctionNote
    );

    if (!learnResult.success) return learnResult;

    Logger.log("[S10] למידה יזומה שורה " + row);
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate
        ? "⚠️ למידה בוצעה — דוגמה זהה כבר קיימת בגליון הלמידה"
        : "🧠 נשלח לגליון הלמידה בהצלחה"
    };

  } catch (e) {
    Logger.log("[S10] s10_learnOnly שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 4 — מחיקת שורה
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
// [v2.0.0 — Task 185] פונקציית עזר — שליפת ערך שדה לפי label
// ══════════════════════════════════════════════════════════════════

function _s10_fieldValue(fields, label) {
  const f = fields.find(function(x) { return x.label === label; });
  return f ? (f.value || "") : "";
}

// ══════════════════════════════════════════════════════════════════
// [v2.0.0 — Task 185] שמירה לגליון דוגמאות_למידה_S10 — סכימה שטוחה,
// שורה אחת לכל אירוע — עם בדיקת כפילות לפי Source_File_ID + Event_Index
// ══════════════════════════════════════════════════════════════════

function _s10_saveToLearning(fileId, eventIndex, fieldsJson, complexityLevel, correctionNote) {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const learnSheet  = ss.getSheetByName(S10_LEARNING_SHEET);

    if (!learnSheet) {
      return { success: false, msg: "❌ גליון '" + S10_LEARNING_SHEET + "' לא נמצא — הרץ task185_createLearningSheetS10NoUI תחילה" };
    }

    const fields         = JSON.parse(fieldsJson);
    const eventDate       = _s10_fieldValue(fields, "תאריך אירוע");
    const eventType        = _s10_fieldValue(fields, "סוג אירוע");
    const medicalSystem     = _s10_fieldValue(fields, "מערכת רפואית");
    const issuer              = _s10_fieldValue(fields, "מוסד / רופא");
    const summary              = _s10_fieldValue(fields, "סיכום ממצא");
    const routingCategory       = _s10_fieldValue(fields, "קטגוריית ניתוב");

    // בדיקת כפילות לפי Source_File_ID + Event_Index
    const headerRow = (SHEET_CONFIG[S10_LEARNING_SHEET] && SHEET_CONFIG[S10_LEARNING_SHEET].HEADER_ROW) || 1;
    const firstData  = (SHEET_CONFIG[S10_LEARNING_SHEET] && SHEET_CONFIG[S10_LEARNING_SHEET].FIRST_DATA_ROW) || (headerRow + 1);
    const lastRow    = learnSheet.getLastRow();
    if (lastRow >= firstData) {
      const existing = learnSheet.getRange(firstData, 1, lastRow - firstData + 1, 2).getValues();
      for (let i = 0; i < existing.length; i++) {
        const existFileId = (existing[i][0] || "").toString().trim();
        const existIndex  = (existing[i][1] || "").toString().trim();
        if (existFileId === fileId && existIndex === String(eventIndex)) {
          return { success: true, isDuplicate: true };
        }
      }
    }

    // כתיבת שורת למידה חדשה
    learnSheet.appendRow([
      fileId,                             // 1 Source_File_ID
      eventIndex,                         // 2 Event_Index
      eventDate,                          // 3 Event_Date
      eventType,                          // 4 Event_Type
      medicalSystem,                      // 5 Medical_System
      issuer,                             // 6 Issuer
      summary,                            // 7 Summary
      routingCategory,                    // 8 Routing_Category
      complexityLevel  || "",             // 9 Complexity_Level
      correctionNote   || "",             // 10 User_Correction_Note
      new Date().toLocaleString("he-IL")  // 11 Timestamp
    ]);

    Logger.log("[S10] שורת למידה נשמרה — " + fileId + " | אירוע " + eventIndex);
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
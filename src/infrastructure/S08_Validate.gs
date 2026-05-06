/**
 * MedicalPilot — S08_Validate.gs
 * @version 1.0.2 | @updated 06/05/2026 22:35 | @service S08
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S08_Validate.gs
 * שינוי: [FIX-1] בדיקת סף — עמודה X (TXT_URL) בלבד, לא Z
 *         [FIX-2] טעינת טקסט גולמי מהקובץ עצמו דרך TXT_URL
 *         [FIX-3] sourceUrl — מחפש ב-W, ואם ריק בונה מ-File_ID בעמודה A
 * עמודות קריאה:  A=1 File_ID | I=9 Doc_Title | J=10 Doc_Issuer | K=11 Doc_Date |
 *                L=12 Doc_Category | P=16 File_Size | Q=17 Complexity |
 *                R=18 Duplicate_Flag | W=23 Source_URL | X=24 TXT_URL
 * עמודות כתיבה: I=9 | J=10 | K=11 | L=12 | M=13 Pipeline_Status | U=21 QA_Status
 */

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — פתיחת חלון אימות
// ══════════════════════════════════════════════════════════════════

function showMainSidebar() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");

  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה: גליון 'ניהול_מיילים' לא נמצא.");
    return;
  }

  const row = sheet.getActiveCell().getRow();

  if (row < 2) {
    SpreadsheetApp.getUi().alert("⚠️ נא לעמוד על שורת נתונים (לא על הכותרת).");
    return;
  }

  // [FIX-1] בדיקת תנאי סף — חייב TXT_URL בעמודה X
  const txtUrl = sheet.getRange(row, 24).getValue();
  if (!txtUrl || txtUrl.toString().trim() === "") {
    SpreadsheetApp.getUi().alert(
      "⛔ לא נמצא קובץ טקסט לשורה זו (עמודה X ריקה).\n" +
      "יש להריץ קודם את שירות S06 — המרה ל-TXT."
    );
    return;
  }

  // שליפת נתוני השורה
  const rowData = _s08_getRowData(sheet, row);

  // שמירת נתונים להעברה ל-HTML
  PropertiesService.getScriptProperties().setProperty(
    "S08_CURRENT_ROW_DATA",
    JSON.stringify({ row: row, data: rowData })
  );

  // פתיחת Dialog
  const html = HtmlService
    .createTemplateFromFile("S08_Sidebar")
    .evaluate()
    .setWidth(920)
    .setHeight(650)
    .setTitle("S08 — אימות ידני");

  SpreadsheetApp.getUi().showModalDialog(html, "🔍 אימות ידני — שורה " + row);
}

// ══════════════════════════════════════════════════════════════════
// שליפת נתוני שורה — [FIX-3] sourceUrl מ-W או מ-A
// ══════════════════════════════════════════════════════════════════

function _s08_getRowData(sheet, row) {
  const fileId    = (sheet.getRange(row, 1).getValue()  || "").toString().trim();
  const sourceUrl = (sheet.getRange(row, 23).getValue() || "").toString().trim() ||
                    (fileId ? "https://drive.google.com/file/d/" + fileId + "/view" : "");

  return {
    row:           row,
    fileId:        fileId,
    docTitle:      sheet.getRange(row, 9).getValue()  || "",
    docIssuer:     sheet.getRange(row, 10).getValue() || "",
    docDate:       sheet.getRange(row, 11).getValue() || "",
    docCategory:   sheet.getRange(row, 12).getValue() || "",
    fileSize:      sheet.getRange(row, 16).getValue() || "",
    complexity:    sheet.getRange(row, 17).getValue() || "",
    duplicateFlag: sheet.getRange(row, 18).getValue() || "",
    sourceUrl:     sourceUrl,
    txtUrl:        sheet.getRange(row, 24).getValue() || ""
  };
}

// ══════════════════════════════════════════════════════════════════
// קריאה מה-HTML — טעינת נתוני השורה
// ══════════════════════════════════════════════════════════════════

function s08_loadRowData() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("S08_CURRENT_ROW_DATA");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    Logger.log("s08_loadRowData: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// שליפת נתוני שורת כפול להשוואה
// ══════════════════════════════════════════════════════════════════

function s08_getDuplicateRowData(duplicateFlag) {
  try {
    if (!duplicateFlag) return null;
    const match = duplicateFlag.toString().match(/(\d+)/);
    if (!match) return null;
    const dupRow = parseInt(match[1], 10);
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName("ניהול_מיילים");
    return {
      row:      dupRow,
      title:    sheet.getRange(dupRow, 9).getValue()  || "—",
      issuer:   sheet.getRange(dupRow, 10).getValue() || "—",
      fileSize: sheet.getRange(dupRow, 16).getValue() || "—"
    };
  } catch (e) {
    Logger.log("s08_getDuplicateRowData: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 1 — אישור וסגור
// ══════════════════════════════════════════════════════════════════

function s08_approve(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    sheet.getRange(row, 13).setValue("מאושר");
    sheet.getRange(row, 21).setValue("✅ אושר ידנית");
    Logger.log("[S08] אישור שורה " + row);
    return { success: true, msg: "✅ השורה אושרה בהצלחה" };
  } catch (e) {
    Logger.log("[S08] שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 2 — עדכון ולמידה
// ══════════════════════════════════════════════════════════════════

function s08_updateAndLearn(row, title, issuer, date, category, note) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    sheet.getRange(row, 9).setValue(title     || "");
    sheet.getRange(row, 10).setValue(issuer   || "");
    sheet.getRange(row, 11).setValue(date     || "");
    sheet.getRange(row, 12).setValue(category || "");
    sheet.getRange(row, 13).setValue("מאושר");
    sheet.getRange(row, 21).setValue("נשלח ללמידה");
    const learnResult = _s08_saveToLearning(sheet, row, title, issuer, category, date, note);
    if (!learnResult.success) return learnResult;
    Logger.log("[S08] עדכון ולמידה שורה " + row);
    return { success: true, msg: "💾 עדכון בוצע ונשלח לגיליון הלמידה", isDuplicate: learnResult.isDuplicate };
  } catch (e) {
    Logger.log("[S08] שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 3 — למידה יזומה
// ══════════════════════════════════════════════════════════════════

function s08_learnOnly(row, title, issuer, date, category, note) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    sheet.getRange(row, 21).setValue("נשלח ללמידה");
    const learnResult = _s08_saveToLearning(sheet, row, title, issuer, category, date, note);
    if (!learnResult.success) return learnResult;
    Logger.log("[S08] למידה יזומה שורה " + row);
    return { success: true, msg: "🧠 דוגמת למידה נוצרה בהצלחה", isDuplicate: learnResult.isDuplicate };
  } catch (e) {
    Logger.log("[S08] שגיאה: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// שמירה לגיליון דוגמאות_למידה — כולל בדיקת כפילות
// ══════════════════════════════════════════════════════════════════

function _s08_saveToLearning(sheet, row, title, issuer, category, date, note) {
  try {
    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const learnSheet = ss.getSheetByName("דוגמאות_למידה");
    if (!learnSheet) return { success: false, msg: "❌ גליון 'דוגמאות_למידה' לא נמצא" };

    // בדיקת כפילות לפי Issuer + Classification
    const lastRow = learnSheet.getLastRow();
    if (lastRow > 1) {
      const existing = learnSheet.getRange(2, 1, lastRow - 1, 3).getValues();
      for (let i = 0; i < existing.length; i++) {
        if (
          existing[i][1] && existing[i][2] &&
          existing[i][1].toString().trim() === (issuer   || "").trim() &&
          existing[i][2].toString().trim() === (category || "").trim()
        ) {
          return {
            success:     true,
            isDuplicate: true,
            msg:         "⚠️ קיימת כבר דוגמה דומה (מנפיק + קטגוריה זהים) — לא נוסף שוב"
          };
        }
      }
    }

    const fileId     = sheet.getRange(row, 1).getValue()  || "";
    const complexity = sheet.getRange(row, 17).getValue() || "";
    const txtUrl     = sheet.getRange(row, 24).getValue() || "";

    learnSheet.appendRow([
      title      || "",   // 1 Subject
      issuer     || "",   // 2 Issuer
      category   || "",   // 3 Classification
      txtUrl     || "",   // 4 TXT_Document_Link
      fileId     || "",   // 5 Original_File_ID
      complexity || "",   // 6 Complexity
      date       || "",   // 7 Doc_Date
      note       || ""    // 8 Notes
    ]);

    return { success: true, isDuplicate: false, msg: "✅ נשמר בגיליון הלמידה" };
  } catch (e) {
    Logger.log("[S08] שגיאת למידה: " + e.message);
    return { success: false, msg: "❌ שגיאה בשמירת למידה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור 4 — מחיקה
// ══════════════════════════════════════════════════════════════════

function s08_delete(row, deleteWhich) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");

    const targetRow = (deleteWhich === "original") ?
      _s08_getDuplicateRowNumber(sheet, row) : row;

    if (!targetRow || targetRow < 2) {
      return { success: false, msg: "❌ לא ניתן לאתר את השורה למחיקה" };
    }

    const sourceUrl = sheet.getRange(targetRow, 23).getValue();
    const txtUrl    = sheet.getRange(targetRow, 24).getValue();

    _s08_trashDriveFile(sourceUrl);
    _s08_trashDriveFile(txtUrl);

    sheet.deleteRow(targetRow);

    Logger.log("[S08] מחיקת שורה " + targetRow);
    return { success: true, msg: "🗑️ השורה והקבצים נמחקו בהצלחה" };
  } catch (e) {
    Logger.log("[S08] שגיאת מחיקה: " + e.message);
    return { success: false, msg: "❌ שגיאה במחיקה: " + e.message };
  }
}

function _s08_trashDriveFile(url) {
  try {
    if (!url) return;
    let id = null;
    if (url.includes("/d/"))  id = url.split("/d/")[1].split("/")[0];
    if (url.includes("id=")) id = url.split("id=")[1].split("&")[0];
    if (id) DriveApp.getFileById(id).setTrashed(true);
  } catch (e) {
    Logger.log("[S08] לא ניתן למחוק קובץ: " + e.message);
  }
}

function _s08_getDuplicateRowNumber(sheet, currentRow) {
  const flag  = sheet.getRange(currentRow, 18).getValue() || "";
  const match = flag.toString().match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
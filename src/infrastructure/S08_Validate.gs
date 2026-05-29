/**
 * MedicalPilot — S08_Validate.gs
 * @version 1.0.9 | @updated 28/05/2026 | @service S08
 * שינוי: [v1.0.9] נוספה s08_findLearningDuplicate — חיפוש אוטומטי בגיליון דוגמאות_למידה
 *                 בטעינת הסיידבר לפי מנפיק+קטגוריה של השורה הנוכחית.
 *                 _s08_saveToLearning מחזיר matchedIssuer ו-matchedCategory לתצוגת learnDupCard.
 * שינוי: [v1.0.8] תוקן באג: s08_updateAndLearn ו-s08_learnOnly דרסו את msg מ-_s08_saveToLearning.
 *                 מספר השורה מגיליון דוגמאות_למידה עובר כעת לסיידבר ומוצג בסרגל הסטטוס.
 * שינוי: [v1.0.7] _s08_saveToLearning — הודעת כפול כוללת מספר שורה מגיליון דוגמאות_למידה.
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S08_Validate.gs
 * שינוי: [v1.0.6-א] s08_fetchTxtContent — שליפת תוכן TXT דרך GAS (עוקף הרשאת iframe)
 *         [v1.0.6-ד] Dialog מוגדל ל-1100×750
 *         [v1.0.5]   pipelineStatus (עמודה M)
 *         [v1.0.4]   s08_loadRowByNumber, s08_highlightActiveRow, lastRow, noTxt
 *         [v1.0.3]   בדיקת סף X, sourceUrl מ-W/A
 * עמודות קריאה:  A=1 File_ID | I=9 Doc_Title | J=10 Doc_Issuer | K=11 Doc_Date |
 *                L=12 Doc_Category | M=13 Pipeline_Status | P=16 File_Size |
 *                Q=17 Complexity | R=18 Duplicate_Flag | W=23 Source_URL | X=24 TXT_URL
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

  const txtUrl = sheet.getRange(row, 24).getValue();
  if (!txtUrl || txtUrl.toString().trim() === "") {
    SpreadsheetApp.getUi().alert(
      "⛔ לא נמצא קובץ טקסט לשורה זו (עמודה X ריקה).\n" +
      "יש להריץ קודם את שירות S06 — המרה ל-TXT."
    );
    return;
  }

  const rowData = _s08_getRowData(sheet, row);

  PropertiesService.getScriptProperties().setProperty(
    "S08_CURRENT_ROW_DATA",
    JSON.stringify({ row: row, data: rowData })
  );

  s08_highlightActiveRow(row);

  // [v1.0.6-ד] Dialog מוגדל ל-1100×750
  const html = HtmlService
    .createTemplateFromFile("S08_Sidebar")
    .evaluate()
    .setWidth(1100)
    .setHeight(750)
    .setTitle("S08 — אימות ידני");

  SpreadsheetApp.getUi().showModalDialog(html, "🔍 אימות ידני — שורה " + row);
}

// ══════════════════════════════════════════════════════════════════
// שליפת נתוני שורה
// ══════════════════════════════════════════════════════════════════

function _s08_getRowData(sheet, row) {
  const fileId    = (sheet.getRange(row, 1).getValue()  || "").toString().trim();
  const sourceUrl = (sheet.getRange(row, 23).getValue() || "").toString().trim() ||
                    (fileId ? "https://drive.google.com/file/d/" + fileId + "/view" : "");

  return {
    row:            row,
    fileId:         fileId,
    docTitle:       sheet.getRange(row, 9).getValue()  || "",
    docIssuer:      sheet.getRange(row, 10).getValue() || "",
    docDate:        sheet.getRange(row, 11).getValue() || "",
    docCategory:    sheet.getRange(row, 12).getValue() || "",
    pipelineStatus: sheet.getRange(row, 13).getValue() || "",
    fileSize:       sheet.getRange(row, 16).getValue() || "",
    complexity:     sheet.getRange(row, 17).getValue() || "",
    duplicateFlag:  sheet.getRange(row, 18).getValue() || "",
    sourceUrl:      sourceUrl,
    txtUrl:         sheet.getRange(row, 24).getValue() || ""
  };
}

// ══════════════════════════════════════════════════════════════════
// קריאה מה-HTML — טעינת נתוני השורה הנוכחית
// ══════════════════════════════════════════════════════════════════

function s08_loadRowData() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("S08_CURRENT_ROW_DATA");
    if (!raw) return null;
    const parsed  = JSON.parse(raw);
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sheet   = ss.getSheetByName("ניהול_מיילים");
    const lastRow = sheet ? sheet.getLastRow() : 9999;
    const noTxt   = !parsed.data.txtUrl;
    return {
      row:     parsed.row,
      data:    parsed.data,
      lastRow: lastRow,
      noTxt:   noTxt
    };
  } catch (e) {
    Logger.log("s08_loadRowData: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// ניווט דינמי — טעינת שורה לפי מספר
// ══════════════════════════════════════════════════════════════════

function s08_loadRowByNumber(rowNum) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return { error: true, msg: "גליון 'ניהול_מיילים' לא נמצא" };

    const lastRow = sheet.getLastRow();

    if (rowNum < 2 || rowNum > lastRow) {
      return { error: true, msg: "שורה " + rowNum + " מחוץ לטווח (2–" + lastRow + ")" };
    }

    const rowData = _s08_getRowData(sheet, rowNum);
    const noTxt   = !rowData.txtUrl;

    PropertiesService.getScriptProperties().setProperty(
      "S08_CURRENT_ROW_DATA",
      JSON.stringify({ row: rowNum, data: rowData })
    );

    s08_highlightActiveRow(rowNum);

    return {
      row:     rowNum,
      data:    rowData,
      lastRow: lastRow,
      noTxt:   noTxt
    };
  } catch (e) {
    Logger.log("s08_loadRowByNumber: " + e.message);
    return { error: true, msg: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// סימון שורה פעילה בגליון — עמודה A
// ══════════════════════════════════════════════════════════════════

function s08_highlightActiveRow(row) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, 1, lastRow - 1, 1).setBackground(null);
    }
    sheet.getRange(row, 1).setBackground("#bbdefb");
    sheet.setActiveRange(sheet.getRange(row, 1));
  } catch (e) {
    Logger.log("s08_highlightActiveRow: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.9] חיפוש שורה כפולה ישירות בגיליון ניהול_מיילים
// ══════════════════════════════════════════════════════════════════

function s08_findDuplicateInSheet(issuer, category, currentRow) {
  try {
    if (!issuer || !category) return null;
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return null;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const issuerVals   = sheet.getRange(2, 10, lastRow - 1, 1).getValues();
    const categoryVals = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
    for (let i = 0; i < issuerVals.length; i++) {
      const rowNum = i + 2;
      if (rowNum === currentRow) continue;
      if (
        issuerVals[i][0].toString().trim()   === issuer.trim()   &&
        categoryVals[i][0].toString().trim() === category.trim()
      ) {
        return { dupRow: rowNum };
      }
    }
    return null;
  } catch (e) {
    Logger.log("s08_findDuplicateInSheet: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.9] חיפוש כפול אוטומטי בגיליון דוגמאות_למידה לפי מנפיק+קטגוריה
// ══════════════════════════════════════════════════════════════════

function s08_findLearningDuplicate(issuer, category) {
  try {
    const ss         = SpreadsheetApp.getActiveSpreadsheet();
    const learnSheet = ss.getSheetByName("דוגמאות_למידה");
    if (!learnSheet) return null;
    const lastRow = learnSheet.getLastRow();
    if (lastRow < 2) return null;
    const existing = learnSheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < existing.length; i++) {
      if (
        existing[i][1] && existing[i][2] &&
        existing[i][1].toString().trim() === (issuer   || "").trim() &&
        existing[i][2].toString().trim() === (category || "").trim()
      ) {
        return {
          dupRow:          i + 2,
          matchedIssuer:   existing[i][1].toString().trim(),
          matchedCategory: existing[i][2].toString().trim()
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log("s08_findLearningDuplicate: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.0.6-א] שליפת תוכן קובץ TXT דרך GAS — עוקף הרשאת iframe
// ══════════════════════════════════════════════════════════════════

function s08_fetchTxtContent(txtUrl) {
  try {
    if (!txtUrl) return { success: false, msg: "אין כתובת TXT" };

    // שליפת File ID מהכתובת
    let fileId = null;
    const m1 = txtUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];
    const m2 = txtUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];

    if (!fileId) {
      // ניסיון לקרוא ישירות כ-URL
      const resp = UrlFetchApp.fetch(txtUrl, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) {
        return { success: true, content: resp.getContentText("UTF-8") };
      }
      return { success: false, msg: "לא ניתן לשלוף את הקובץ" };
    }

    // קריאה דרך Drive API
    const file    = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString("UTF-8");
    return { success: true, content: content };

  } catch (e) {
    Logger.log("s08_fetchTxtContent: " + e.message);
    return { success: false, msg: "שגיאה: " + e.message };
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
// כפתור 1 — אישור
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
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate ? learnResult.msg : "💾 עדכון בוצע ונשלח לגיליון הלמידה"
    };
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
    return {
      success:     true,
      isDuplicate: learnResult.isDuplicate,
      msg:         learnResult.isDuplicate ? learnResult.msg : "🧠 דוגמת למידה נוצרה בהצלחה"
    };
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

    const lastRow = learnSheet.getLastRow();
    if (lastRow > 1) {
      const existing = learnSheet.getRange(2, 1, lastRow - 1, 3).getValues();
      for (let i = 0; i < existing.length; i++) {
        if (
          existing[i][1] && existing[i][2] &&
          existing[i][1].toString().trim() === (issuer   || "").trim() &&
          existing[i][2].toString().trim() === (category || "").trim()
        ) {
          const dupLearnRow     = i + 2;
          const matchedIssuer   = existing[i][1].toString().trim();
          const matchedCategory = existing[i][2].toString().trim();
          return {
            success:         true,
            isDuplicate:     true,
            dupRow:          dupLearnRow,
            matchedIssuer:   matchedIssuer,
            matchedCategory: matchedCategory,
            msg:             '⚠️ כפל חשוד — שורה ' + dupLearnRow + ' | מנפיק: "' + matchedIssuer + '" | קטגוריה: "' + matchedCategory + '"'
          };
        }
      }
    }

    const fileId     = sheet.getRange(row, 1).getValue()  || "";
    const complexity = sheet.getRange(row, 17).getValue() || "";
    const txtUrl     = sheet.getRange(row, 24).getValue() || "";

    learnSheet.appendRow([
      title      || "",
      issuer     || "",
      category   || "",
      txtUrl     || "",
      fileId     || "",
      complexity || "",
      date       || "",
      note       || ""
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
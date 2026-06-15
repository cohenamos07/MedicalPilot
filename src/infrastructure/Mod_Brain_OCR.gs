/**
 * MedicalPilot — Mod_Brain_OCR.gs
 * @version 1.4.2 | @updated 14/06/2026 22:07 | @service ARCHIVED
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/Mod_Brain_OCR.gs
 * @description מודול OCR — מועבר לארכוב מלא. הוחלף על ידי S06_ConvertTXT.gs מ-v1.5.0.
 * @impacts Gemini Vision מטפל ב-PDF ותמונות ישירות — OCR של Drive אינו נדרש.
 *          runBatchOCR_Test מוחלף ב-stub שמונע הרצה בטעות.
 *          syncStatusBeforeOCR — ארכוב, לא בשימוש בזרימה הנוכחית.
 * @callers אין — קובץ ארכוב בלבד
 * @functions runBatchOCR_Test, runBatchOCR_ARCHIVED,
 *            fillMissingFileSizes_LAB, clearOCRErrors_LAB,
 *            syncStatusBeforeOCR_ARCHIVED
 * @changes [v1.4.2] תיקון Tasks 3,4,5 — עדכון @git ל-GitHub API URL + @service → ARCHIVED + @changes מלא
 *          [v1.4.1] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *          [v1.4.0] [ARCHIVE] runBatchOCR_Test הושבת — קוד מקורי שמור ב-runBatchOCR_ARCHIVED
 */

// ══════════════════════════════════════════════════════════════════
// stub — מונע הרצה בטעות
// ══════════════════════════════════════════════════════════════════

function runBatchOCR_Test() {
  SpreadsheetApp.getUi().alert(
    "⚠️ פונקציה זו הועברה לארכוב.\n\n" +
    "המערכת משתמשת ב-S06_ConvertTXT.gs ישירות.\n" +
    "להמרת קבצים — השתמש בתפריט: 🔄 קליטת נתונים → המרה ל-TXT"
  );
}

// ══════════════════════════════════════════════════════════════════
// קוד מקורי — שמור לארכוב בלבד, לא לשימוש
// ══════════════════════════════════════════════════════════════════

function runBatchOCR_ARCHIVED() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ניהול_מיילים');
  if (!sheet) return;

  const selection = sheet.getActiveRange();
  const selFirstRow = selection.getRow();
  const selLastRow = selection.getLastRow();
  const isSelectionMode = (selFirstRow > 1);

  const startRow = isSelectionMode ? selFirstRow : 2;
  const endRow = isSelectionMode ? selLastRow : sheet.getLastRow();

  const folderName = 'Converted_OCR';
  const folders = DriveApp.getFoldersByName(folderName);
  if (!folders.hasNext()) {
    SpreadsheetApp.getUi().alert("שגיאה: תיקיית " + folderName + " לא נמצאה.");
    return;
  }
  const folderOCR = folders.next();
  let count = 0;

  for (let i = startRow; i <= endRow; i++) {
    try {
      const rowData = sheet.getRange(i, 1, 1, 23).getValues()[0];
      const fileId = rowData[0];
      const statusM = rowData[12];
      const ocrLinkV = rowData[21];

      if (!fileId) continue;

      if (!isSelectionMode) {
        const needsOCR = (statusM === "ממתין ל-OCR");
        const noValidLink = (!ocrLinkV || ocrLinkV === "" || ocrLinkV.toString().includes("❌"));
        if (!needsOCR || !noValidLink) continue;
      }

      const file = DriveApp.getFileById(fileId);
      const resource = {
        title: "OCR_" + file.getName(),
        mimeType: file.getMimeType()
      };

      const ocrFile = Drive.Files.copy(resource, fileId, { ocr: true, ocrLanguage: "he" });
      DriveApp.getFileById(ocrFile.id).moveTo(folderOCR);

      sheet.getRange(i, 22).setValue(ocrFile.alternateLink);
      sheet.getRange(i, 13).setValue("עבר OCR");
      sheet.getRange(i, 20).clearContent();
      sheet.getRange(i, 23).setValue(Math.round(file.getSize() / 1024) + " KB");
      count++;
      Utilities.sleep(500);

    } catch (e) {
      Logger.log("שגיאת OCR בשורה " + i + ": " + e.message);
      sheet.getRange(i, 20).setValue("שגיאה: " + e.message);
    }
  }

  sheet.getRange(2, 13).activate();
  SpreadsheetApp.getUi().alert("OCR הסתיים. נוספו " + count + " קבצים.");
}

// ══════════════════════════════════════════════════════════════════
// פונקציות עזר — שמורות לארכוב
// ══════════════════════════════════════════════════════════════════

function fillMissingFileSizes_LAB() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ניהול_מיילים');
  const data = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const fileId = data[i][0];
    const fileSize = data[i][22];
    if (fileId && (!fileSize || fileSize === "")) {
      try {
        const file = DriveApp.getFileById(fileId);
        sheet.getRange(i + 1, 23).setValue(Math.round(file.getSize() / 1024) + " KB");
        count++;
      } catch (e) {}
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("הושלמו " + count + " גדלי קבצים.");
}

function clearOCRErrors_LAB() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ניהול_מיילים');
  const data = sheet.getRange("V:V").getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().includes("❌")) {
      sheet.getRange(i + 1, 22).clearContent();
    }
  }
}

function syncStatusBeforeOCR_ARCHIVED() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ניהול_מיילים');
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const data = sheet.getRange(2, 1, lastRow - 1, 23).getValues();
  for (let i = 0; i < data.length; i++) {
    const fileId = data[i][0];
    const statusM = data[i][12];
    const ocrLink = data[i][21];
    if (!fileId) continue;
    if (!statusM && ocrLink) sheet.getRange(i + 2, 13).setValue("עבר OCR");
    if (!statusM && !ocrLink) sheet.getRange(i + 2, 13).setValue("ממתין ל-OCR");
  }
}
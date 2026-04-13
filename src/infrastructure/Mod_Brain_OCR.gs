/**
 * Module: Mod_Brain_OCR
 * Version: 1.2.0
 * Date: 13/04/2026
 * שינוי: עדכון עמודה M לאחר OCR + טיפול בשגיאות לעמודה T + קפיצה לעמודה M
 */

/**
 * פונקציה להרצת תהליך OCR על קבצים - תומכת בבחירה ידנית או בסריקה אוטומטית לפי סטטוס
 */
function runBatchOCR_Test() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ניהול_מיילים');
  if (!sheet) return;

  // 1. זיהוי טווח העבודה (שורות מסומנות מול כל הגיליון)
  const selection = sheet.getActiveRange();
  const selFirstRow = selection.getRow();
  const selLastRow = selection.getLastRow();
  const isSelectionMode = (selFirstRow > 1);

  const startRow = isSelectionMode ? selFirstRow : 2;
  const endRow = isSelectionMode ? selLastRow : sheet.getLastRow();

  // 2. איתור תיקיית היעד
  const folderName = 'Converted_OCR';
  const folders = DriveApp.getFoldersByName(folderName);
  if (!folders.hasNext()) {
    SpreadsheetApp.getUi().alert("שגיאה: תיקיית " + folderName + " לא נמצאה.");
    return;
  }
  const folderOCR = folders.next();

  let count = 0;

  // 3. לולאת עיבוד שורות
  for (let i = startRow; i <= endRow; i++) {
    try {
      // שליפת הנתונים הרלוונטיים לשורה
      const rowData = sheet.getRange(i, 1, 1, 23).getValues()[0];
      const fileId = rowData[0];     // עמודה A
      const statusM = rowData[12];   // עמודה M
      const ocrLinkV = rowData[21];  // עמודה V

      if (!fileId) continue;

      // לוגיקת סינון במצב סריקה כללית
      if (!isSelectionMode) {
        const needsOCR = (statusM === "ממתין ל-OCR");
        const noValidLink = (!ocrLinkV || ocrLinkV === "" || ocrLinkV.toString().includes("❌"));
        if (!needsOCR || !noValidLink) continue;
      }

      // ביצוע ה-OCR
      const file = DriveApp.getFileById(fileId);
      const resource = { 
        title: "OCR_" + file.getName(), 
        mimeType: file.getMimeType() 
      };
      
      const ocrFile = Drive.Files.copy(resource, fileId, { ocr: true, ocrLanguage: "he" });
      
      // העברת הקובץ החדש לתיקיית Converted_OCR
      DriveApp.getFileById(ocrFile.id).moveTo(folderOCR);

      // עדכון הגיליון בהצלחה
      sheet.getRange(i, 22).setValue(ocrFile.alternateLink); // עמודה V (22)
      sheet.getRange(i, 13).setValue("עבר OCR");            // עמודה M (13)
      sheet.getRange(i, 20).clearContent();                 // עמודה T (20) - ניקוי שגיאות
      sheet.getRange(i, 23).setValue(Math.round(file.getSize() / 1024) + " KB"); // עמודה W (23)
      
      count++;
      
      // השהיה למניעת עומס
      Utilities.sleep(500);

    } catch (e) {
      Logger.log("שגיאת OCR בשורה " + i + ": " + e.message);
      // כתיבת שגיאה לעמודה T (20) במקום לעמודה V
      sheet.getRange(i, 20).setValue("שגיאה: " + e.message);
    }
  }

  // 4. סיום וקפיצה לעמודה M (13)
  sheet.getRange(2, 13).activate();
  SpreadsheetApp.getUi().alert("סריקת OCR הסתיימה. נוספו " + count + " קבצים סרוקים לתיקיית Converted_OCR.");
}

/**
 * פונקציה למילוי גדלי קבצים חסרים - ללא שינוי
 */
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

/**
 * פונקציה לניקוי הודעות שגיאה מעמודה V - ללא שינוי
 */
function clearOCRErrors_LAB() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ניהול_מיילים');
  const data = sheet.getRange("V:V").getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().includes("❌")) {
      sheet.getRange(i + 1, 22).clearContent();
    }
  }
}
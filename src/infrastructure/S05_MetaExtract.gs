/**
 * Module: S05_MetaExtract
 * Version: 1.1.0
 * Date: 13/04/2026
 * תיעוד: חילוץ מטא-דאטה של קבצים מ-Drive ועדכון סטטוסים בגיליון "ניהול_מיילים".
 * שינוי: זיהוי שורות מסומנות + קפיצה לעמודה M
 */

/**
 * פונקציה 1: גרסת PROD - סריקה ועדכון מטא-דאטה
 */
function extractMetaData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const ui = SpreadsheetApp.getUi();
  const selection = sheet.getActiveRange();
  const selFirstRow = selection.getRow();
  const selLastRow = selection.getLastRow();
  
  // הגדרת טווח עבודה: אם סומנה שורה (שאינה כותרת), עבוד על הבחירה. אחרת, על כל הגיליון.
  const isSelectionMode = (selFirstRow > 1);
  const startRow = isSelectionMode ? selFirstRow : 2;
  const endRow = isSelectionMode ? selLastRow : sheet.getLastRow();
  
  let processedCount = 0;

  for (let i = startRow; i <= endRow; i++) {
    try {
      const rowData = sheet.getRange(i, 1, 1, 23).getValues()[0];
      const fileId = rowData[0];  // עמודה A
      if (!fileId) continue;

      let updatedU = rowData[20]; // עמודה U
      let updatedW = rowData[22]; // עמודה W
      
      // במצב "כל הגיליון" - דלג אם הנתונים כבר קיימים
      if (!isSelectionMode && updatedU && updatedW) continue;

      const file = DriveApp.getFileById(fileId);

      // שלב א: גודל קובץ
      const sizeKB = Math.round(file.getSize() / 1024) + " KB";
      sheet.getRange(i, 23).setValue(sizeKB);

      // שלב ב: סוג קובץ
      const mime = file.getMimeType().toLowerCase();
      let typeStr = "OTHER";
      if (mime.includes("pdf") || mime.includes("image")) typeStr = "PDF/IMG";
      else if (mime.includes("google-apps.document")) typeStr = "GDOC";
      else if (mime.includes("officedocument") || mime.includes("msword") || mime.includes("ms-excel")) typeStr = "OFFICE";
      
      sheet.getRange(i, 21).setValue(typeStr);

      // שלב ג: סטטוס חילוץ
      const linkOcr = sheet.getRange(i, 22).getValue(); // עמודה V
      let statusM = "לא ידוע";
      if (linkOcr) statusM = "עבר OCR";
      else if (typeStr === "GDOC") statusM = "טקסט זמין";
      else if (typeStr === "PDF/IMG") statusM = "ממתין ל-OCR";
      else if (typeStr === "OFFICE") statusM = "ממתין להמרה";
      
      sheet.getRange(i, 13).setValue(statusM);
      processedCount++;

    } catch (e) {
      Logger.log("שגיאה בשורה " + i + ": " + e.message);
      sheet.getRange(i, 21).setValue("שגיאת גישה");
    }
  }

  // קפיצה לעמודה M בסיום
  sheet.getRange(2, 13).activate();
  ui.alert("חילוץ מטא-דאטה הושלם.\nשורות שעובדו: " + processedCount);
}

/**
 * פונקציה 2: גרסת LAB - עם לוגים מפורטים ו-Toast
 */
function extractMetaData_LAB() {
  Logger.log("--- תחילת ריצת LAB: MetaExtract ---");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const selection = sheet.getActiveRange();
  const selFirstRow = selection.getRow();
  const selLastRow = selection.getLastRow();
  
  const isSelectionMode = (selFirstRow > 1);
  const startRow = isSelectionMode ? selFirstRow : 2;
  const endRow = isSelectionMode ? selLastRow : sheet.getLastRow();
  
  let processedCount = 0;

  for (let i = startRow; i <= endRow; i++) {
    try {
      const rowData = sheet.getRange(i, 1, 1, 23).getValues()[0];
      const fileId = rowData[0];
      if (!fileId) continue;

      let updatedU = rowData[20];
      let updatedW = rowData[22];
      
      if (!isSelectionMode && updatedU && updatedW) continue;

      const file = DriveApp.getFileById(fileId);

      // גודל
      const sizeKB = Math.round(file.getSize() / 1024) + " KB";
      sheet.getRange(i, 23).setValue(sizeKB);

      // סוג
      const mime = file.getMimeType().toLowerCase();
      let typeStr = "OTHER";
      if (mime.includes("pdf") || mime.includes("image")) typeStr = "PDF/IMG";
      else if (mime.includes("google-apps.document")) typeStr = "GDOC";
      else if (mime.includes("officedocument") || mime.includes("msword") || mime.includes("ms-excel")) typeStr = "OFFICE";
      sheet.getRange(i, 21).setValue(typeStr);

      // סטטוס
      const linkOcr = sheet.getRange(i, 22).getValue();
      let statusM = "לא ידוע";
      if (linkOcr) statusM = "עבר OCR";
      else if (typeStr === "GDOC") statusM = "טקסט זמין";
      else if (typeStr === "PDF/IMG") statusM = "ממתין ל-OCR";
      else if (typeStr === "OFFICE") statusM = "ממתין להמרה";
      
      sheet.getRange(i, 13).setValue(statusM);
      
      Logger.log("שורה " + i + ": ID=" + fileId + " | סוג=" + typeStr + " | סטטוס=" + statusM);
      processedCount++;

    } catch (e) {
      Logger.log("שגיאה בשורה " + i + ": " + e.message);
      sheet.getRange(i, 21).setValue("שגיאת גישה");
    }
  }
  
  // קפיצה לעמודה M בסיום
  sheet.getRange(2, 13).activate();
  Logger.log("--- סיום ריצת LAB: עובדו " + processedCount + " שורות ---");
  ss.toast("הושלמו " + processedCount + " שורות בגרסת LAB", "MetaExtract LAB", 5);
}

/**
 * פונקציה 3: ניקוי נתונים לצרכי בדיקות (LAB)
 * ללא שינוי
 */
function clearMetaData_LAB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // ניקוי עמודה M (13), U (21), W (23)
  sheet.getRange(2, 13, lastRow - 1).clearContent(); 
  sheet.getRange(2, 21, lastRow - 1).clearContent(); 
  sheet.getRange(2, 23, lastRow - 1).clearContent(); 

  ss.toast("עמודות המטא-דאטה נוקו בהצלחה", "איפוס LAB", 5);
}
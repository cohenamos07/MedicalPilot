/**
 * מודול OCR ועיבוד נתונים - גרסה מלאה
 */

/**
 * מנוע OCR אוטומטי - סורק את כל הטבלה וממיר רק מה שחסר
 */
function runBatchOCR_Test() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ניהול_מיילים');
  const data = sheet.getDataRange().getValues();
  
  // איתור תיקיית יעד
  const folderName = 'Converted_OCR';
  const folders = DriveApp.getFoldersByName(folderName);
  if (!folders.hasNext()) {
    SpreadsheetApp.getUi().alert("שגיאה: תיקיית " + folderName + " לא נמצאה.");
    return;
  }
  const folderOCR = folders.next();
  
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const fileId = data[i][0];   // עמודה A
    const ocrStatus = data[i][21]; // עמודה V
    
    // אם אין לינק OCR - בצע המרה
    if (fileId && (!ocrStatus || ocrStatus === "" || ocrStatus.includes("❌"))) {
      try {
        const file = DriveApp.getFileById(fileId);
        
        // הגדרת משאב המרה (תומך ב-PDF ובתמונות JPG/PNG)
        const resource = {
          title: "OCR_" + file.getName(),
          mimeType: file.getMimeType()
        };
        
        // פקודת ההמרה
        const ocrFile = Drive.Files.copy(resource, fileId, { ocr: true, ocrLanguage: "he" });
        
        // עדכון עמודות V ו-W
        sheet.getRange(i + 1, 22).setValue(ocrFile.alternateLink);
        sheet.getRange(i + 1, 23).setValue(Math.round(file.getSize() / 1024) + " KB");
        
        count++;
        Utilities.sleep(500); // הפסקה קצרה למניעת עומס
      } catch (e) {
        sheet.getRange(i + 1, 22).setValue("❌ שגיאה: " + e.message);
      }
    }
  }
  SpreadsheetApp.getUi().alert("סריקת OCR הסתיימה. " + count + " קבצים עובדו.");
}

/**
 * השלמת נתוני גודל קובץ בלבד (עמודה W)
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
 * ניקוי שגיאות OCR לצורך הרצה חוזרת
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

/**
 * MedicalPilot — S05_MetaExtract.gs
 * @version 2.1.0 | @updated 24/04/2026 | @service S05
 * תיקון: סטטוס M מבוסס על עמודה V בלבד
 */

function extractMetaData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const allData = sheet.getRange(2, 1, lastRow - 1, 23).getValues();
  const sizeTypeMap = {};
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const rowNum = i + 2;
    const fileId = allData[i][0];
    if (!fileId) continue;

    try {
      const file = DriveApp.getFileById(fileId);
      const mimeType = file.getMimeType();
      const sizeKB = Math.round(file.getSize() / 1024);
      const sizeFormatted = sizeKB + " KB";

      // שלב א — סיווג סוג קובץ
      let systemType = "לא נתמך";
      const mime = mimeType.toLowerCase();

      if (mime === "application/pdf") {
        systemType = "SYSTEM_PDF";
      } else if (mime === "image/jpeg" || mime === "image/png" || mime.includes("image/")) {
        systemType = "SYSTEM_IMG";
      } else if (mime === "application/vnd.google-apps.document") {
        systemType = "SYSTEM_GDOC";
      } else if (
        mime === "application/vnd.google-apps.spreadsheet" ||
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mime === "application/vnd.ms-excel"
      ) {
        systemType = "SYSTEM_SHEET";
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/msword"
      ) {
        systemType = "SYSTEM_DOCX";
      } else if (mime === "text/plain" || mime === "text/csv" || mime.includes("text/")) {
        systemType = "SYSTEM_TXT";
      }

      // שלב ב — סטטוס M — מבוסס על עמודה V בלבד
      const linkV = allData[i][21]; // עמודה V
      let statusM = "";

      if (linkV && linkV.toString().trim() !== "") {
        statusM = "הומר ל-TXT";           // יש לינק → כבר הומר
      } else if (systemType === "לא נתמך") {
        statusM = "לא נתמך";              // סוג לא נתמך
      } else {
        statusM = "נדרש המרה";            // אין לינק → ממתין
      }

      // שלב ג — התראות עמודה R
      let alertR = "";
      if (sizeKB < 10) {
        alertR = "חשוד כלוגו/ריק";
      } else {
        const dupKey = sizeKB + "_" + systemType;
        if (sizeTypeMap[dupKey] !== undefined) {
          alertR = "חשוד ככפול — שורה " + sizeTypeMap[dupKey];
        } else {
          sizeTypeMap[dupKey] = rowNum;
        }
      }

      // כתיבה לגליון
      sheet.getRange(rowNum, 23).setValue(sizeFormatted); // W
      sheet.getRange(rowNum, 21).setValue(systemType);    // U
      sheet.getRange(rowNum, 13).setValue(statusM);       // M
      sheet.getRange(rowNum, 18).setValue(alertR);        // R
      sheet.getRange(rowNum, 20).clearContent();          // T

      processed++;

    } catch (e) {
      sheet.getRange(rowNum, 20).setValue("שגיאת גישה: " + e.message.substring(0, 80));
      errors++;
    }
  }

  sheet.getRange(2, 13).activate();
  ss.toast(
    "הושלמו: " + processed + " | שגיאות: " + errors,
    "S05 MetaExtract v2.1", 5
  );
}

function extractMetaData_LAB() {
  Logger.log("--- תחילת ריצת LAB: MetaExtract v2.1 ---");
  extractMetaData();
  Logger.log("--- סיום ---");
}

function clearMetaData_LAB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 13, lastRow - 1).clearContent(); // M
  sheet.getRange(2, 18, lastRow - 1).clearContent(); // R
  sheet.getRange(2, 21, lastRow - 1).clearContent(); // U
  sheet.getRange(2, 23, lastRow - 1).clearContent(); // W
  ss.toast("עמודות המטא-דאטה נוקו", "איפוס LAB", 5);
}
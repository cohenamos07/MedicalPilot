/** 
 * MedicalPilot — S05_MetaExtract.gs
 * @version 2.2.0 | @updated 26/04/2026 | @service S05
 * תיקון: עמודות מעודכנות לפי COLUMN_MAP v1.0
 * O=15 סוג קובץ | P=16 גודל | R=18 כפולים | S=19 שגיאה | X=24 לינק TXT
 */

function extractMetaData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const allData = sheet.getRange(2, 1, lastRow - 1, 26).getValues();
  const sizeTypeMap = {};
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const rowNum = i + 2;
    const fileId = allData[i][0]; // A = עמודה 1
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

      // שלב ב — סטטוס M — לפי עמודה X (24)
      const linkX = allData[i][23]; // X = עמודה 24
      let statusM = "";

      if (linkX && linkX.toString().trim() !== "") {
        statusM = "הומר ל-TXT";
      } else if (systemType === "לא נתמך") {
        statusM = "לא נתמך";
      } else {
        statusM = "ממתין להמרה ל-TXT";
      }

      // שלב ג — כפולים ולוגו לעמודה R (18)
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

      // כתיבה לגליון — לפי COLUMN_MAP
      sheet.getRange(rowNum, 15).setValue(systemType);   // O = File_Type
      sheet.getRange(rowNum, 16).setValue(sizeFormatted);// P = File_Size
      sheet.getRange(rowNum, 13).setValue(statusM);      // M = Pipeline_Status
      sheet.getRange(rowNum, 18).setValue(alertR);       // R = Duplicate_Flag
      sheet.getRange(rowNum, 19).clearContent();         // S = Error_Code
      sheet.getRange(rowNum, 20).clearContent();         // T = Error_Detail

      processed++;

    } catch (e) {
      sheet.getRange(rowNum, 19).setValue("ACCESS");
      sheet.getRange(rowNum, 20).setValue("שגיאת גישה: " + e.message.substring(0, 80));
      errors++;
    }
  }

  sheet.getRange(2, 13).activate();
  ss.toast(
    "הושלמו: " + processed + " | שגיאות: " + errors,
    "S05 MetaExtract v2.2", 5
  );
}

function extractMetaData_LAB() {
  Logger.log("--- תחילת ריצת LAB: MetaExtract v2.2 ---");
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
  sheet.getRange(2, 15, lastRow - 1).clearContent(); // O
  sheet.getRange(2, 16, lastRow - 1).clearContent(); // P
  sheet.getRange(2, 18, lastRow - 1).clearContent(); // R
  sheet.getRange(2, 19, lastRow - 1).clearContent(); // S
  sheet.getRange(2, 20, lastRow - 1).clearContent(); // T
  ss.toast("עמודות המטא-דאטה נוקו", "איפוס LAB", 5);
}

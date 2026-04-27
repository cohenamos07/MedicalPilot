/**
 * MedicalPilot — S05_MetaExtract.gs
 * @version 2.3.0 | @updated 26/04/2026 09:00 | @service S05
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S05_MetaExtract.gs
 * תיקון: דילוג על שורות שכבר הומרו ויש להן לינק TXT
 * עמודות: O=15 סוג | P=16 גודל | R=18 כפולים | S=19 שגיאה | T=20 פירוט | X=24 לינק TXT
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
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const rowNum = i + 2;
    const fileId = allData[i][0];
    if (!fileId) continue;

    try {
      const currentM = (allData[i][12] || "").toString().trim();
      const linkX    = (allData[i][23] || "").toString().trim();

      if (currentM === "הומר ל-TXT" && linkX !== "") {
        skipped++;
        continue;
      }

      const file     = DriveApp.getFileById(fileId);
      const mimeType = file.getMimeType();
      const sizeKB   = Math.round(file.getSize() / 1024);
      const sizeFormatted = sizeKB + " KB";

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

      let statusM = "";
      if (linkX !== "") {
        statusM = "הומר ל-TXT";
      } else if (systemType === "לא נתמך") {
        statusM = "לא נתמך";
      } else {
        statusM = "ממתין להמרה ל-TXT";
      }

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

      sheet.getRange(rowNum, 15).setValue(systemType);
      sheet.getRange(rowNum, 16).setValue(sizeFormatted);
      sheet.getRange(rowNum, 13).setValue(statusM);
      sheet.getRange(rowNum, 18).setValue(alertR);
      sheet.getRange(rowNum, 19).clearContent();
      sheet.getRange(rowNum, 20).clearContent();

      processed++;

    } catch (e) {
      sheet.getRange(rowNum, 19).setValue("ACCESS");
      sheet.getRange(rowNum, 20).setValue("שגיאת גישה: " + e.message.substring(0, 80));
      errors++;
    }
  }

  sheet.getRange(2, 13).activate();
  ss.toast(
    "עובדו: " + processed + " | דולגו: " + skipped + " | שגיאות: " + errors,
    "S05 MetaExtract v2.3", 5
  );
}

function extractMetaData_LAB() {
  Logger.log("--- תחילת ריצת LAB: MetaExtract v2.3 ---");
  extractMetaData();
  Logger.log("--- סיום ---");
}

function clearMetaData_LAB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 13, lastRow - 1).clearContent();
  sheet.getRange(2, 15, lastRow - 1).clearContent();
  sheet.getRange(2, 16, lastRow - 1).clearContent();
  sheet.getRange(2, 18, lastRow - 1).clearContent();
  sheet.getRange(2, 19, lastRow - 1).clearContent();
  sheet.getRange(2, 20, lastRow - 1).clearContent();
  ss.toast("עמודות המטא-דאטה נוקו", "איפוס LAB", 5);
}

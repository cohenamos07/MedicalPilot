/**
 * MedicalPilot — S05_MetaExtract.gs
 * @version 2.4.1 | @updated 01/07/2026 21:25 | @service S05
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S05_MetaExtract.gs
 * @description חילוץ מטא-דאטה מקבצי Drive — סוג, גודל, זיהוי כפולים וסטטוס pipeline.
 * @impacts כותב לעמודות M(13), O(15), P(16), R(18), S(19), T(20).
 *          דולג על שורות שכבר הומרו ויש להן TXT_URL (עמודה X).
 *          תלויות: Drive API, גליון ניהול_מיילים, COLUMN_MAP.gs.
 *          מופעל מהתפריט — אינו חלק מזרימת עיבוד אוטומטי.
 * @callers Menu_PROD.gs, Menu_LAB.gs
 * @functions extractMetaData, extractMetaData_LAB, clearMetaData_LAB
 * @changes [v2.4.1] Task 91 fix — תיקון Note: עכשיו מכיל File_ID של שורת המטרה (לא השורה הנוכחית).
 *          [v2.4.0] Task 91 — הוספת setNote(File_ID) לתא R בכל כתיבת Duplicate_Flag
 *                   לשמירת רפרנס יציב שאינו תלוי במספר שורה.
 *          [v2.3.2] תיקון קריטי — לולאה התחילה משורה 2 (כותרת ישנה), עכשיו
 *                   משתמשת ב-SHEET_CONFIG.FIRST_DATA_ROW (5) — מנע כתיבה לשורות מוגנות 1-4.
 *          [v2.3.1] הוספת @impacts וכותרת מלאה לפי סטנדרט.
 *          [v2.3.0] דילוג על שורות שכבר הומרו ויש להן לינק TXT.
 */
function extractMetaData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstRow) return;

  const allData = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, 26).getValues();
  const sizeTypeMap = {};
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const rowNum = i + firstRow;
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
      let alertRTargetFileId = ""; // [v2.4.1] File_ID של שורת המטרה לNote
      if (sizeKB < 10) {
        alertR = "חשוד כלוגו/ריק";
      } else {
        const dupKey = sizeKB + "_" + systemType;
        if (sizeTypeMap[dupKey] !== undefined) {
          alertR = "חשוד ככפול — שורה " + sizeTypeMap[dupKey];
          // [v2.4.1] Task 91 fix — Note מכיל File_ID של שורת המטרה, לא השורה הנוכחית
          const targetIdx = sizeTypeMap[dupKey] - firstRow;
          alertRTargetFileId = String(allData[targetIdx] && allData[targetIdx][0] ? allData[targetIdx][0] : "");
        } else {
          sizeTypeMap[dupKey] = rowNum;
        }
      }

      sheet.getRange(rowNum, 15).setValue(systemType);
      sheet.getRange(rowNum, 16).setValue(sizeFormatted);
      sheet.getRange(rowNum, 13).setValue(statusM);
      sheet.getRange(rowNum, 18).setValue(alertR);
      if (alertR && alertRTargetFileId) { sheet.getRange(rowNum, 18).setNote(alertRTargetFileId); } // [v2.4.1] Task 91 fix
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
    "S05 MetaExtract v2.4", 5
  );
}

function extractMetaData_LAB() {
  Logger.log("--- תחילת ריצת LAB: MetaExtract v2.4 ---");
  extractMetaData();
  Logger.log("--- סיום ---");
}

function clearMetaData_LAB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;
  const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstRow) return;
  sheet.getRange(firstRow, 13, lastRow - firstRow + 1).clearContent();
  sheet.getRange(firstRow, 15, lastRow - firstRow + 1).clearContent();
  sheet.getRange(firstRow, 16, lastRow - firstRow + 1).clearContent();
  sheet.getRange(firstRow, 18, lastRow - firstRow + 1).clearContent();
  sheet.getRange(firstRow, 19, lastRow - firstRow + 1).clearContent();
  sheet.getRange(firstRow, 20, lastRow - firstRow + 1).clearContent();
  ss.toast("עמודות המטא-דאטה נוקו", "איפוס LAB", 5);
}
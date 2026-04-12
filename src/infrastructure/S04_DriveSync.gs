/**
 * Module: S04_DriveSync
 * Version: 1.1.0
 * Date: 12/04/2026
 * Role: System Data Ingestion
 * Description: סנכרון קבצים מתיקיית Google Drive ייעודית לגליון ניהול המיילים.
 * שינוי: הוספת ניהול תאריך סריקה אחרונה (Incremental Sync) למניעת סריקה חוזרת של קבצים ישנים.
 */

/**
 * שולפת את תאריך ההרצה האחרונה ממאגר המאפיינים של הסקריפט.
 * @return {Date|null} אובייקט תאריך או null אם לא הוגדר מעולם.
 */
function getLastRunDate() {
  try {
    const lastRunStr = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
    return lastRunStr ? new Date(lastRunStr) : null;
  } catch (e) {
    Logger.log("Error in getLastRunDate: " + e.message);
    return null;
  }
}

/**
 * שומרת את זמן ההרצה הנוכחי בפורמט ISO.
 */
function saveLastRunDate() {
  try {
    const nowStr = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty("DRIVE_SYNC_LAST_RUN", nowStr);
  } catch (e) {
    Logger.log("Error in saveLastRunDate: " + e.message);
  }
}

/**
 * בודקת האם קובץ כבר קיים בגליון לפי שם הקובץ בעמודה E.
 * @param {string} fileName שם הקובץ לבדיקה.
 * @param {string} mimeType סוג הקובץ.
 * @param {number} fileSize גודל הקובץ בבתים.
 * @return {boolean} true אם הקובץ כפול, false אם חדש.
 */
function preventDuplicates(fileName, mimeType, fileSize) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    const fileNameColumnIndex = 4; // עמודה E

    for (let i = 1; i < data.length; i++) {
      if (data[i][fileNameColumnIndex] === fileName) {
        return true;
      }
    }
    return false;
  } catch (e) {
    Logger.log("Error in preventDuplicates: " + e.message);
    return false;
  }
}

/**
 * סריקת תיקיית Drive והוספת קבצים חדשים (Incremental Sync).
 * גרסת ייצור - PROD.
 */
function syncDriveFiles() {
  const folderId = "1ZT-C06MdkuVGSZrpAQdp7kzXD68d2VqN";
  const sheetName = "ניהול_מיילים";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה: הגליון '" + sheetName + "' לא נמצא.");
    return;
  }

  const lastRun = getLastRunDate();
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  let addedCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const lastUpdatedDate = file.getLastUpdated();

    // בדיקה: האם הקובץ השתנה מאז הריצה האחרונה?
    if (lastRun && lastUpdatedDate <= lastRun) {
      continue;
    }

    const name = file.getName();
    const mime = file.getMimeType();
    const size = file.getSize();
    const lastUpdatedStr = Utilities.formatDate(lastUpdatedDate, "GMT+3", "dd/MM/yyyy");
    const id = file.getId();
    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy");

    if (!preventDuplicates(name, mime, size)) {
      sheet.appendRow([
        id, now, "Drive_Manual", "N/A", name, "עמוס ידני", lastUpdatedStr, name
      ]);
      addedCount++;
    }
  }

  const currentRunTime = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");
  saveLastRunDate();
  SpreadsheetApp.getUi().alert("הסנכרון הושלם.\nנוספו " + addedCount + " קבצים חדשים.\nסריקה הבאה תתחיל מ-" + currentRunTime);
}

/**
 * סריקת תיקיית Drive בגרסת מעבדה עם לוגים מפורטים (Incremental Sync).
 * גרסת בדיקה - LAB.
 */
function syncDriveFiles_LAB() {
  Logger.log("--- התחלת ריצת סנכרון LAB ---");
  const folderId = "1ZT-C06MdkuVGSZrpAQdp7kzXD68d2VqN";
  const sheetName = "ניהול_מיילים";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  const lastRun = getLastRunDate();
  Logger.log("תאריך סריקה אחרונה במערכת: " + (lastRun ? lastRun.toISOString() : "מעולם לא הורץ"));

  if (!sheet) {
    Logger.log("שגיאה קריטית: הגליון לא נמצא");
    return;
  }

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  let addedCount = 0;
  let skippedCount = 0;
  let oldFilesSkipped = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    const lastUpdatedDate = file.getLastUpdated();

    if (lastRun && lastUpdatedDate <= lastRun) {
      Logger.log("דולג — קובץ ישן (לא השתנה): " + name);
      oldFilesSkipped++;
      continue;
    }

    const mime = file.getMimeType();
    const size = file.getSize();
    const lastUpdatedStr = Utilities.formatDate(lastUpdatedDate, "GMT+3", "dd/MM/yyyy");
    const id = file.getId();
    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy");

    Logger.log("בודק קובץ חדש/מעודכן: " + name);

    if (!preventDuplicates(name, mime, size)) {
      sheet.appendRow([
        id, now, "Drive_Manual", "N/A", name, "עמוס ידני", lastUpdatedStr, name
      ]);
      addedCount++;
      Logger.log("סטטוס: חדש -> נוסף לגליון");
    } else {
      skippedCount++;
      Logger.log("סטטוס: כפול (שם הקובץ כבר קיים בגליון) -> דולג");
    }
  }

  saveLastRunDate();
  Logger.log("--- סיום סנכרון LAB ---");
  Logger.log("סיכום: " + addedCount + " נוספו, " + skippedCount + " כפולים דולגו, " + oldFilesSkipped + " ישנים דולגו.");
  
  ss.toast("סנכרון LAB הסתיים. נוספו: " + addedCount + ", ישנים שדולגו: " + oldFilesSkipped, "סנכרון Drive");
}
